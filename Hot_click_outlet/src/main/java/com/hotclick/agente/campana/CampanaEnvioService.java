package com.hotclick.agente.campana;

import com.hotclick.agente.campana.CampanaRepositorio.Campana;
import com.hotclick.agente.campana.CampanaRepositorio.Envio;
import com.hotclick.agente.campana.ConsentimientoRepositorio.Destino;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Fila;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.agente.cupo.AgenteBajaService;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.TotpSecretEncryptionService;
import com.hotclick.service.tenant.TenantInfoBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Procesa en lotes los envíos PENDIENTES de las campañas EN_CURSO. Sin transacción abierta (hay E/S con Meta): cada
 * cambio es una sentencia atómica del repositorio. Antes de CADA envío se revalida, porque entre el lanzamiento y el
 * envío la persona pudo escribir STOP o retirar el consentimiento: consentimiento activo, lista de bajas, tope por
 * contacto en 7 días y tope mensual del plan. Un fallo transitorio de Meta deja el envío PENDIENTE (hasta
 * {@code max-intentos}); un rechazo (4xx) lo marca FALLIDO con el código de Meta. Si Meta cae, se corta el lote.
 * Nunca registra contacto, texto ni token.
 */
@Service
public class CampanaEnvioService {

    private static final Logger log = LoggerFactory.getLogger(CampanaEnvioService.class);
    static final int CAMPANAS_POR_PASADA = 5;

    private final CampanaRepositorio repo;
    private final ConsentimientoRepositorio consentimientos;
    private final PlantillaCampanaService plantillas;
    private final AgenteBajaService bajas;
    private final CanalCuentaService cuentas;
    private final CanalMensajeria canal;
    private final TotpSecretEncryptionService cifrado;
    private final EmpresaRepository empresas;
    private final TenantInfoBuilder planes;
    private final CampanaConfig config;

    public CampanaEnvioService(CampanaRepositorio repo, ConsentimientoRepositorio consentimientos,
                               PlantillaCampanaService plantillas, AgenteBajaService bajas, CanalCuentaService cuentas,
                               CanalMensajeria canal, TotpSecretEncryptionService cifrado, EmpresaRepository empresas,
                               TenantInfoBuilder planes, CampanaConfig config) {
        this.repo = repo;
        this.consentimientos = consentimientos;
        this.plantillas = plantillas;
        this.bajas = bajas;
        this.cuentas = cuentas;
        this.canal = canal;
        this.cifrado = cifrado;
        this.empresas = empresas;
        this.planes = planes;
        this.config = config;
    }

    /** Una pasada del scheduler. @return mensajes enviados */
    public int procesarLote() {
        int enviados = 0;
        for (Campana c : repo.listosParaEnviar(config.ahora(), CAMPANAS_POR_PASADA)) {
            try {
                enviados += procesar(c);
            } catch (RuntimeException e) {
                log.warn("[campana-envio] campaña {} no se pudo procesar: {}", c.id(), e.getClass().getSimpleName());
            }
        }
        return enviados;
    }

    private int procesar(Campana c) {
        Long empresaId = c.empresaId();
        Fila plantilla = plantillas.obtener(empresaId, c.plantillaId());
        if (plantilla.estado() == Estado.RECHAZADA) {
            repo.cancelar(empresaId, c.id(), config.ahora()); // los pendientes pasan a OMITIDO
            return 0;
        }
        Optional<CanalCuenta> cuenta = cuentas.activaDe(empresaId, MensajeEntrante.Canal.WHATSAPP);
        Plan plan = planDe(empresaId);
        if (plantilla.estado() != Estado.APROBADA || cuenta.isEmpty() || plan == null) return 0; // reintenta en la próxima pasada

        List<Envio> pendientes = repo.pendientes(c.id(), config.lote());
        if (pendientes.isEmpty()) {
            repo.completarSiTermino(c.id(), config.ahora());
            return 0;
        }
        List<String> hashes = pendientes.stream().map(Envio::hash).toList();
        Map<String, Destino> destinos = new HashMap<>();
        for (Destino d : consentimientos.activosEntre(empresaId, hashes)) destinos.put(d.hash(), d);
        Set<String> deBaja = bajas.hashesDeBaja(hashes);
        Map<String, Integer> semana = new HashMap<>(repo.enviadosDesde(empresaId, hashes, config.haceUnaSemana()));
        int restante = config.topeMensual(plan.getNombre()) - repo.enviadosDelNegocioDesde(empresaId, config.inicioDeMes());
        List<String> parametros = CampanaService.leerParametros(c.parametros());

        int enviados = 0;
        for (Envio e : pendientes) {
            Destino d = destinos.get(e.hash());
            if (d == null || d.contactoCifrado() == null) {
                repo.marcarOmitido(e.id(), "SIN_CONSENTIMIENTO");
            } else if (deBaja.contains(e.hash())) {
                repo.marcarOmitido(e.id(), "BAJA");
            } else if (semana.getOrDefault(e.hash(), 0) >= config.topeContactoSemana()) {
                repo.marcarOmitido(e.id(), "TOPE_CONTACTO");
            } else if (restante <= 0) {
                repo.marcarOmitido(e.id(), "TOPE_MENSUAL");
            } else if (repo.reclamar(e.id(), e.intentos())) {
                Resultado r = enviar(cuenta.get(), plantilla, parametros, d, e);
                if (r == Resultado.ENVIADO) {
                    enviados++;
                    restante--;
                    semana.merge(e.hash(), 1, Integer::sum);
                } else if (r == Resultado.META_CAIDA) {
                    break; // no insistir con el resto del lote: vuelve en la próxima pasada
                }
            }
        }
        if (pendientes.size() < config.lote()) repo.completarSiTermino(c.id(), config.ahora());
        log.info("[campana-envio] campaña {} empresa={} enviados={}", c.id(), empresaId, enviados);
        return enviados;
    }

    private enum Resultado { ENVIADO, FALLIDO, REINTENTAR, META_CAIDA }

    private Resultado enviar(CanalCuenta cuenta, Fila plantilla, List<String> parametros, Destino d, Envio e) {
        try {
            String contacto = cifrado.decryptContactoCampana(d.contactoCifrado());
            String wamid = canal.enviarPlantillaMarketing(cuenta, contacto, plantilla.nombre(), plantilla.idioma(),
                resolver(parametros, d.nombre()));
            repo.marcarEnviado(e.id(), wamid, config.ahora());
            return Resultado.ENVIADO;
        } catch (MetaRechazoException ex) {
            repo.marcarFallido(e.id(), "META_" + ex.codigoMeta());
            return Resultado.FALLIDO;
        } catch (IntegracionExternaException ex) {
            return transitorio(e, "META_CAIDA", Resultado.META_CAIDA);
        } catch (RuntimeException ex) {
            // Sin mensaje: puede traer el destinatario.
            log.warn("[campana-envio] envío {} falló: {}", e.id(), ex.getClass().getSimpleName());
            return transitorio(e, "ERROR_ENVIO", Resultado.REINTENTAR);
        }
    }

    /** {@code reclamar} ya sumó el intento: al llegar al máximo el envío se da por fallido. */
    private Resultado transitorio(Envio e, String motivo, Resultado siSigue) {
        if (e.intentos() + 1 >= config.maxIntentos()) {
            repo.marcarFallido(e.id(), motivo);
            return Resultado.FALLIDO;
        }
        return siSigue;
    }

    /** {nombre} → primer nombre del contacto (o «cliente»); el resto va tal cual. */
    static List<String> resolver(List<String> parametros, String nombre) {
        String primero = nombre == null || nombre.isBlank() ? "cliente" : nombre.strip().split("\\s+")[0];
        List<String> out = new ArrayList<>();
        for (String p : parametros) out.add(p.replace(CampanaService.TOKEN_NOMBRE, primero));
        return out;
    }

    private Plan planDe(Long empresaId) {
        Empresa empresa = empresas.findByIdWithPlan(empresaId).orElse(null);
        Plan plan = empresa == null ? null : empresa.getPlan();
        return plan != null && planes.planTiene(plan, "agente") ? plan : null;
    }

    /** Reloj para pruebas. */
    Instant ahora() {
        return config.ahora();
    }
}
