package com.hotclick.service.suscripcion;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

/**
 * Política del primer mes gratis de PYME / NEGOCIO_PLUS: una sola vez por negocio, sin cupo, y sin perder nunca los
 * días que le queden del trial Emprendedor.
 *
 * <p>Elegible = plan en la lista, N &gt; 0, nunca marcado, SIN historial de plan de pago (PYME/NEGOCIO_PLUS que se
 * haya activado alguna vez, o plan actual de pago) y NO en impago (tienda suspendida o plan PAST_DUE / VENCIDO: esos
 * pagan de inmediato). La marca se escribe con un UPDATE condicional, nunca con {@code save()} de la entidad.
 */
@Service
public class TrialPlanesPagoService {

    private static final Logger log = LoggerFactory.getLogger(TrialPlanesPagoService.class);
    private static final Set<String> PLANES_DE_PAGO = Set.of("PYME", "NEGOCIO_PLUS");
    private static final Set<String> ESTADOS_PLAN_IMPAGO = Set.of("PAST_DUE", "VENCIDO");

    private final TrialPlanesPagoConfig config;
    private final EmpresaRepository empresaRepo;
    private final SuscripcionRepository suscripcionRepo;

    @Autowired(required = false)
    private AuditoriaAdminRegistroService auditoria;

    @Autowired(required = false)
    private CacheManager cacheManager;

    @Autowired
    public TrialPlanesPagoService(TrialPlanesPagoConfig config, EmpresaRepository empresaRepo,
                                  SuscripcionRepository suscripcionRepo) {
        this.config = config;
        this.empresaRepo = empresaRepo;
        this.suscripcionRepo = suscripcionRepo;
    }

    /** Solo política en memoria (tests): sin consulta de historial ni escritura. */
    public TrialPlanesPagoService(TrialPlanesPagoConfig config) {
        this(config, null, null);
    }

    /** true si el plan está en la lista, hay días y el negocio cumple todas las condiciones de elegibilidad. */
    public boolean elegible(Empresa empresa, String planDestino) {
        if (empresa == null || config.diasOferta(planDestino) <= 0 || empresa.getPrimerMesGratisUsadoEn() != null) {
            return false;
        }
        if (SuspensionImpago.estaSuspendida(empresa.getEstadoEmpresa())
            || ESTADOS_PLAN_IMPAGO.contains(String.valueOf(empresa.getEstadoPlan()))) {
            return false;
        }
        return !tieneHistorialDePago(empresa);
    }

    private boolean tieneHistorialDePago(Empresa empresa) {
        String actual = empresa.getPlanSaas() == null ? "" : empresa.getPlanSaas().toUpperCase(Locale.ROOT);
        if (PLANES_DE_PAGO.contains(actual)) return true;
        return suscripcionRepo != null && empresa.getId() != null && suscripcionRepo.tuvoPlanDePago(empresa.getId());
    }

    /** Disponibilidad para el panel: el negocio recibiría el mes gratis en algún plan configurado. */
    public boolean disponible(Empresa empresa) {
        return config.planes().stream().anyMatch(p -> elegible(empresa, p));
    }

    /**
     * Días de trial para un alta de plan de pago: si es elegible, max(días que quedan de Emprendedor, N); si no, solo
     * los días de Emprendedor que queden (comportamiento previo, nunca se pierden). 0 = cobro inmediato.
     */
    public int diasTrial(Empresa empresa, String planDestino, LocalDate hoy) {
        return aplicar(empresa, planDestino, TrialEmprendedorService.diasRestantes(empresa, hoy));
    }

    /** Igual que {@link #diasTrial} pero partiendo de unos días base (Emprendedor o de la suscripción vieja), una sola vez. */
    public int aplicar(Empresa empresa, String planDestino, int diasBase) {
        return elegible(empresa, planDestino) ? Math.max(diasBase, config.dias()) : diasBase;
    }

    /** Días configurados (N) del primer mes gratis. */
    public int diasConfigurados() {
        return config.dias();
    }

    /** Marca incondicional bajo el lock del alta (UPDATE condicional en BD; la entidad en memoria también). */
    public void marcarUsado(Empresa empresa) {
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        empresa.setPrimerMesGratisUsadoEn(ahora);
        if (empresaRepo != null && empresa.getId() != null) {
            int filas = empresaRepo.marcarPrimerMesGratis(empresa.getId(), ahora);
            if (filas == 0) {
                log.warn("[primer-mes-gratis] la marca ya estaba escrita empresa={}", empresa.getId());
            }
        }
    }

    /**
     * Marca que el negocio ya recibió el primer mes gratis (si el plan era elegible y se concedieron días). UPDATE
     * condicional {@code WHERE primer_mes_gratis_usado_en IS NULL}; la entidad en memoria se actualiza igual.
     */
    public boolean marcarSiCorresponde(Empresa empresa, String planDestino, int diasConcedidos) {
        if (diasConcedidos <= 0 || !elegible(empresa, planDestino)) return false;
        marcarUsado(empresa);
        return true;
    }

    /**
     * Soporte: libera la marca de un negocio (p. ej. abandonó antes de guardar la tarjeta). Motivo obligatorio y
     * asiento de auditoría. Devuelve true si había marca. La elegibilidad igual exige no tener historial de pago.
     */
    @Transactional
    public boolean liberarMarca(Long empresaId, String motivo) {
        if (empresaId == null || motivo == null || motivo.isBlank()) {
            throw new IllegalArgumentException("El motivo es obligatorio.");
        }
        empresaRepo.findById(empresaId)
            .orElseThrow(() -> new java.util.NoSuchElementException("Empresa no encontrada"));
        boolean habia = empresaRepo.limpiarPrimerMesGratis(empresaId) > 0;
        if (auditoria != null) {
            auditoria.registrar("PRIMER_MES_GRATIS_LIBERAR", "Empresa", empresaId, empresaId,
                (habia ? "Marca liberada. " : "Sin marca previa. ") + "Motivo: " + motivo.trim());
        }
        if (cacheManager != null) {
            Cache c = cacheManager.getCache("tenantInfo");
            if (c != null) c.evict(empresaId);
        }
        log.info("[primer-mes-gratis] marca liberada por admin empresa={} habia={}", empresaId, habia);
        return habia;
    }
}
