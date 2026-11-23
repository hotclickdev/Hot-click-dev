package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Cuenta conectada ONVO por empresa. Fail-closed: si ONVO está deshabilitado, sin llave o falla,
 * el registro sigue y la cuenta queda {@code PENDIENTE_ONVO}; el poller reintenta. Solo el estado
 * {@code active} de ONVO (GET) la deja ACTIVA; nada se da por activo sin esa confirmación.
 */
@Service
public class CuentaOnvoService {

    private static final Logger log = LoggerFactory.getLogger(CuentaOnvoService.class);
    static final int MAX_BUSINESS_NAME = 50;
    static final List<String> ESTADOS_POR_CREAR = List.of(EmpresaCuentaOnvo.PENDIENTE_ONVO);
    static final List<String> ESTADOS_POR_CONSULTAR = List.of(
        EmpresaCuentaOnvo.PENDIENTE_ONBOARDING, EmpresaCuentaOnvo.EN_APROBACION, EmpresaCuentaOnvo.INACTIVA,
        EmpresaCuentaOnvo.ACTIVA, EmpresaCuentaOnvo.SUSPENDIDA);

    private final EmpresaCuentaOnvoRepository repo;
    private final EmpresaRepository empresaRepository;
    private final OnvoCuentaConectadaClient client;
    private final TransactionTemplate tx;
    private final boolean habilitado;
    private final Duration vigenciaOnboarding;
    private final int lote;
    private Clock clock = Clock.systemDefaultZone();

    /** Alta por fases (opcionales: sin ellos el servicio se comporta como antes de V244). */
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.service.alta.AltaFasesService altaFases;
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.hotclick.service.alta.AltaFasesAvisoService avisos;
    @Value("${onvo.cuentas.onboarding-hosts-permitidos:onvopay.com,onvo.cr}")
    private String hostsOnboardingPermitidos = com.hotclick.service.alta.OnboardingUrlPolicy.HOSTS_POR_DEFECTO;

    public CuentaOnvoService(EmpresaCuentaOnvoRepository repo, EmpresaRepository empresaRepository,
                             OnvoCuentaConectadaClient client, PlatformTransactionManager txManager,
                             @Value("${payments.onvo.enabled:false}") boolean habilitado,
                             @Value("${onvo.cuentas.onboarding-vigencia:P7D}") Duration vigenciaOnboarding,
                             @Value("${onvo.cuentas.poller.lote:50}") int lote) {
        this.repo = repo;
        this.empresaRepository = empresaRepository;
        this.client = client;
        // REQUIRES_NEW: se ejecuta también desde afterCommit del registro, donde unirse a la tx no persiste.
        this.tx = new TransactionTemplate(txManager);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.habilitado = habilitado;
        this.vigenciaOnboarding = vigenciaOnboarding;
        this.lote = lote;
    }

    void setClock(Clock clock) { this.clock = clock; }

    /** Solo para pruebas unitarias (en producción los inyecta Spring). */
    void setAltaFases(com.hotclick.service.alta.AltaFasesService altaFases,
                      com.hotclick.service.alta.AltaFasesAvisoService avisos) {
        this.altaFases = altaFases;
        this.avisos = avisos;
    }

    /**
     * Se llama dentro de la transacción del registro: deja la fila PENDIENTE_ONVO (outbox) y,
     * después del commit, intenta crear la cuenta en ONVO. Nunca lanza hacia el registro.
     */
    public void alRegistrarEmpresa(Empresa empresa) {
        if (empresa == null || empresa.getId() == null) return;
        Long empresaId = empresa.getId();
        try {
            if (altaFases != null) altaFases.alRegistrar(empresa);
            if (repo.findByEmpresaId(empresaId).isEmpty()) {
                EmpresaCuentaOnvo c = new EmpresaCuentaOnvo();
                c.setEmpresaId(empresaId);
                repo.save(c);
            }
        } catch (RuntimeException e) {
            log.error("[onvo-cuentas] No se pudo dejar pendiente la cuenta de empresa={}: {}", empresaId, e.getClass().getSimpleName());
            return;
        }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { intentarCrearSeguro(empresaId); }
            });
        } else {
            intentarCrearSeguro(empresaId);
        }
    }

    private void intentarCrearSeguro(Long empresaId) {
        try {
            intentarCrear(empresaId);
        } catch (RuntimeException e) {
            log.warn("[onvo-cuentas] Creación diferida falló empresa={}: {}", empresaId, e.getClass().getSimpleName());
        }
    }

    /** Intenta crear la cuenta conectada. Devuelve el estado local resultante. */
    public String intentarCrear(Long empresaId) {
        return tx.execute(s -> {
            EmpresaCuentaOnvo c = repo.findByEmpresaId(empresaId).orElse(null);
            if (c == null) return null;
            if (c.getOnvoAccountId() != null) return c.getEstado();
            if (!habilitado) {
                return pendiente(c, "ONVO deshabilitado (payments.onvo.enabled=false)", false);
            }
            Empresa e = empresaRepository.findById(empresaId).orElse(null);
            if (e == null) return pendiente(c, "Empresa inexistente", true);
            try {
                OnvoCuentaConectadaClient.CuentaCreada creada = client.crear(businessName(e));
                c.setOnvoAccountId(creada.id());
                c.setOnvoStatus(creada.status());
                c.setEstado(mapear(creada.status()));
                c.setOnboardingUrl(creada.onboardingUrl());
                c.setOnboardingExpiraEn(creada.onboardingUrl() != null ? ahora().plus(vigenciaOnboarding) : null);
                c.setUltimoError(null);
                c.setUltimaConsultaEn(ahora());
                repo.save(c);
                log.info("[onvo-cuentas] Cuenta conectada creada empresa={} estado={}", empresaId, c.getEstado());
                return c.getEstado();
            } catch (OnvoCuentaConectadaClient.OnvoNoConfiguradoException ex) {
                return pendiente(c, "ONVO sin llave", false);
            } catch (RuntimeException ex) {
                return pendiente(c, "Error ONVO: " + ex.getClass().getSimpleName(), true);
            }
        });
    }

    private String pendiente(EmpresaCuentaOnvo c, String motivo, boolean contarIntento) {
        c.setEstado(EmpresaCuentaOnvo.PENDIENTE_ONVO);
        c.setUltimoError(motivo.length() > 300 ? motivo.substring(0, 300) : motivo);
        if (contarIntento) c.setIntentos(c.getIntentos() + 1);
        repo.save(c);
        log.warn("[onvo-cuentas] Cuenta queda PENDIENTE_ONVO empresa={} motivo={}", c.getEmpresaId(), c.getUltimoError());
        return EmpresaCuentaOnvo.PENDIENTE_ONVO;
    }

    /** Un ciclo del poller: reintenta creaciones pendientes y consulta estados (ONVO no manda webhook). */
    public void ciclo() {
        for (EmpresaCuentaOnvo c : repo.findByEstadoInOrderByActualizadoEnAsc(ESTADOS_POR_CREAR, PageRequest.of(0, lote))) {
            intentarCrearSeguro(c.getEmpresaId());
        }
        if (!habilitado) return;
        for (EmpresaCuentaOnvo c : repo.findByEstadoInOrderByActualizadoEnAsc(ESTADOS_POR_CONSULTAR, PageRequest.of(0, lote))) {
            try {
                consultar(c.getId());
            } catch (RuntimeException e) {
                log.warn("[onvo-cuentas] Consulta de estado falló cuenta={}: {}", c.getId(), e.getClass().getSimpleName());
            }
        }
    }

    /** GET del estado; si sigue en onboarding y el enlace venció, lo regenera (POST onboarding-link). */
    public String consultar(Long cuentaId) {
        java.util.List<Runnable> despues = new java.util.ArrayList<>();
        String resultado = tx.execute(s -> {
            EmpresaCuentaOnvo c = repo.findById(cuentaId).orElse(null);
            if (c == null || c.getOnvoAccountId() == null) return c == null ? null : c.getEstado();
            String previo = c.getEstado();
            try {
                OnvoCuentaConectadaClient.CuentaEstado st = client.consultar(c.getOnvoAccountId());
                c.setOnvoStatus(st.status());
                c.setEstado(mapear(st.status()));
                c.setUltimoError(null);
            } catch (RuntimeException e) {
                // Sin confirmación de ONVO nunca se sube a ACTIVA; una ACTIVA que no se pudo consultar se mantiene.
                c.setUltimoError("Error consultando estado: " + e.getClass().getSimpleName());
            }
            c.setUltimaConsultaEn(ahora());
            if (EmpresaCuentaOnvo.PENDIENTE_ONBOARDING.equals(c.getEstado()) && onboardingVencido(c)) {
                regenerar(c);
            }
            registrarTransicion(c, previo, despues);
            repo.save(c);
            if (altaFases != null) altaFases.sincronizar(c.getEmpresaId(), c);
            return c.getEstado();
        });
        ejecutarDespues(despues);
        return resultado;
    }

    /**
     * Transiciones de la cuenta (dentro de la transacción de {@link #consultar}):
     * primera vez ACTIVA, aviso único a HotClick, pérdida (ACTIVA → otro) y recuperación.
     * Los avisos se despachan después del commit y solo si este llamador ganó el claim.
     */
    /** Avisos fuera de la transacción (correo/Telegram): se ejecutan ya sin conexión de BD retenida. */
    private static void ejecutarDespues(java.util.List<Runnable> despues) {
        int i = 0;
        while (i < despues.size()) {
            despues.get(i++).run();
        }
    }

    private void registrarTransicion(EmpresaCuentaOnvo c, String previo, java.util.List<Runnable> despues) {
        boolean activa = EmpresaCuentaOnvo.ACTIVA.equals(c.getEstado());
        LocalDateTime ahora = ahora();
        if (activa) {
            if (c.getActivadaEn() == null) c.setActivadaEn(ahora);
            if (c.getPerdidaDesde() != null) {
                c.setPerdidaDesde(null);
                c.setRecuperadaAvisoPendiente(true);
            }
            reclamarRevision(c, ahora, despues);
        } else if (EmpresaCuentaOnvo.ACTIVA.equals(previo) && c.getPerdidaDesde() == null) {
            c.setPerdidaDesde(ahora);
            c.setAvisosPerdida(0);
            c.setUltimoAvisoPerdidaEn(null);
            c.setRecuperadaAvisoPendiente(false);
            log.warn("[onvo-cuentas] Cuenta perdió ACTIVA empresa={} estado={}", c.getEmpresaId(), c.getEstado());
        }
    }

    /** Negocio por fases pendiente de aprobación con cuenta ACTIVA: avisa al admin UNA vez (claim atómico en BD). */
    private void reclamarRevision(EmpresaCuentaOnvo c, LocalDateTime ahora, java.util.List<Runnable> despues) {
        if (altaFases == null || avisos == null || c.getRevisionAvisoEn() != null) return;
        Empresa e = empresaRepository.findById(c.getEmpresaId()).orElse(null);
        if (e == null || !e.isAltaPorFases() || !"PENDIENTE_APROBACION".equals(e.getEstadoEmpresa())) return;
        int ganado = repo.reclamarAvisoRevision(c.getId(), ahora);
        // Gane o no el claim, la entidad refleja que ya está reclamado (evita que el save lo borre).
        c.setRevisionAvisoEn(ahora);
        if (ganado == 1) {
            Long empresaId = e.getId();
            String nombre = businessName(e);
            despues.add(() -> avisos.avisarRevisionListaAdmin(empresaId, nombre));
        }
    }

    private void regenerar(EmpresaCuentaOnvo c) {
        try {
            String url = client.regenerarOnboarding(c.getOnvoAccountId());
            c.setOnboardingUrl(url);
            c.setOnboardingExpiraEn(url != null ? ahora().plus(vigenciaOnboarding) : null);
        } catch (OnvoCuentaConectadaClient.OnboardingCompletadoException e) {
            c.setOnboardingUrl(null);
            c.setOnboardingExpiraEn(null);
            c.setEstado(EmpresaCuentaOnvo.EN_APROBACION);
        } catch (RuntimeException e) {
            // No se puede regenerar: se descarta el enlace vencido para no mostrarlo; se reintenta el próximo ciclo.
            c.setOnboardingUrl(null);
            c.setUltimoError("Enlace de onboarding vencido, no se pudo regenerar: " + e.getClass().getSimpleName());
        }
    }

    boolean onboardingVencido(EmpresaCuentaOnvo c) {
        return c.getOnboardingUrl() == null || c.getOnboardingExpiraEn() == null
            || !c.getOnboardingExpiraEn().isAfter(ahora());
    }

    /** Enlace de onboarding vigente o vacío si no hay o venció. */
    public Optional<String> onboardingUrlVigente(Long empresaId) {
        return repo.findByEmpresaId(empresaId)
            .filter(c -> !onboardingVencido(c))
            .map(EmpresaCuentaOnvo::getOnboardingUrl);
    }

    /**
     * Id para onBehalfOf: solo si la cuenta está ACTIVA (confirmada por GET). En cualquier otro caso
     * null: el cobro sigue como hoy, a nombre de la plataforma (no se bloquea).
     */
    public String onBehalfOfPara(Empresa empresa) {
        if (empresa == null || empresa.getId() == null) return null;
        try {
            return repo.findByEmpresaId(empresa.getId())
                .filter(EmpresaCuentaOnvo::isActiva)
                .map(EmpresaCuentaOnvo::getOnvoAccountId)
                .orElse(null);
        } catch (RuntimeException e) {
            return null;
        }
    }

    static String mapear(String onvoStatus) {
        if (onvoStatus == null) return EmpresaCuentaOnvo.PENDIENTE_ONBOARDING;
        return switch (onvoStatus.trim().toLowerCase(Locale.ROOT)) {
            case "active" -> EmpresaCuentaOnvo.ACTIVA;
            case "awaiting_approval" -> EmpresaCuentaOnvo.EN_APROBACION;
            case "pending_onboarding" -> EmpresaCuentaOnvo.PENDIENTE_ONBOARDING;
            case "temporally_suspended", "permanently_suspended", "restricted" -> EmpresaCuentaOnvo.SUSPENDIDA;
            case "inactive", "deleted" -> EmpresaCuentaOnvo.INACTIVA;
            default -> EmpresaCuentaOnvo.INACTIVA;
        };
    }

    static String businessName(Empresa e) {
        String n = e.getNombreComercial() != null && !e.getNombreComercial().isBlank()
            ? e.getNombreComercial() : e.getNombreEmpresa();
        n = n == null || n.isBlank() ? "Negocio HotClick" : n.trim();
        return n.length() > MAX_BUSINESS_NAME ? n.substring(0, MAX_BUSINESS_NAME).trim() : n;
    }

    private LocalDateTime ahora() { return LocalDateTime.now(clock); }

    /**
     * Enlace de ONVO para que el dueño llene sus datos y verifique el depósito. Si venció, se regenera.
     * Solo devuelve https de dominios ONVO permitidos; vacío si no hay o no se pudo (no hay enlace inventado).
     */
    public Optional<String> onboardingUrlParaDueno(Long empresaId) {
        if (empresaId == null || !habilitado) return Optional.empty();
        EmpresaCuentaOnvo existente = repo.findByEmpresaId(empresaId).orElse(null);
        if (existente != null && EmpresaCuentaOnvo.ACTIVA.equals(existente.getEstado()) && existente.getPerdidaDesde() == null) {
            return Optional.empty();
        }
        if (existente == null || existente.getOnvoAccountId() == null) {
            if (existente == null) {
                EmpresaCuentaOnvo nueva = new EmpresaCuentaOnvo();
                nueva.setEmpresaId(empresaId);
                try { repo.save(nueva); } catch (RuntimeException e) { return Optional.empty(); }
            }
            intentarCrearSeguro(empresaId);
        } else if (onboardingVencido(existente)) {
            tx.execute(s -> {
                EmpresaCuentaOnvo c = repo.findById(existente.getId()).orElse(null);
                if (c != null && c.getOnvoAccountId() != null && onboardingVencido(c)) {
                    // A pedido del dueño: no toca el estado de la cuenta (a diferencia del poller, que puede pasarla a EN_APROBACION).
                    try {
                        String url = client.regenerarOnboarding(c.getOnvoAccountId());
                        c.setOnboardingUrl(url);
                        c.setOnboardingExpiraEn(url != null ? ahora().plus(vigenciaOnboarding) : null);
                    } catch (OnvoCuentaConectadaClient.OnboardingCompletadoException e) {
                        c.setOnboardingUrl(null);
                        c.setOnboardingExpiraEn(null);
                    } catch (RuntimeException e) {
                        c.setOnboardingUrl(null);
                        c.setUltimoError("Enlace de onboarding no se pudo regenerar: " + e.getClass().getSimpleName());
                    }
                    repo.save(c);
                }
                return null;
            });
        }
        return onboardingUrlVigente(empresaId)
            .filter(u -> com.hotclick.service.alta.OnboardingUrlPolicy.esPermitida(u, hostsOnboardingPermitidos));
    }
}
