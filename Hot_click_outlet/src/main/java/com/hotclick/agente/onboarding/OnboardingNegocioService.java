package com.hotclick.agente.onboarding;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaRepository;
import com.hotclick.agente.canal.EstadoCanal;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.onboarding.OnboardingRepositorio.EmpresaNueva;
import com.hotclick.agente.onboarding.OnboardingRepositorio.LeadNegocio;
import com.hotclick.agente.pago.AvisoUnicoRepository;
import com.hotclick.agente.pago.EnvioConversacion;
import com.hotclick.agente.seguimiento.ListaBajasAgente;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * AG-40: acompañamiento de un negocio que dejó su interés al bot de HotClick ({@code registrar_lead_negocio}) y
 * después se registró. El vínculo es el CONTACTO: el número de WhatsApp de la conversación del lead contra el
 * WhatsApp o teléfono de la empresa registrada (últimos 8 dígitos, números de Costa Rica), y la empresa debe haberse
 * registrado después de crearse el lead. Al registrarse el lead pasa a CONVERTIDO y el bot manda 3 pasos, uno por
 * mensaje con botón al panel: completar el perfil, subir el primer producto y conectar su canal.
 *
 * <p>Reglas: solo dentro de la ventana de 24 h (fuera de ella el paso espera a que la persona vuelva a escribir),
 * nunca a un contacto de baja ni a una conversación atendida por una persona, un paso a la vez separado por
 * {@code intervalo}, cada paso una sola vez por lead (guarda {@link AvisoUnicoRepository}). Lecturas por lote. Sin
 * datos personales en logs: solo ids internos. Limitación conocida: el paso se manda por tiempo, no al detectar que
 * el anterior ya se completó.
 */
@Service
public class OnboardingNegocioService {

    private static final Logger log = LoggerFactory.getLogger(OnboardingNegocioService.class);
    static final int LOTE = 200;
    static final int LOTE_EMPRESAS = 1000;
    static final int DIAS_SEGUIMIENTO = 30;
    static final int DIGITOS_COMPARAR = 8;

    private final OnboardingRepositorio repo;
    private final ConversacionSesionRepository sesiones;
    private final CanalCuentaRepository cuentas;
    private final AvisoUnicoRepository avisos;
    private final OnboardingEnvio envio;
    private final ObjectProvider<ListaBajasAgente> bajas;
    private final Duration intervalo;

    public OnboardingNegocioService(OnboardingRepositorio repo, ConversacionSesionRepository sesiones,
                                    CanalCuentaRepository cuentas, AvisoUnicoRepository avisos,
                                    OnboardingEnvio envio, ObjectProvider<ListaBajasAgente> bajas,
                                    @Value("${hotclick.agente.onboarding.intervalo-horas:2}") long intervaloHoras) {
        this.repo = repo;
        this.sesiones = sesiones;
        this.cuentas = cuentas;
        this.avisos = avisos;
        this.envio = envio;
        this.bajas = bajas;
        this.intervalo = Duration.ofHours(Math.max(0, intervaloHoras));
    }

    /** @return cuántos pasos se enviaron. */
    public int barrer(LocalDateTime ahoraCr, Instant ahora) {
        LocalDateTime desde = ahoraCr.minusDays(DIAS_SEGUIMIENTO);
        List<LeadNegocio> leads = repo.leadsNegocio(desde, LOTE);
        if (leads.isEmpty()) return 0;
        List<EmpresaNueva> empresas = repo.empresasDesde(desde, LOTE_EMPRESAS);
        if (empresas.isEmpty()) return 0;

        Map<UUID, ConversacionSesion> sesionPorId = new HashMap<>();
        for (ConversacionSesion s : sesiones.findAllById(leads.stream().map(LeadNegocio::sesionId).toList())) {
            sesionPorId.put(s.getId(), s);
        }
        List<LeadNegocio> registrados = new ArrayList<>();
        for (LeadNegocio l : leads) {
            ConversacionSesion s = sesionPorId.get(l.sesionId());
            if (s != null && seRegistro(l, s, empresas)) registrados.add(l);
        }
        if (registrados.isEmpty()) return 0;

        List<Long> aConvertir = registrados.stream().filter(l -> !"CONVERTIDO".equals(l.estado())).map(LeadNegocio::id).toList();
        int convertidos = repo.marcarConvertidos(aConvertir);
        if (convertidos > 0) log.info("[agente-onboarding] {} lead(s) de negocio marcados CONVERTIDO", convertidos);

        List<Long> ids = registrados.stream().map(LeadNegocio::id).toList();
        Map<OnboardingPaso, Map<Long, Instant>> enviados = new HashMap<>();
        for (OnboardingPaso p : OnboardingPaso.values()) enviados.put(p, avisos.enviados(p.tipoAviso(), ids));
        Map<Long, CanalCuenta> cuentaPorId = cuentasDe(sesionPorId.values());
        Set<ListaBajasAgente.Contacto> deBaja = bajasDe(sesionPorId.values());

        int total = 0;
        for (LeadNegocio l : registrados) {
            total += acompanar(l, sesionPorId.get(l.sesionId()), enviados, cuentaPorId, deBaja, ahora);
        }
        if (total > 0) log.info("[agente-onboarding] {} paso(s) enviados", total);
        return total;
    }

    private int acompanar(LeadNegocio l, ConversacionSesion s, Map<OnboardingPaso, Map<Long, Instant>> enviados,
                          Map<Long, CanalCuenta> cuentaPorId, Set<ListaBajasAgente.Contacto> deBaja, Instant ahora) {
        try {
            OnboardingPaso siguiente = siguiente(l.id(), enviados, ahora);
            if (siguiente == null) return 0;
            if (s.getPerfil() != PerfilConversacion.HOTCLICK || s.getModo() == ModoConversacion.PERSONA) return 0;
            if (s.getContactoExterno() == null || !EnvioConversacion.dentroDeVentana(s, ahora)) return 0;
            CanalCuenta cuenta = s.getCanalCuentaId() == null ? null : cuentaPorId.get(s.getCanalCuentaId());
            if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA) return 0;
            if (deBaja.contains(new ListaBajasAgente.Contacto(s.getEmpresaId(), s.getCanal(), s.getContactoExterno()))) {
                return 0;
            }
            return envio.enviar(l.id(), siguiente, s, cuenta) ? 1 : 0;
        } catch (RuntimeException ex) {
            log.warn("[agente-onboarding] no se pudo procesar un lead: {}", ex.getClass().getSimpleName());
            return 0;
        }
    }

    /** Primer paso sin enviar, si ya pasó el intervalo desde el anterior; null si terminó o todavía no toca. */
    static OnboardingPaso siguiente(long leadId, Map<OnboardingPaso, Map<Long, Instant>> enviados, Instant ahora,
                                    Duration intervalo) {
        Instant anterior = null;
        for (OnboardingPaso p : OnboardingPaso.values()) {
            Instant cuando = enviados.getOrDefault(p, Map.of()).get(leadId);
            if (cuando == null) {
                return anterior == null || !ahora.isBefore(anterior.plus(intervalo)) ? p : null;
            }
            anterior = cuando;
        }
        return null;
    }

    private OnboardingPaso siguiente(long leadId, Map<OnboardingPaso, Map<Long, Instant>> enviados, Instant ahora) {
        return siguiente(leadId, enviados, ahora, intervalo);
    }

    /** El contacto de la conversación del lead coincide con una empresa registrada después del lead. */
    static boolean seRegistro(LeadNegocio lead, ConversacionSesion s, List<EmpresaNueva> empresas) {
        String contacto = finales(s.getContactoExterno());
        if (contacto == null) return false;
        for (EmpresaNueva e : empresas) {
            if (e.registradaEn() == null || e.registradaEn().isBefore(lead.creadoEn())) continue;
            if (contacto.equals(finales(e.whatsappDigitos())) || contacto.equals(finales(e.telefonoDigitos()))) return true;
        }
        return false;
    }

    /** Últimos 8 dígitos (número local de Costa Rica sin el 506); null si hay menos de 8. */
    static String finales(String telefono) {
        if (telefono == null) return null;
        String d = telefono.replaceAll("\\D", "");
        return d.length() < DIGITOS_COMPARAR ? null : d.substring(d.length() - DIGITOS_COMPARAR);
    }

    private Map<Long, CanalCuenta> cuentasDe(java.util.Collection<ConversacionSesion> lista) {
        Set<Long> ids = new HashSet<>();
        for (ConversacionSesion s : lista) {
            if (s.getCanalCuentaId() != null) ids.add(s.getCanalCuentaId());
        }
        Map<Long, CanalCuenta> mapa = new HashMap<>();
        for (CanalCuenta c : cuentas.findAllById(ids)) mapa.put(c.getId(), c);
        return mapa;
    }

    private Set<ListaBajasAgente.Contacto> bajasDe(java.util.Collection<ConversacionSesion> lista) {
        List<ListaBajasAgente.Contacto> contactos = new ArrayList<>();
        for (ConversacionSesion s : lista) {
            contactos.add(new ListaBajasAgente.Contacto(s.getEmpresaId(), s.getCanal(), s.getContactoExterno()));
        }
        return bajas.getIfAvailable(() -> ListaBajasAgente.NINGUNA).dadosDeBaja(contactos);
    }
}
