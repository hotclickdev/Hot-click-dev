package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Suscripcion;
import com.hotclick.model.SuspensionExtension;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.repository.SuspensionExtensionRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Herramientas de admin sobre el impago (#333): suspensión manual, lista de tiendas en gracia y
 * "Dar 3 días extra" (una vez por ciclo). Durante la extensión la tienda queda en EXTENSION_IMPAGO:
 * oculta del marketplace (el catálogo solo publica ACTIVO), sin ventas/POS/productos (interceptor),
 * y solo gestiona los pedidos creados en la gracia. Todo es fail-closed y nada se borra.
 */
@Service
public class AdminSuspensionService {

    private static final Logger log = LoggerFactory.getLogger(AdminSuspensionService.class);
    static final String ACCION_SUSPENDER = "ADMIN_SUSPENDER_IMPAGO";
    static final String ACCION_EXTENSION = "ADMIN_EXTENSION_IMPAGO";
    static final String ACCION_EXTENSION_VENCIDA = "EXTENSION_IMPAGO_VENCIDA";
    private static final String PAST_DUE = "PAST_DUE";
    private static final String VENCIDO = "VENCIDO";

    /** Rutas de pedido gestionables en extensión (solo pedidos creados en la gracia). */
    private static final Pattern PEDIDO_GESTION = Pattern.compile(
        "^(GET /api/pedidos/(\\d+)(/despacho)?|PUT /api/pedidos/(\\d+)/(estado|guia|envio))$");
    static final String RUTA_PEDIDOS_GRACIA = "GET /api/billing/impago/pedidos";

    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;
    private final SuspensionExtensionRepository extensionRepo;
    private final PedidoRepository pedidoRepo;
    private final SuscripcionPlanSupport planSupport;
    private final AuditoriaAdminRegistroService auditoria;
    private final CompanyScope companyScope;
    private final int diasGracia;
    private final int diasExtension;
    private Clock clock = Clock.system(Constants.ZONA_CR);

    public AdminSuspensionService(EmpresaRepository empresaRepo, SuscripcionRepository suscripcionRepo,
                                  SuspensionExtensionRepository extensionRepo, PedidoRepository pedidoRepo,
                                  SuscripcionPlanSupport planSupport, AuditoriaAdminRegistroService auditoria,
                                  CompanyScope companyScope,
                                  @Value("${hotclick.billing.dias-gracia:8}") int diasGracia,
                                  @Value("${hotclick.billing.dias-extension-impago:3}") int diasExtension) {
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
        this.extensionRepo = extensionRepo;
        this.pedidoRepo = pedidoRepo;
        this.planSupport = planSupport;
        this.auditoria = auditoria;
        this.companyScope = companyScope;
        this.diasGracia = diasGracia;
        // Fail-closed ante config inválida: nunca extensiones de 0/negativas ni absurdas.
        if (diasExtension < 1 || diasExtension > 30) {
            throw new IllegalStateException("hotclick.billing.dias-extension-impago fuera de rango (1-30): " + diasExtension);
        }
        this.diasExtension = diasExtension;
    }

    void setClock(Clock clock) { this.clock = clock; }

    private LocalDateTime ahora() { return LocalDateTime.now(clock); }

    public int getDiasExtension() { return diasExtension; }

    /** Días que le quedan vendiendo: día 1 = fechaFin+1 … día diasGracia (inclusive). 0 = pendiente de suspensión. */
    long diasRestantes(LocalDate fechaFin, LocalDate hoy) {
        long d = ChronoUnit.DAYS.between(hoy, fechaFin.plusDays(diasGracia)) + 1;
        return Math.max(0, d);
    }

    public Map<String, Object> listar() {
        return listar(LIMITE_LISTA);
    }

    /** Tope de filas por sección de la lista de admin. */
    public static final int LIMITE_LISTA = 200;

    /** limit fuera de 1..LIMITE_LISTA (0, negativo, enorme) se acota: nunca lista sin tope ni con PageRequest inválido. */
    public static int acotar(int limit) {
        return Math.max(1, Math.min(limit, LIMITE_LISTA));
    }

    /** Consultas fijas (sin N+1): gracia, suspendidas, ciclos vencidos, extensiones usadas y última extensión. */
    @Transactional(readOnly = true)
    public Map<String, Object> listar(int limit) {
        org.springframework.data.domain.Pageable page = org.springframework.data.domain.PageRequest.of(0, acotar(limit));
        LocalDate hoy = ahora().toLocalDate();
        List<Map<String, Object>> enGracia = new ArrayList<>();
        for (Suscripcion s : suscripcionRepo.findPastDueConEmpresa(page)) {
            Empresa e = s.getEmpresa();
            if (e == null || !"ACTIVO".equals(e.getEstadoEmpresa())) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("empresaId", e.getId());
            m.put("nombreEmpresa", e.getNombreEmpresa());
            m.put("fechaFin", s.getFechaFin());
            m.put("ultimoDiaVenta", s.getFechaFin().plusDays(diasGracia));
            m.put("diasRestantes", diasRestantes(s.getFechaFin(), hoy));
            enGracia.add(m);
        }
        List<Object[]> filas = empresaRepo.findResumenByEstados(
            List.of(Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO, Constants.ESTADO_EMPRESA_EXTENSION_IMPAGO), page);
        List<Long> ids = filas.stream().map(f -> (Long) f[0]).toList();
        Map<Long, Suscripcion> cicloPorEmpresa = new java.util.HashMap<>();
        Map<Long, SuspensionExtension> extPorEmpresa = new java.util.HashMap<>();
        java.util.Set<Long> usadas = new java.util.HashSet<>();
        if (!ids.isEmpty()) {
            for (Suscripcion c : suscripcionRepo.findByEmpresaIdsAndEstado(ids, VENCIDO)) {
                if (c.getEmpresa() != null) cicloPorEmpresa.putIfAbsent(c.getEmpresa().getId(), c);
            }
            List<Long> ciclos = cicloPorEmpresa.values().stream().map(Suscripcion::getId).toList();
            if (!ciclos.isEmpty()) usadas.addAll(extensionRepo.findSuscripcionIdsUsadas(ciclos));
            for (SuspensionExtension x : extensionRepo.findByEmpresaIdsRecientes(ids)) {
                extPorEmpresa.putIfAbsent(x.getEmpresaId(), x);
            }
        }
        List<Map<String, Object>> suspendidas = new ArrayList<>();
        for (Object[] f : filas) {
            Long id = (Long) f[0];
            String estado = (String) f[2];
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("empresaId", id);
            m.put("nombreEmpresa", f[1]);
            m.put("estado", estado);
            Suscripcion ciclo = cicloPorEmpresa.get(id);
            // Fail-closed: sin ciclo VENCIDO no hay extensión disponible.
            boolean usada = ciclo == null || usadas.contains(ciclo.getId());
            m.put("extensionDisponible", Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO.equals(estado) && !usada);
            SuspensionExtension x = extPorEmpresa.get(id);
            if (x != null) {
                m.put("extensionVenceEn", x.getVenceEn());
                m.put("extensionMotivo", x.getMotivo());
            }
            suspendidas.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("diasGracia", diasGracia);
        out.put("diasExtension", diasExtension);
        out.put("enGracia", enGracia);
        out.put("suspendidas", suspendidas);
        return out;
    }

    private static String motivoValido(String motivo) {
        String m = motivo == null ? "" : motivo.strip();
        if (m.length() < 3) throw new IllegalArgumentException("Indicá el motivo.");
        return m.length() > 400 ? m.substring(0, 400) : m;
    }

    /** Suspensión manual por impago: solo tiendas ACTIVO con mensualidad impaga (PAST_DUE o VENCIDO). */
    @Transactional
    public Map<String, Object> suspender(Long empresaId, String motivo) {
        String m = motivoValido(motivo);
        Empresa e = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new IllegalStateException("Tienda no encontrada."));
        if (!"ACTIVO".equals(e.getEstadoEmpresa())) {
            throw new IllegalStateException("Solo se puede suspender una tienda activa.");
        }
        Optional<Suscripcion> pastDue = suscripcionRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(empresaId, PAST_DUE);
        if (pastDue.isPresent()) {
            // Solo cierra el ciclo impago (VENCIDO) para el monto pendiente y la extensión.
            // La suspensión manual NO baja el plan: solo oculta y bloquea (SUSPENDIDO_IMPAGO).
            // La baja de plan queda exclusiva del job automático de #333.
            suscripcionRepo.marcarVencidoSiPastDue(pastDue.get().getId());
        } else if (suscripcionRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(empresaId, VENCIDO).isEmpty()) {
            throw new IllegalStateException("La tienda no tiene una mensualidad impaga.");
        }
        if (empresaRepo.suspenderPorImpagoManual(empresaId) != 1) {
            throw new IllegalStateException("La tienda cambió de estado; recargá.");
        }
        auditoria.registrar(ACCION_SUSPENDER, "EMPRESA", empresaId, empresaId, "Motivo: " + m);
        log.info("[impago] admin suspendió empresa {}", empresaId);
        return Map.of("empresaId", empresaId, "estado", Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO);
    }

    /** "Dar 3 días extra": una vez por ciclo (suscripción VENCIDA), solo desde SUSPENDIDO_IMPAGO. */
    @Transactional
    public Map<String, Object> darExtension(Long empresaId, String motivo) {
        String m = motivoValido(motivo);
        Empresa e = empresaRepo.findById(empresaId)
            .orElseThrow(() -> new IllegalStateException("Tienda no encontrada."));
        if (!Constants.ESTADO_EMPRESA_SUSPENDIDO_IMPAGO.equals(e.getEstadoEmpresa())) {
            throw new IllegalStateException("Solo se puede extender una tienda suspendida por impago.");
        }
        Suscripcion ciclo = suscripcionRepo.findTopByEmpresaIdAndEstadoOrderByFechaCreacionDesc(empresaId, VENCIDO)
            .orElseThrow(() -> new IllegalStateException("Sin mensualidad pendiente."));
        if (extensionRepo.existsBySuscripcionId(ciclo.getId())) {
            throw new IllegalStateException("La extensión ya se usó en este ciclo de impago.");
        }
        LocalDateTime ahora = ahora();
        SuspensionExtension x = new SuspensionExtension();
        x.setEmpresaId(empresaId);
        x.setSuscripcionId(ciclo.getId());
        x.setGraciaDesde(ciclo.getFechaFin().plusDays(1).atStartOfDay());
        x.setGraciaHasta(ahora);
        x.setOtorgadaEn(ahora);
        x.setVenceEn(ahora.plusDays(diasExtension));
        x.setAdminId(companyScope.idActorAuditoria());
        x.setAdminEmail(companyScope.correoActorAuditoria());
        x.setMotivo(m);
        try {
            extensionRepo.saveAndFlush(x);
        } catch (DataIntegrityViolationException dup) {
            throw new IllegalStateException("La extensión ya se usó en este ciclo de impago.");
        }
        if (empresaRepo.pasarAExtensionImpago(empresaId) != 1) {
            throw new IllegalStateException("La tienda cambió de estado; recargá.");
        }
        auditoria.registrar(ACCION_EXTENSION, "EMPRESA", empresaId, empresaId,
            "Extensión " + diasExtension + " días hasta " + x.getVenceEn() + ". Motivo: " + m);
        return Map.of("empresaId", empresaId, "estado", Constants.ESTADO_EMPRESA_EXTENSION_IMPAGO,
            "venceEn", x.getVenceEn().toString());
    }

    /** Vence extensiones: EXTENSION_IMPAGO sin extensión vigente vuelve a SUSPENDIDO_IMPAGO. */
    @Scheduled(fixedDelayString = "PT10M", initialDelayString = "PT5M")
    @SchedulerLock(name = "vencerExtensionesImpago", lockAtMostFor = "PT9M", lockAtLeastFor = "PT1M")
    @Transactional
    public int vencerExtensiones() {
        List<Long> ids = extensionRepo.findEmpresasConExtensionVencida(ahora());
        if (ids.isEmpty()) return 0;
        int n = empresaRepo.volverASuspensionImpago(ids);
        log.info("[impago] {} extensión(es) vencida(s): vuelven a SUSPENDIDO_IMPAGO", n);
        return n;
    }

    /** Extensión vigente de la empresa; vacía si no hay o ya venció (fail-closed). */
    public Optional<SuspensionExtension> extensionVigente(Long empresaId) {
        return extensionRepo.findTopByEmpresaIdAndVenceEnAfterOrderByVenceEnDesc(empresaId, ahora());
    }

    /**
     * ¿La ruta está permitida en extensión? Solo la lista de pedidos de gracia y la gestión de un pedido
     * propio creado en la ventana de gracia. Cualquier error o duda → false.
     */
    public boolean permitidaEnExtension(Long empresaId, String metodoYRuta) {
        Optional<SuspensionExtension> ext = extensionVigente(empresaId);
        if (ext.isEmpty()) return false;
        if (RUTA_PEDIDOS_GRACIA.equals(metodoYRuta)) return true;
        Matcher mt = PEDIDO_GESTION.matcher(metodoYRuta);
        if (!mt.matches()) return false;
        String id = mt.group(2) != null ? mt.group(2) : mt.group(4);
        try {
            SuspensionExtension x = ext.get();
            return pedidoRepo.countGestionableEnGracia(Long.valueOf(id), empresaId, x.getGraciaDesde(), x.getGraciaHasta()) > 0;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    /** Tope de filas por consulta: la gracia es corta, pero la lista nunca queda sin acotar. */
    public static final int LIMITE_PEDIDOS_GRACIA = 200;

    public List<Map<String, Object>> pedidosDeGracia(Long empresaId) {
        return pedidosDeGracia(empresaId, LIMITE_PEDIDOS_GRACIA);
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> pedidosDeGracia(Long empresaId, int limit) {
        int tope = Math.max(1, Math.min(limit, LIMITE_PEDIDOS_GRACIA));
        Optional<SuspensionExtension> ext = extensionVigente(empresaId);
        if (ext.isEmpty()) return List.of();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Pedido p : pedidoRepo.findCreadosEnGracia(empresaId, ext.get().getGraciaDesde(), ext.get().getGraciaHasta(),
                org.springframework.data.domain.PageRequest.of(0, tope))) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId());
            m.put("numeroPedido", p.getNumeroPedido());
            m.put("estadoPedido", p.getEstadoPedido());
            m.put("totalPedido", p.getTotalPedido());
            m.put("numeroGuia", p.getNumeroGuia());
            m.put("fechaPedido", p.getFechaPedido());
            out.add(m);
        }
        return out;
    }
}
