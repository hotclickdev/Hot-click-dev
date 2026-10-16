package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.service.TurnstileFormGuard;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Defensas del checkout de invitado (SEG-F / P6-01 y PAG-4 / QA-CONC-2), fuera de la transacción:
 * <ol>
 *   <li><b>Turnstile</b> opcional: solo si {@code hotclick.checkout.turnstile.habilitado=true}; sin claves
 *       {@link TurnstileFormGuard} deja pasar (fail-open del proyecto).</li>
 *   <li><b>Idempotencia</b>: header {@code Idempotency-Key} o, si falta, huella de IP + correo + carrito.
 *       Dos POST iguales dentro de {@code ventana-idempotencia-seg} devuelven la misma respuesta y crean un solo pedido.</li>
 *   <li><b>Cupo de reservas</b>: por IP y por correo, unidades en pedidos todavía pendientes de pago dentro de
 *       {@code ventana-minutos}; y tope de unidades por producto en un solo checkout. Excedido → 429.</li>
 * </ol>
 * Estado en memoria por instancia (hoy una sola en Lightsail), igual que {@link ReservaAntiBotService}.
 */
@Service
public class GuestCheckoutGuard {

    public static final String MSG_CUPO = "Llegaste al máximo de unidades reservadas sin pagar. Pagá o cancelá un pedido pendiente e intentá de nuevo.";
    public static final String MSG_TOPE_PRODUCTO = "Como invitado podés reservar hasta %d unidades de un mismo producto. Iniciá sesión para comprar más.";
    private static final Set<String> PENDIENTES = Set.of(
        Constants.PEDIDO_PENDIENTE, Constants.PEDIDO_PENDIENTE_COMPROBANTE, Constants.PEDIDO_PENDIENTE_APROBACION);
    private static final int MAX_CLAVES = 100_000;

    private final TurnstileFormGuard turnstile;
    private final ClientIpResolver ipResolver;
    private final PedidoRepository pedidoRepository;

    @Value("${hotclick.checkout.turnstile.habilitado:false}")
    private boolean turnstileHabilitado = false;
    @Value("${hotclick.checkout.invitado.max-unidades-por-producto:3}")
    private int maxPorProducto = 3;
    @Value("${hotclick.checkout.invitado.max-unidades-pendientes:6}")
    private int maxPendientes = 6;
    @Value("${hotclick.checkout.invitado.ventana-minutos:30}")
    private int ventanaMinutos = 30;
    @Value("${hotclick.checkout.invitado.ventana-idempotencia-seg:120}")
    private int ventanaIdemSeg = 120;

    private volatile Clock clock = Clock.systemUTC();

    record Reserva(Instant cuando, Long pedidoId, int unidades) {}
    record EnCurso(Instant cuando, CompletableFuture<ResponseEntity<ResponseDTO>> resultado) {}

    private final Map<String, Deque<Reserva>> reservas = new ConcurrentHashMap<>();
    private final Map<String, EnCurso> idempotencia = new ConcurrentHashMap<>();

    public GuestCheckoutGuard(TurnstileFormGuard turnstile, ClientIpResolver ipResolver, PedidoRepository pedidoRepository) {
        this.turnstile = turnstile;
        this.ipResolver = ipResolver;
        this.pedidoRepository = pedidoRepository;
    }

    /** Solo tests. */
    void setClock(Clock clock) { this.clock = Objects.requireNonNull(clock); }
    /** Solo tests. */
    void setTurnstileHabilitado(boolean v) { this.turnstileHabilitado = v; }

    public ResponseEntity<ResponseDTO> ejecutar(PaymentCheckoutRequest req, HttpServletRequest http,
                                                Supplier<ResponseEntity<ResponseDTO>> checkout) {
        if (turnstileHabilitado && !turnstile.verificado(req.getTurnstileToken(), http)) {
            return ResponseEntity.badRequest().body(ResponseDTO.error(TurnstileFormGuard.MSG_ANTI_BOT));
        }
        String ip = http != null ? ipResolver.resolve(http) : null;
        String correo = req.getGuestEmail() != null ? req.getGuestEmail().trim().toLowerCase(Locale.ROOT) : "";
        String clave = claveIdempotencia(http, ip, correo, req);

        Instant ahora = clock.instant();
        purgarIdempotencia(ahora);
        CompletableFuture<ResponseEntity<ResponseDTO>> mio = new CompletableFuture<>();
        EnCurso previo = idempotencia.putIfAbsent(clave, new EnCurso(ahora, mio));
        if (previo != null) return previo.resultado().join();

        ResponseEntity<ResponseDTO> respuesta;
        try {
            respuesta = conCupo(req, ip, correo, checkout);
        } catch (RuntimeException e) {
            idempotencia.remove(clave);
            mio.completeExceptionally(e);
            throw e;
        }
        if (!respuesta.getStatusCode().is2xxSuccessful()) idempotencia.remove(clave);
        mio.complete(respuesta);
        return respuesta;
    }

    private ResponseEntity<ResponseDTO> conCupo(PaymentCheckoutRequest req, String ip, String correo,
                                                Supplier<ResponseEntity<ResponseDTO>> checkout) {
        Map<Long, Integer> porProducto = new java.util.HashMap<>();
        int unidades = 0;
        for (PaymentCheckoutRequest.ItemDTO i : req.getItems() != null ? req.getItems() : List.<PaymentCheckoutRequest.ItemDTO>of()) {
            int c = i.getCantidad() != null ? i.getCantidad() : 0;
            unidades += c;
            if (i.getProductoId() != null) porProducto.merge(i.getProductoId(), c, Integer::sum);
        }
        if (porProducto.values().stream().anyMatch(c -> c > maxPorProducto)) {
            return ResponseEntity.status(429).body(ResponseDTO.error(String.format(MSG_TOPE_PRODUCTO, maxPorProducto)));
        }
        List<String> claves = new ArrayList<>(2);
        if (ip != null && !ip.isBlank()) claves.add("ip:" + ip);
        if (!correo.isBlank()) claves.add("mail:" + correo);
        for (String k : claves) {
            if (unidadesPendientes(k) + unidades > maxPendientes) {
                return ResponseEntity.status(429).body(ResponseDTO.error(MSG_CUPO));
            }
        }
        ResponseEntity<ResponseDTO> r = checkout.get();
        Long pedidoId = r.getStatusCode().is2xxSuccessful() && r.getBody() != null
            && r.getBody().getData() instanceof PaymentCheckoutResponse pc ? pc.getPedidoId() : null;
        if (pedidoId != null) {
            Reserva nueva = new Reserva(clock.instant(), pedidoId, unidades);
            for (String k : claves) {
                Deque<Reserva> cola = reservas.computeIfAbsent(k, x -> new ArrayDeque<>());
                synchronized (cola) { cola.addLast(nueva); }
            }
        }
        return r;
    }

    private int unidadesPendientes(String clave) {
        Deque<Reserva> cola = reservas.get(clave);
        if (cola == null) return 0;
        Instant desde = clock.instant().minusSeconds(ventanaMinutos * 60L);
        List<Reserva> vigentes;
        synchronized (cola) {
            while (!cola.isEmpty() && cola.peekFirst().cuando().isBefore(desde)) cola.pollFirst();
            vigentes = new ArrayList<>(cola);
        }
        if (vigentes.isEmpty()) {
            if (reservas.size() > MAX_CLAVES) reservas.remove(clave);
            return 0;
        }
        List<Long> ids = vigentes.stream().map(Reserva::pedidoId).distinct().toList();
        Set<Long> pendientes = new java.util.HashSet<>();
        for (Pedido p : pedidoRepository.findAllById(ids)) {
            if (PENDIENTES.contains(p.getEstadoPedido())) pendientes.add(p.getId());
        }
        return vigentes.stream().filter(v -> pendientes.contains(v.pedidoId())).mapToInt(Reserva::unidades).sum();
    }

    private void purgarIdempotencia(Instant ahora) {
        Instant limite = ahora.minusSeconds(ventanaIdemSeg);
        idempotencia.entrySet().removeIf(e -> e.getValue().cuando().isBefore(limite) && e.getValue().resultado().isDone());
    }

    static String claveIdempotencia(HttpServletRequest http, String ip, String correo, PaymentCheckoutRequest req) {
        String header = http != null ? http.getHeader("Idempotency-Key") : null;
        if (header != null && !header.isBlank() && header.length() <= 128) return "k:" + header.trim();
        StringBuilder sb = new StringBuilder().append(ip).append('|').append(correo).append('|')
            .append(req.getBodegaId()).append('|').append(req.getMetodoEnvio()).append('|')
            .append(req.getProvider()).append('|').append(req.getCodigoCupon()).append('|');
        if (req.getItems() != null) {
            req.getItems().stream()
                .sorted(java.util.Comparator.comparing(i -> String.valueOf(i.getProductoId())))
                .forEach(i -> sb.append(i.getProductoId()).append('x').append(i.getCantidad()).append(';'));
        }
        return "h:" + sha(sb.toString());
    }

    private static String sha(String s) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
