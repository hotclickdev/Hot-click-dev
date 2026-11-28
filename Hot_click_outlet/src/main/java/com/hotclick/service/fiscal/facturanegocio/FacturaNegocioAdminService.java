package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaNegocio;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.utils.Constants;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * "Facturas de negocios" en /plataforma: lista, detalle, marcar revisada, recordar y generar a mano.
 * Solo ADMIN de plataforma y nunca desde una sesión de soporte (impersonación).
 */
@Service
public class FacturaNegocioAdminService {

    static final int MAX_PAGINA = 100;
    static final String ENTIDAD = "FACTURA_NEGOCIO";
    static final Set<String> ESTADOS = Set.of(FacturaNegocio.PENDIENTE, FacturaNegocio.RECIBIDA, FacturaNegocio.ACEPTADA,
        FacturaNegocio.RECHAZADA, FacturaNegocio.VENCIDA, FacturaNegocio.NO_APLICA);
    static final Set<String> RECORDABLES = Set.of(FacturaNegocio.PENDIENTE, FacturaNegocio.RECHAZADA, FacturaNegocio.VENCIDA);
    /** Un recordatorio por factura cada 12 horas, para no saturar al negocio. */
    static final int VENTANA_RECORDATORIO_SEG = 12 * 60 * 60;

    private final FacturaNegocioRepository repo;
    private final EmpresaRepository empresas;
    private final CompanyScope companyScope;
    private final FacturaNegocioGeneracionService generacion;
    private final TelegramNotificacionClienteService telegram;
    private final RateLimiter rateLimiter;
    private final ConfiguracionFiscalService config;
    private final AuditoriaAdminRegistroService auditoria;
    private final org.springframework.context.ApplicationEventPublisher eventos;

    public FacturaNegocioAdminService(FacturaNegocioRepository repo, EmpresaRepository empresas, CompanyScope companyScope,
                                      FacturaNegocioGeneracionService generacion, TelegramNotificacionClienteService telegram,
                                      RateLimiter rateLimiter, ConfiguracionFiscalService config,
                                      AuditoriaAdminRegistroService auditoria,
                                      org.springframework.context.ApplicationEventPublisher eventos) {
        this.repo = repo;
        this.empresas = empresas;
        this.companyScope = companyScope;
        this.generacion = generacion;
        this.telegram = telegram;
        this.rateLimiter = rateLimiter;
        this.config = config;
        this.auditoria = auditoria;
        this.eventos = eventos;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listar(String estado, LocalDate desde, int pagina, int tamano) {
        return listar(estado, desde, null, pagina, tamano);
    }

    /** Con {@code empresaId} opcional (la ficha del negocio elige a qué factura atar un enlace de cobro). */
    @Transactional(readOnly = true)
    public Map<String, Object> listar(String estado, LocalDate desde, Long empresaId, int pagina, int tamano) {
        exigirAdmin();
        String filtro = estado == null || estado.isBlank() ? null : estado.trim().toUpperCase(java.util.Locale.ROOT);
        if (filtro != null && !ESTADOS.contains(filtro)) throw new IllegalArgumentException("Estado inválido.");
        Page<FacturaNegocio> page = repo.buscarAdmin(filtro, desde, empresaId,
            PageRequest.of(Math.max(0, pagina), Math.clamp(tamano, 1, MAX_PAGINA)));
        List<Long> ids = FacturaNegocioVista.empresaIds(page.getContent());
        Map<Long, String> nombres = empresas.findAllById(ids).stream()
            .collect(Collectors.toMap(Empresa::getId, FacturaNegocioAdminService::nombre, (a, b) -> a));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("contenido", FacturaNegocioVista.listaAdmin(page.getContent(), nombres, hoy(), tradicional()));
        m.put("pagina", page.getNumber());
        m.put("totalPaginas", page.getTotalPages());
        m.put("total", page.getTotalElements());
        return m;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> detalle(Long id) {
        exigirAdmin();
        FacturaNegocio f = cargar(id);
        return vista(f);
    }

    /**
     * "Aprobar factura": solo una RECIBIDA (pasó todas las validaciones) pasa a ACEPTADA. Recién ahí se aplica el
     * mensaje receptor y se publica {@link FacturaNegocioRecibidaEvent} (cancela los enlaces de cobro de esa factura).
     * Solo ADMIN, nunca impersonando, y queda en la auditoría. Dos aprobaciones a la vez: la versión corta la segunda.
     */
    @Transactional
    public Map<String, Object> aprobar(Long id) {
        exigirAdmin();
        FacturaNegocio f = cargar(id);
        if (!FacturaNegocio.RECIBIDA.equals(f.getEstado())) {
            throw new IllegalStateException("Solo se aprueba una factura recibida y pendiente de revisión.");
        }
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        f.setEstado(FacturaNegocio.ACEPTADA);
        marcarRevision(f, ahora);
        MensajeReceptorCodigos.aplicar(f, tradicional(), config.reglasFactura().mensajeReceptorHabilitado(), ahora);
        repo.saveAndFlush(f);
        auditoria.registrar("FACTURA_NEGOCIO_APROBADA", ENTIDAD, f.getId(), f.getEmpresaId(), f.getEstado());
        eventos.publishEvent(new FacturaNegocioRecibidaEvent(f.getEmpresaId(), f.getId()));
        return vista(f);
    }

    /** "Rechazar": una RECIBIDA vuelve a RECHAZADA con el motivo del ADMIN; el negocio puede subir otra. */
    @Transactional
    public Map<String, Object> rechazar(Long id, String motivo) {
        exigirAdmin();
        FacturaNegocio f = cargar(id);
        if (!FacturaNegocio.RECIBIDA.equals(f.getEstado())) {
            throw new IllegalStateException("Solo se rechaza una factura recibida y pendiente de revisión.");
        }
        String limpio = motivo == null ? "" : motivo.replaceAll("[<>\\p{Cntrl}]", " ").trim();
        if (limpio.length() < 5 || limpio.length() > 300) {
            throw new IllegalArgumentException("Escribí un motivo de 5 a 300 caracteres.");
        }
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        f.setEstado(FacturaNegocio.RECHAZADA);
        f.setClaveXml(null);
        f.setMensajeValidacion(FacturaNegocioVista.empaquetar(java.util.List.of("HotClick la rechazó: " + limpio), java.util.List.of()));
        marcarRevision(f, ahora);
        repo.saveAndFlush(f);
        auditoria.registrar("FACTURA_NEGOCIO_RECHAZADA", ENTIDAD, f.getId(), f.getEmpresaId(), f.getEstado());
        return vista(f);
    }

    private void marcarRevision(FacturaNegocio f, LocalDateTime ahora) {
        f.setRevisada(true);
        f.setRevisadaPor(companyScope.idActorAuditoria());
        f.setFechaRevision(ahora);
        f.setFechaActualizacion(ahora);
    }

    /** Aviso al negocio (aviso en su panel + Telegram si lo tiene vinculado). Solo si todavía debe la factura. */
    @Transactional
    public Map<String, Object> recordar(Long id) {
        exigirAdmin();
        FacturaNegocio f = cargar(id);
        if (!RECORDABLES.contains(f.getEstado())) {
            throw new IllegalStateException("Esta factura no tiene nada pendiente que recordar.");
        }
        if (!rateLimiter.tryAcquireEstricto("factura-negocio:" + f.getId() + ":recordar", 1, VENTANA_RECORDATORIO_SEG)) {
            throw new IllegalStateException("Ya se le recordó hace poco. Probá de nuevo más tarde.");
        }
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        f.setRecordatorios(f.getRecordatorios() + 1);
        f.setUltimoRecordatorio(ahora);
        f.setFechaActualizacion(ahora);
        repo.save(f);
        telegram.notificarRecordatorioFacturaHotclick(f.getEmpresaId(),
            FacturaNegocioCalculo.diasRestantes(hoy(), f.getFechaLimite()));
        auditoria.registrar("FACTURA_NEGOCIO_RECORDADA", ENTIDAD, f.getId(), f.getEmpresaId(), f.getEstado());
        return vista(f);
    }

    /** Genera a mano la quincena cerrada antes de {@code fecha} (hoy si viene vacía) y marca las vencidas. */
    public Map<String, Object> generar(LocalDate fecha) {
        exigirAdmin();
        LocalDate dia = fecha != null ? fecha : hoy();
        Map<String, Object> r = new LinkedHashMap<>(generacion.generar(FacturaNegocioCalculo.quincenaCerrada(dia)));
        r.put("vencidas", generacion.vencer(hoy()));
        auditoria.registrar("FACTURA_NEGOCIO_GENERADA", ENTIDAD, null, null,
            r.get("desde") + ".." + r.get("hasta") + " creadas=" + r.get("creadas"));
        return r;
    }

    private Map<String, Object> vista(FacturaNegocio f) {
        Empresa e = empresas.findById(f.getEmpresaId()).orElse(null);
        return FacturaNegocioVista.admin(f, e == null ? null : nombre(e), hoy(), tradicional());
    }

    private FacturaNegocio cargar(Long id) {
        return repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Factura no encontrada"));
    }

    private static String nombre(Empresa e) {
        return e.getNombreComercial() != null ? e.getNombreComercial() : e.getNombreEmpresa();
    }

    private static LocalDate hoy() { return LocalDate.now(Constants.ZONA_CR); }

    private boolean tradicional() { return FacturaNegocioService.REGIMEN_TRADICIONAL.equals(config.reglas().regimen()); }

    private void exigirAdmin() {
        if (!companyScope.isAdminIT() || companyScope.isImpersonating()) {
            throw new TenantAccessDeniedException("Solo un administrador de plataforma gestiona las facturas de negocios");
        }
    }
}
