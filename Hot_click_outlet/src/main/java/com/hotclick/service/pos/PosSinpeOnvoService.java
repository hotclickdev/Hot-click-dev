package com.hotclick.service.pos;

import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;

/**
 * SINPE Móvil del POS por ONVO (payment intent + método {@code mobile_number}).
 * <ul>
 *   <li>La caja pide identificación y tipo del pagador ANTES de crear el intent: ONVO solo acepta la
 *       transferencia si hay un intent en {@code processing} con la misma identificación y el mismo monto.</li>
 *   <li>Intent creado y confirmado antes de que el cliente transfiera; se muestra el destino ONVO de config
 *       ({@code onvo.sinpe-destino}) y el monto exacto de la sesión.</li>
 *   <li>El intent no vence solo en ONVO: timeout propio {@code pos.sinpe-onvo.timeout-minutos} que lo cancela.</li>
 *   <li>Pagado solo con {@code succeeded} releído por GET (monto y moneda exactos); {@code deferred}/{@code processing} = esperar.</li>
 *   <li>Fail-closed: sin ONVO, en modo simulado, sin destino o sin timeout válido, no se inicia ni se da por pagado.</li>
 * </ul>
 */
@Service
public class PosSinpeOnvoService {

    private static final Logger log = LoggerFactory.getLogger(PosSinpeOnvoService.class);

    /** Prefijo del id del intent en {@code stripe_session_id} para distinguirlo de órdenes Tilopay y checkouts. */
    public static final String PREFIJO_ONVO_PI = "ONVOPI:";

    public static final String MSG_NO_DISPONIBLE = "SINPE Móvil no está disponible por ahora. Cobrá con otro método.";
    public static final String MSG_IDENTIFICACION = "Ingresá la identificación con guiones (mínimo 12 caracteres) y su tipo.";

    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired(required = false) private OnvoService onvoService;

    /** Minutos que el intent queda abierto; sin valor válido (≥1) el SINPE del POS no se inicia. */
    @Value("${pos.sinpe-onvo.timeout-minutos:}")
    private String timeoutMinutosCrudo;

    private volatile Clock clock = Clock.system(Constants.ZONA_CR);

    void setClock(Clock clock) { this.clock = Objects.requireNonNull(clock); }
    void setOnvoServiceParaTest(OnvoService onvo) { this.onvoService = onvo; }
    void setTimeoutMinutosParaTest(String v) { this.timeoutMinutosCrudo = v; }
    void setRepoParaTest(PosQrSesionRepository repo) { this.posQrRepo = repo; }

    /** Timeout en minutos; 0 = no configurado o inválido (fail-closed). */
    int timeoutMinutos() {
        if (timeoutMinutosCrudo == null || timeoutMinutosCrudo.isBlank()) return 0;
        try {
            int v = Integer.parseInt(timeoutMinutosCrudo.trim());
            return v >= 1 && v <= PosQrSessionService.VIGENCIA_MINUTOS ? v : 0;
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /** Destino ONVO si el SINPE del POS puede cobrar ahora; "" si no (sin ONVO, simulado, sin destino o sin timeout). */
    public String destinoDisponible() {
        OnvoService onvo = onvoService;
        if (onvo == null || !onvo.isPagosDisponibles() || onvo.isMockMode() || timeoutMinutos() == 0) return "";
        String destino = onvo.sinpeDestino();
        return destino == null ? "" : destino.trim();
    }

    public static boolean esIntentOnvo(String pasarelaId) {
        return pasarelaId != null && pasarelaId.startsWith(PREFIJO_ONVO_PI) && pasarelaId.length() > PREFIJO_ONVO_PI.length();
    }

    static String intentIdDe(PosQrSesion sesion) {
        String p = sesion == null ? null : sesion.getStripeSessionId();
        return esIntentOnvo(p) ? p.substring(PREFIJO_ONVO_PI.length()) : null;
    }

    /**
     * Crea y confirma el intent ONVO para la sesión con la identificación del pagador. Si ya había un intent
     * abierto (otra identificación), se cancela primero; si no se puede cancelar, no se crea otro.
     * Sin @Transactional: el id del intent se guarda antes de confirmarlo y tiene que persistir aunque la
     * confirmación falle, para que el barrido lo encuentre y lo cancele.
     */
    public Map<String, Object> iniciar(String token, String identificacion, Integer tipoIdentificacion) {
        if (!OnvoService.identificacionSinpeValida(identificacion) || !OnvoService.tipoIdentificacionValido(tipoIdentificacion)) {
            throw new IllegalArgumentException(MSG_IDENTIFICACION);
        }
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new java.util.NoSuchElementException("QR no encontrado"));
        if (!"PENDIENTE".equals(sesion.getEstado())) {
            throw new IllegalStateException("El cobro ya no está pendiente");
        }
        if (!PosQrVentaService.estaVigente(sesion, LocalDateTime.now(clock))) {
            throw new java.util.NoSuchElementException("El QR ha expirado");
        }
        if (!PosQrMetodos.habilitado(sesion, PosQrMetodos.SINPE)) {
            throw new IllegalStateException("Este cobro no acepta SINPE Móvil");
        }
        String destino = destinoDisponible();
        Integer total = sesion.getTotal();
        if (destino.isEmpty() || total == null || total <= 0) {
            throw new IllegalStateException(MSG_NO_DISPONIBLE);
        }
        String previo = intentIdDe(sesion);
        if (previo != null && !"canceled".equalsIgnoreCase(onvoService.cancelarPaymentIntent(previo))) {
            throw new IllegalStateException("Hay un cobro SINPE abierto que no se pudo cancelar; esperá o generá un QR nuevo.");
        }
        PosQrVentaService.elegirMetodo(sesion, PosQrMetodos.SINPE);

        Map<String, String> metadata = new LinkedHashMap<>();
        metadata.put("origen", "pos-qr");
        metadata.put("posQrSesionId", String.valueOf(sesion.getId()));
        OnvoService.OnvoPaymentIntent intent = onvoService.crearPaymentIntent(total,
            "Cobro POS " + PosQrMetodos.numeroCobro(sesion), metadata);
        // Guardado antes de confirmar: si algo falla después, el barrido lo encuentra y lo cancela.
        LocalDateTime ahora = LocalDateTime.now(clock);
        LocalDateTime vence = ahora.plusMinutes(timeoutMinutos());
        if (sesion.getFechaExpiracion() == null || vence.isBefore(sesion.getFechaExpiracion())) {
            sesion.setFechaExpiracion(vence);
        }
        sesion.setStripeSessionId(PREFIJO_ONVO_PI + intent.id());
        posQrRepo.save(sesion);

        OnvoService.OnvoPaymentMethod metodo = onvoService.crearMetodoPagoSinpePos(identificacion, tipoIdentificacion, null);
        onvoService.confirmarPaymentIntent(intent.id(), metodo.id());
        log.info("[POS-SINPE-ONVO] Intent confirmado sesion={} vence={}", sesion.getId(), sesion.getFechaExpiracion());

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("destino", destino);
        r.put("monto", total);
        r.put("moneda", "CRC");
        r.put("expiracion", sesion.getFechaExpiracion().toString());
        return r;
    }

    /** Resultado de releer el intent en ONVO. */
    public enum EstadoIntent { PAGADO, ESPERANDO, CANCELADO, DESCONOCIDO }

    /**
     * Relee el intent por GET; nunca confía en el cuerpo del webhook. PAGADO solo con {@code succeeded},
     * monto = total × 100 y moneda CRC; {@code deferred}/{@code processing}/{@code requires_*} = esperar.
     */
    public EstadoIntent estadoIntent(PosQrSesion sesion) {
        String intentId = intentIdDe(sesion);
        OnvoService onvo = onvoService;
        if (intentId == null || onvo == null || onvo.isMockMode() || !onvo.isPagosDisponibles()
                || sesion.getTotal() == null) return EstadoIntent.DESCONOCIDO;
        Map<?, ?> pi;
        try {
            pi = onvo.obtenerPaymentIntent(intentId);
        } catch (RuntimeException e) {
            log.warn("[POS-SINPE-ONVO] No se pudo leer el intent de la sesión {}: {}", sesion.getId(), e.getMessage());
            return EstadoIntent.DESCONOCIDO;
        }
        return clasificar(pi, intentId, sesion.getTotal(), onvo.modoEsperado());
    }

    /**
     * ALTO 3: el intent tiene que traer {@code mode} igual al de la llave. Con llave live, solo live; con llave
     * test solo llega acá si ONVO está disponible, es decir en dev/test o con el opt-in
     * {@code payments.onvo.permitir-llave-test}. Sin mode o con otro modo nunca es PAGADO.
     */
    static EstadoIntent clasificar(Map<?, ?> pi, String intentId, long totalColones, String modoEsperado) {
        if (pi == null || pi.isEmpty() || !intentId.equals(String.valueOf(pi.get("id")))) return EstadoIntent.DESCONOCIDO;
        String status = String.valueOf(pi.get("status"));
        if ("canceled".equalsIgnoreCase(status) || "failed".equalsIgnoreCase(status)) return EstadoIntent.CANCELADO;
        if (!"succeeded".equalsIgnoreCase(status)) return EstadoIntent.ESPERANDO;
        Object modo = pi.get("mode");
        if (modoEsperado == null || modoEsperado.isBlank() || modo == null
                || !modoEsperado.equalsIgnoreCase(String.valueOf(modo).trim())) {
            log.error("[ALERTA-PAGO] Intent POS {} con mode={} distinto del de la llave ({}); no se usa", intentId, modo, modoEsperado);
            return EstadoIntent.DESCONOCIDO;
        }
        Object amount = pi.get("amount");
        Object currency = pi.get("currency");
        boolean montoExacto = amount instanceof Number n && n.longValue() == totalColones * 100L;
        boolean crc = currency != null && "CRC".equalsIgnoreCase(String.valueOf(currency).trim());
        if (!montoExacto || !crc) {
            log.error("[ALERTA-PAGO] Intent POS {} succeeded con monto/moneda distintos ({} {}); no se marca pagado",
                intentId, amount, currency);
            return EstadoIntent.DESCONOCIDO;
        }
        return EstadoIntent.PAGADO;
    }

    /**
     * Timeout cumplido: cancela el intent en ONVO. Devuelve true solo si ONVO confirmó {@code canceled};
     * si no, la sesión sigue pendiente (podría llegar la transferencia) y se reintenta después.
     */
    public boolean cancelarIntent(PosQrSesion sesion) {
        String intentId = intentIdDe(sesion);
        if (intentId == null) return true;
        OnvoService onvo = onvoService;
        if (onvo == null) return false;
        boolean cancelado = "canceled".equalsIgnoreCase(onvo.cancelarPaymentIntent(intentId));
        if (!cancelado) log.warn("[POS-SINPE-ONVO] Intent de la sesión {} sin cancelar todavía", sesion.getId());
        return cancelado;
    }

    public LocalDateTime ahora() {
        return LocalDateTime.now(clock);
    }
}
