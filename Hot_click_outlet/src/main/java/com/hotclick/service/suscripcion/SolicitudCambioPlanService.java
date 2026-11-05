package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.SolicitudCambioPlan;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.SolicitudCambioPlanRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bajar de plan con la suscripción ya cobrada: no hay botón directo. La pyme manda una solicitud (plan actual, plan
 * pedido, motivo y fecha) y ADMIN la revisa a mano. Esto no toca ONVO ni el plan.
 */
@Service
public class SolicitudCambioPlanService {

    private static final Logger log = LoggerFactory.getLogger(SolicitudCambioPlanService.class);
    static final int MOTIVO_MIN = 5;
    static final int MOTIVO_MAX = 500;

    /** Datos inválidos: 400 con mensaje propio (sin e.getMessage del sistema). */
    public static class SolicitudInvalidaException extends RuntimeException {
        public SolicitudInvalidaException(String mensaje) { super(mensaje); }
    }

    /** Ya hay una solicitud sin revisar: 409. */
    public static class SolicitudAbiertaException extends RuntimeException {
        public static final String MENSAJE = "Ya tenés una solicitud de cambio de plan en revisión. Te avisamos cuando la veamos.";
        public SolicitudAbiertaException() { super(MENSAJE); }
    }

    private final SolicitudCambioPlanRepository repo;
    private final EmpresaRepository empresaRepo;
    private final PlanRepository planRepo;

    public SolicitudCambioPlanService(SolicitudCambioPlanRepository repo, EmpresaRepository empresaRepo,
                                      PlanRepository planRepo) {
        this.repo = repo;
        this.empresaRepo = empresaRepo;
        this.planRepo = planRepo;
    }

    @Transactional
    public Map<String, Object> solicitar(Long empresaId, Long usuarioId, Long planSolicitadoId, String motivo) {
        Empresa empresa = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new SolicitudInvalidaException("No encontramos tu negocio."));
        String actual = planActual(empresa);
        Plan pedido = planSolicitadoId == null ? null : planRepo.findById(planSolicitadoId).orElse(null);
        if (pedido == null) throw new SolicitudInvalidaException("Elegí el plan al que querés pasar.");
        int rActual = SuscripcionOnvoChangeService.rangoPlan(actual);
        int rPedido = SuscripcionOnvoChangeService.rangoPlan(pedido.getNombre());
        if (rPedido < 0 || rActual < 0 || rPedido >= rActual) {
            throw new SolicitudInvalidaException("Por solicitud solo se puede pedir un plan más bajo que el tuyo.");
        }
        String m = motivo == null ? "" : motivo.strip();
        if (m.length() < MOTIVO_MIN || m.length() > MOTIVO_MAX) {
            throw new SolicitudInvalidaException("Contanos el motivo (entre " + MOTIVO_MIN + " y " + MOTIVO_MAX + " caracteres).");
        }
        if (repo.existsByEmpresaIdAndRevisadaFalse(empresaId)) throw new SolicitudAbiertaException();
        SolicitudCambioPlan s = new SolicitudCambioPlan();
        s.setEmpresaId(empresaId);
        s.setPlanActual(actual.toUpperCase(java.util.Locale.ROOT));
        s.setPlanSolicitado(pedido.getNombre());
        s.setMotivo(m);
        s.setFechaSolicitud(LocalDateTime.now(Constants.ZONA_CR));
        s.setSolicitadoPor(usuarioId);
        s.setRevisada(false);
        try {
            // El índice único parcial (V234) cierra la carrera del check-then-insert: el segundo insert falla → 409.
            s = repo.saveAndFlush(s);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new SolicitudAbiertaException();
        }
        log.info("[plan-solicitud] solicitud de bajar de plan empresa={} de={} a={} id={}",
            empresaId, s.getPlanActual(), s.getPlanSolicitado(), s.getId());
        return aMapa(s, empresa.getNombreEmpresa());
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(int limit) {
        int n = Math.max(1, Math.min(limit, 500));
        List<SolicitudCambioPlan> filas = repo.findAllByOrderByRevisadaAscFechaSolicitudDesc(PageRequest.of(0, n));
        // Un solo query para los nombres de todas las pymes de la página (sin N+1).
        return SolicitudCambioPlanVista.lista(filas, empresaRepo.findAllById(SolicitudCambioPlanVista.idsEmpresa(filas)));
    }

    /** Marca revisada con quién y cuándo. Idempotente: si ya estaba revisada no pisa quién la revisó. */
    @Transactional
    public Map<String, Object> marcarRevisada(Long id, Long adminId) {
        SolicitudCambioPlan s = repo.findById(id)
            .orElseThrow(() -> new com.hotclick.exception.RecursoNoEncontradoException("Solicitud de cambio de plan", id));
        if (!s.isRevisada()) {
            s.setRevisada(true);
            s.setRevisadaPor(adminId);
            s.setFechaRevision(LocalDateTime.now(Constants.ZONA_CR));
            s = repo.save(s);
            log.info("[plan-solicitud] revisada id={} admin={}", id, adminId);
        }
        Empresa e = empresaRepo.findById(s.getEmpresaId()).orElse(null);
        return aMapa(s, e == null ? null : e.getNombreEmpresa());
    }

    private String planActual(Empresa empresa) {
        Plan p = empresa.getPlan();
        if (p != null && p.getId() != null) {
            Plan guardado = planRepo.findById(p.getId()).orElse(null);
            if (guardado != null && guardado.getNombre() != null) return guardado.getNombre();
        }
        return empresa.getPlanSaas() != null ? empresa.getPlanSaas() : "EMPRENDEDOR";
    }

    static Map<String, Object> aMapa(SolicitudCambioPlan s, String nombreEmpresa) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId());
        m.put("empresaId", s.getEmpresaId());
        m.put("nombreEmpresa", nombreEmpresa);
        m.put("planActual", s.getPlanActual());
        m.put("planSolicitado", s.getPlanSolicitado());
        m.put("motivo", s.getMotivo());
        m.put("fechaSolicitud", s.getFechaSolicitud() == null ? null : s.getFechaSolicitud().toString());
        m.put("revisada", s.isRevisada());
        m.put("revisadaPor", s.getRevisadaPor());
        m.put("fechaRevision", s.getFechaRevision() == null ? null : s.getFechaRevision().toString());
        return m;
    }
}
