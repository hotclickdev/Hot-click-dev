package com.hotclick.agente.campana;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.campana.CampanaRepositorio.Campana;
import com.hotclick.agente.campana.ConsentimientoRepositorio.Destino;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Estado;
import com.hotclick.agente.campana.PlantillaCampanaRepositorio.Fila;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.cupo.AgenteBajaService;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.tenant.TenantInfoBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Campañas de WhatsApp a clientes que aceptaron recibirlas (AG-36). Ciclo: BORRADOR (con segmento, plantilla y
 * parámetros) → {@link #estimar} (cuántos se alcanzan y cuánto cobra Meta) → {@link #lanzar} con el costo confirmado →
 * EN_CURSO (lo procesa {@link CampanaEnvioService} en lotes) → COMPLETADA. Todo se filtra por la empresa del
 * llamador: una campaña o plantilla de otro negocio responde como inexistente.
 */
@Service
public class CampanaService {

    private static final Logger log = LoggerFactory.getLogger(CampanaService.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    static final int MAX_PARAMETRO = 200;
    public static final String TOKEN_NOMBRE = "{nombre}";

    /**
     * Qué alcanzaría la campaña hoy. {@code permitidos} ya descuenta bajas, tope por contacto y tope mensual del plan.
     */
    public record Estimacion(int conConsentimiento, int excluidosPorBaja, int excluidosPorTopeContacto,
                             int permitidos, BigDecimal costoEstimadoUsd, int topeMensual, int restanteMes) { }

    private final CampanaRepositorio repo;
    private final PlantillaCampanaService plantillas;
    private final SegmentoService segmentos;
    private final AgenteBajaService bajas;
    private final CanalCuentaService cuentas;
    private final EmpresaRepository empresas;
    private final TenantInfoBuilder planes;
    private final CampanaConfig config;

    public CampanaService(CampanaRepositorio repo, PlantillaCampanaService plantillas, SegmentoService segmentos,
                          AgenteBajaService bajas, CanalCuentaService cuentas, EmpresaRepository empresas,
                          TenantInfoBuilder planes, CampanaConfig config) {
        this.repo = repo;
        this.plantillas = plantillas;
        this.segmentos = segmentos;
        this.bajas = bajas;
        this.cuentas = cuentas;
        this.empresas = empresas;
        this.planes = planes;
        this.config = config;
    }

    public Campana crear(Long empresaId, Long usuarioId, String nombre, long plantillaId, Segmento segmento,
                         List<String> parametros, Instant programadaPara) {
        String n = nombre == null ? "" : nombre.strip();
        if (n.isEmpty() || n.length() > 120) throw new IllegalArgumentException("El nombre es obligatorio (hasta 120)");
        Fila plantilla = plantillas.obtener(empresaId, plantillaId);
        List<String> ps = parametros == null ? List.of() : parametros;
        int variables = PlantillaCampanaService.contarVariables(plantilla.cuerpo());
        if (ps.size() != variables) throw new IllegalArgumentException("La plantilla pide " + variables + " valor(es)");
        for (String p : ps) {
            if (p == null || p.isBlank() || p.length() > MAX_PARAMETRO)
                throw new IllegalArgumentException("Cada valor es obligatorio (hasta " + MAX_PARAMETRO + " caracteres)");
        }
        if (programadaPara != null && programadaPara.isBefore(config.ahora().minusSeconds(60)))
            throw new IllegalArgumentException("La fecha programada ya pasó");
        long id = repo.insertar(empresaId, plantillaId, n, segmento, escribir(ps), programadaPara, usuarioId, config.ahora());
        return obtener(empresaId, id);
    }

    public Campana obtener(Long empresaId, long id) {
        return repo.obtener(empresaId, id).orElseThrow(() -> new RecursoNoEncontradoException("Campaña no encontrada"));
    }

    public List<Campana> listar(Long empresaId) {
        return repo.listar(empresaId, 50);
    }

    public CampanaRepositorio.Metricas metricas(Long empresaId, long id) {
        obtener(empresaId, id);
        return repo.metricas(empresaId, id);
    }

    public Estimacion estimar(Long empresaId, long id) {
        return calcular(empresaId, obtener(empresaId, id)).estimacion();
    }

    /** Lo que se calculó: los destinos que sí se alcanzan y la estimación. */
    private record Calculo(List<Destino> alcanzados, Estimacion estimacion) { }

    private Calculo calcular(Long empresaId, Campana c) {
        Plan plan = planDelNegocio(empresaId);
        List<Destino> destinos = segmentos.resolver(empresaId, c.segmento());
        List<String> hashes = destinos.stream().map(Destino::hash).toList();
        Set<String> deBaja = bajas.hashesDeBaja(hashes);
        Map<String, Integer> semana = repo.enviadosDesde(empresaId, hashes, config.haceUnaSemana());
        int tope = config.topeMensual(plan.getNombre());
        int restante = Math.max(0, tope - repo.enviadosDelNegocioDesde(empresaId, config.inicioDeMes()));

        List<Destino> libres = new ArrayList<>();
        int porBaja = 0;
        int porTope = 0;
        for (Destino d : destinos) {
            if (deBaja.contains(d.hash())) porBaja++;
            else if (semana.getOrDefault(d.hash(), 0) >= config.topeContactoSemana()) porTope++;
            else libres.add(d);
        }
        List<Destino> alcanzados = libres.size() > restante ? libres.subList(0, restante) : libres;
        Estimacion e = new Estimacion(destinos.size(), porBaja, porTope, alcanzados.size(),
            config.costoEstimado(alcanzados.size()), tope, restante);
        return new Calculo(alcanzados, e);
    }

    /**
     * Lanza la campaña. {@code costoConfirmadoUsd} debe ser la estimación vigente que la persona vio: si cambió (otro
     * contacto se dio de baja, otro envío gastó el tope) se rechaza y se vuelve a estimar.
     */
    public Campana lanzar(Long empresaId, long id, BigDecimal costoConfirmadoUsd) {
        Campana c = obtener(empresaId, id);
        if (!CampanaRepositorio.BORRADOR.equals(c.estado())) throw new IllegalStateException("La campaña ya no es un borrador");
        Fila plantilla = plantillas.obtener(empresaId, c.plantillaId());
        if (plantilla.estado() != Estado.APROBADA)
            throw new IllegalStateException("La plantilla todavía no está aprobada por Meta");
        cuentas.activaDe(empresaId, MensajeEntrante.Canal.WHATSAPP)
            .orElseThrow(() -> new IllegalStateException("Conectá primero tu WhatsApp Business"));
        Calculo calculo = calcular(empresaId, c);
        Estimacion e = calculo.estimacion();
        if (e.permitidos() == 0) throw new IllegalStateException("No hay contactos a quienes enviar con este segmento");
        if (costoConfirmadoUsd == null || costoConfirmadoUsd.compareTo(e.costoEstimadoUsd()) != 0)
            throw new IllegalStateException("El costo estimado cambió: revisalo y confirmá de nuevo");
        Instant ahora = config.ahora();
        if (!repo.lanzar(empresaId, id, e.permitidos(), e.costoEstimadoUsd(), ahora))
            throw new IllegalStateException("La campaña ya no es un borrador");
        repo.crearEnvios(id, empresaId, calculo.alcanzados().stream().map(Destino::hash).toList(), ahora);
        log.info("[campana] campaña {} lanzada empresa={} destinatarios={}", id, empresaId, e.permitidos());
        return obtener(empresaId, id);
    }

    public Campana cancelar(Long empresaId, long id) {
        obtener(empresaId, id);
        if (!repo.cancelar(empresaId, id, config.ahora()))
            throw new IllegalStateException("La campaña ya terminó o fue cancelada");
        return obtener(empresaId, id);
    }

    Plan planDelNegocio(Long empresaId) {
        Empresa empresa = empresas.findByIdWithPlan(empresaId).orElse(null);
        Plan plan = empresa == null ? null : empresa.getPlan();
        if (plan == null || !planes.planTiene(plan, "agente"))
            throw new IllegalStateException("Tu plan no incluye el bot de ventas ni las campañas");
        return plan;
    }

    static List<String> leerParametros(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return JSON.readValue(json, JSON.getTypeFactory().constructCollectionType(List.class, String.class));
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private static String escribir(List<String> ps) {
        try {
            return JSON.writeValueAsString(ps);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Valores inválidos");
        }
    }
}
