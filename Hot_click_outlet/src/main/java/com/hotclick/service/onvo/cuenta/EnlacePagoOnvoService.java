package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.EnlacePagoOnvo;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.EnlacePagoOnvoRepository;
import com.hotclick.service.OnvoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Enlaces de pago único de ONVO para cobrar una factura tardía de un negocio. Se crean a nombre de HotClick
 * (sin onBehalfOf). El pago lo confirma siempre una relectura por GET a ONVO, nunca el cuerpo del webhook.
 * La cancelación expira la sesión en ONVO y es fail-closed: sin confirmación de ONVO el enlace sigue CREADO.
 */
@Service
public class EnlacePagoOnvoService {

    private static final Logger log = LoggerFactory.getLogger(EnlacePagoOnvoService.class);

    public static final int MONTO_MIN_CRC = 1_000;
    public static final int MONTO_MAX_CRC = 10_000_000;
    public static final int MOTIVO_MIN = 5;
    public static final int MOTIVO_MAX = 200;
    static final String TIPO_METADATA = "ENLACE_FACTURA_TARDIA";

    /** Resultado del webhook checkout-session.succeeded para una sesión. */
    public enum ResultadoWebhook { NO_ES_ENLACE, PAGADO, DUPLICADO, NO_VERIFICADO, NO_CONSULTABLE }

    /** Conflicto de negocio (409): enlace ya abierto, no cancelable, ONVO sin confirmar. */
    public static class EnlaceConflictoException extends RuntimeException {
        public EnlaceConflictoException(String m) { super(m); }
    }

    private final EnlacePagoOnvoRepository repo;
    private final EmpresaRepository empresaRepository;
    private final OnvoService onvoService;
    private final OnvoPaymentProvider provider;
    private final String appUrl;
    private final int lote;

    public EnlacePagoOnvoService(EnlacePagoOnvoRepository repo, EmpresaRepository empresaRepository,
                                 OnvoService onvoService, OnvoPaymentProvider provider,
                                 @Value("${app.url:http://localhost:3000}") String appUrl,
                                 @Value("${onvo.enlaces.lote:50}") int lote) {
        this.repo = repo;
        this.empresaRepository = empresaRepository;
        this.onvoService = onvoService;
        this.provider = provider;
        this.appUrl = appUrl;
        this.lote = lote;
    }

    /** El monto y el motivo se validan acá (servidor); el cliente nunca decide más que esos dos datos. */
    public EnlacePagoOnvo crear(Long empresaId, Integer montoCrc, String motivo) {
        if (montoCrc == null || montoCrc < MONTO_MIN_CRC || montoCrc > MONTO_MAX_CRC) {
            throw new IllegalArgumentException("El monto debe estar entre " + MONTO_MIN_CRC + " y " + MONTO_MAX_CRC + " colones");
        }
        String m = motivo == null ? "" : motivo.trim();
        if (m.length() < MOTIVO_MIN || m.length() > MOTIVO_MAX) {
            throw new IllegalArgumentException("El motivo debe tener entre " + MOTIVO_MIN + " y " + MOTIVO_MAX + " caracteres");
        }
        if (empresaId == null || !empresaRepository.existsById(empresaId)) {
            throw new IllegalArgumentException("Empresa no encontrada");
        }
        if (!repo.findByEmpresaIdAndEstado(empresaId, EnlacePagoOnvo.CREADO).isEmpty()) {
            throw new EnlaceConflictoException("El negocio ya tiene un enlace de pago abierto. Cancelalo o esperá a que se pague.");
        }
        OnvoService.OnvoCheckoutSession sesion = onvoService.crearCheckoutSession(
            montoCrc, m, appUrl + "/admin?enlacePago=ok", appUrl + "/admin?enlacePago=cancelado", null,
            Map.of("tipo", TIPO_METADATA, "empresaId", String.valueOf(empresaId)));
        EnlacePagoOnvo e = new EnlacePagoOnvo();
        e.setEmpresaId(empresaId);
        e.setMontoCrc(montoCrc);
        e.setMotivo(m);
        e.setOnvoSessionId(sesion.id());
        e.setUrl(sesion.url());
        try {
            e = repo.save(e);
        } catch (RuntimeException ex) {
            log.error("[onvo-enlace] Sesión creada en ONVO pero no se pudo guardar empresa={} sesion={}",
                empresaId, OnvoService.enmascarar(sesion.id()));
            provider.expirarSesionParaCancelar(sesion.id());
            throw ex;
        }
        log.info("[onvo-enlace] Enlace creado id={} empresa={} monto={}", e.getId(), empresaId, montoCrc);
        return e;
    }

    /** Cancela (expire en ONVO). Si ONVO no confirma, el enlace sigue CREADO y se avisa. */
    public EnlacePagoOnvo cancelar(Long enlaceId) {
        EnlacePagoOnvo e = repo.findById(enlaceId).orElseThrow(() -> new IllegalArgumentException("Enlace no encontrado"));
        if (!e.abierto()) throw new EnlaceConflictoException("El enlace ya está " + e.getEstado());
        boolean expirada;
        try {
            expirada = provider.expirarSesionParaCancelar(e.getOnvoSessionId());
        } catch (RuntimeException ex) {
            log.warn("[onvo-enlace] Expire falló id={}: {}", enlaceId, ex.getClass().getSimpleName());
            throw new EnlaceConflictoException("ONVO no respondió; el enlace sigue abierto. Reintentá.");
        }
        if (!expirada) {
            // Posible carrera: se pagó justo antes de cancelar. Se relee para no dejar un pago sin registrar.
            if (confirmarPagadoPorGet(e) == ResultadoWebhook.PAGADO) {
                throw new EnlaceConflictoException("El enlace ya fue pagado; no se puede cancelar.");
            }
            throw new EnlaceConflictoException("ONVO no confirmó la cancelación; el enlace sigue abierto.");
        }
        e.setEstado(EnlacePagoOnvo.CANCELADO);
        e.setCerradoEn(LocalDateTime.now());
        log.info("[onvo-enlace] Enlace cancelado id={}", enlaceId);
        return repo.save(e);
    }

    /**
     * Hook para cuando exista la recepción de facturas: cancela los enlaces abiertos de la empresa porque la
     * factura llegó a tiempo. Nunca lanza; devuelve cuántos quedaron cancelados.
     */
    public int alRecibirFactura(Long empresaId) {
        int n = 0;
        for (EnlacePagoOnvo e : repo.findByEmpresaIdAndEstado(empresaId, EnlacePagoOnvo.CREADO)) {
            try {
                if (cancelar(e.getId()).getEstado().equals(EnlacePagoOnvo.CANCELADO)) n++;
            } catch (RuntimeException ex) {
                log.warn("[onvo-enlace] No se pudo cancelar id={} al recibir factura: {}", e.getId(), ex.getClass().getSimpleName());
            }
        }
        return n;
    }

    /** Webhook checkout-session.succeeded: idempotente; solo marca PAGADO si ONVO confirma paid por GET. */
    public ResultadoWebhook confirmarPorWebhook(String sessionId) {
        EnlacePagoOnvo e = repo.findByOnvoSessionId(sessionId).orElse(null);
        if (e == null) return ResultadoWebhook.NO_ES_ENLACE;
        if (EnlacePagoOnvo.PAGADO.equals(e.getEstado())) return ResultadoWebhook.DUPLICADO;
        return confirmarPagadoPorGet(e);
    }

    private ResultadoWebhook confirmarPagadoPorGet(EnlacePagoOnvo e) {
        Map<?, ?> sesion;
        try {
            sesion = onvoService.obtenerCheckoutSession(e.getOnvoSessionId());
        } catch (RuntimeException ex) {
            return ResultadoWebhook.NO_CONSULTABLE;
        }
        if (sesion == null || sesion.isEmpty()) return ResultadoWebhook.NO_CONSULTABLE;
        if (!"paid".equalsIgnoreCase(String.valueOf(sesion.get("paymentStatus")))) return ResultadoWebhook.NO_VERIFICADO;
        if (!EnlacePagoOnvo.CREADO.equals(e.getEstado())) {
            log.warn("[onvo-enlace] Pago recibido en un enlace {}: id={}", e.getEstado(), e.getId());
        }
        e.setEstado(EnlacePagoOnvo.PAGADO);
        e.setPagadoEn(LocalDateTime.now());
        e.setCerradoEn(e.getPagadoEn());
        repo.save(e);
        log.info("[onvo-enlace] Enlace pagado id={} empresa={}", e.getId(), e.getEmpresaId());
        return ResultadoWebhook.PAGADO;
    }

    /** Red de seguridad si el webhook se pierde: relee los abiertos y los cierra como PAGADO o EXPIRADO. */
    public void conciliar() {
        for (EnlacePagoOnvo e : repo.findByEstadoOrderByCreadoEnAsc(EnlacePagoOnvo.CREADO, PageRequest.of(0, lote))) {
            try {
                Map<?, ?> s = onvoService.obtenerCheckoutSession(e.getOnvoSessionId());
                if (s == null || s.isEmpty()) continue;
                if ("paid".equalsIgnoreCase(String.valueOf(s.get("paymentStatus")))) {
                    confirmarPagadoPorGet(e);
                } else if ("expired".equalsIgnoreCase(String.valueOf(s.get("status")))) {
                    e.setEstado(EnlacePagoOnvo.EXPIRADO);
                    e.setCerradoEn(LocalDateTime.now());
                    repo.save(e);
                }
            } catch (RuntimeException ex) {
                log.warn("[onvo-enlace] Conciliación falló id={}: {}", e.getId(), ex.getClass().getSimpleName());
            }
        }
    }

    public List<EnlacePagoOnvo> listar(Long empresaId) {
        return repo.findByEmpresaIdOrderByCreadoEnDesc(empresaId);
    }

    /** Solo los abiertos de la empresa de la sesión (aviso al negocio). */
    public List<EnlacePagoOnvo> abiertosDe(Long empresaId) {
        return repo.findByEmpresaIdAndEstado(empresaId, EnlacePagoOnvo.CREADO);
    }
}
