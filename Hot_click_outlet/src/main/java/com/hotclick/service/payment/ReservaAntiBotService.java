package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.ClientIpResolver;
import com.hotclick.utils.Constants;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Regla anti-bot de reservas de stock (QA-CONC-4).
 *
 * <p>Si un mismo identificador reserva más de {@code max-unidades} unidades en reservas
 * todavía activas dentro de una ventana de {@code ventana-minutos}, se trata como actividad
 * no humana: todas sus reservas activas de la ventana quedan marcadas para liberarse
 * {@code liberar-en-minutos} después. No se bloquea el checkout: la request sigue igual y la
 * liberación la hace el scheduler de expiración de pagos ({@link ReservaSospechosaLiberador}).
 *
 * <p><b>Identificador:</b> usuario logueado → su id; invitado → la IP del cliente (la misma
 * que usa el rate limit, vía {@link ClientIpResolver}). El correo del invitado no sirve: lo
 * elige el atacante. Si no hay IP (llamada fuera de una request) se usa el id del usuario
 * invitado resuelto por correo/teléfono.
 *
 * <p><b>Qué se cuenta:</b> unidades (suma de {@code cantidad}), no líneas, de las reservas del
 * identificador cuyo pago sigue {@code PENDIENTE}.
 *
 * <p><b>Marca:</b> {@code Pago.fechaExpiracion} se adelanta a {@code ahora + liberar-en}. Sin
 * columnas nuevas.
 *
 * <p><b>Excluidos:</b> usuarios con rol ADMIN, el vendedor comprando en su propio negocio y
 * los cobros de un QR de POS ({@code posQrToken}). Las ventas de POS directas no pasan por acá.
 *
 * <p><b>Estado en memoria</b> por instancia (hoy hay una sola, Lightsail). Con varias réplicas
 * cada una cuenta lo suyo; un reinicio vacía los contadores (las marcas ya puestas quedan en BD).
 */
@Service
public class ReservaAntiBotService {

    private static final Logger log = LoggerFactory.getLogger(ReservaAntiBotService.class);
    private static final int MAX_IDENTIFICADORES = 100_000;
    private static final int PURGAR_CADA = 500;

    private final PagoRepository pagoRepository;
    private final ClientIpResolver clientIpResolver;

    @Value("${hotclick.reservas.antibot.habilitado:true}")
    private boolean habilitado = true;
    @Value("${hotclick.reservas.antibot.max-unidades:10}")
    private int maxUnidades = 10;
    @Value("${hotclick.reservas.antibot.ventana-minutos:15}")
    private int ventanaMinutos = 15;
    @Value("${hotclick.reservas.antibot.liberar-en-minutos:15}")
    private int liberarEnMinutos = 15;

    private volatile Clock clock = Clock.system(Constants.ZONA_CR);

    record Registro(LocalDateTime cuando, Long pagoId, int unidades) {}

    private final Map<String, Deque<Registro>> registros = new ConcurrentHashMap<>();
    private final AtomicInteger contador = new AtomicInteger();

    public ReservaAntiBotService(PagoRepository pagoRepository, ClientIpResolver clientIpResolver) {
        this.pagoRepository = pagoRepository;
        this.clientIpResolver = clientIpResolver;
    }

    /** Hora "ahora" de la regla y del scheduler de expiración (reloj controlable en tests). */
    public LocalDateTime ahora() {
        return LocalDateTime.now(clock);
    }

    /** Solo tests. */
    public void setClock(Clock clock) {
        this.clock = Objects.requireNonNull(clock);
    }

    /** Solo tests. */
    public void limpiar() {
        registros.clear();
    }

    public int getLiberarEnMinutos() { return liberarEnMinutos; }
    public int getVentanaMinutos() { return ventanaMinutos; }

    /**
     * Registra una reserva recién creada (pago pendiente) y, si el identificador supera el
     * umbral, marca sus reservas activas de la ventana. Nunca rompe el checkout.
     */
    public void registrar(Usuario usuario, boolean invitado, PaymentCheckoutRequest req,
                          List<Pedido> pedidos, Pago pago) {
        if (!habilitado || pago == null || pago.getId() == null || req == null || req.getItems() == null) return;
        try {
            if (excluido(usuario, invitado, req, pedidos)) return;
            String clave = identificador(usuario, invitado);
            if (clave == null) return;
            int unidades = req.getItems().stream()
                .mapToInt(i -> i.getCantidad() != null ? i.getCantidad() : 0).sum();
            evaluar(clave, new Registro(ahora(), pago.getId(), unidades), pago);
        } catch (RuntimeException e) {
            log.error("[reserva-antibot] no se pudo evaluar la regla: {}", e.getClass().getSimpleName());
        }
    }

    private void evaluar(String clave, Registro nuevo, Pago pagoActual) {
        LocalDateTime desde = nuevo.cuando().minusMinutes(ventanaMinutos);
        List<Registro> enVentana;
        Deque<Registro> cola = registros.computeIfAbsent(clave, k -> new ArrayDeque<>());
        synchronized (cola) {
            while (!cola.isEmpty() && cola.peekFirst().cuando().isBefore(desde)) cola.pollFirst();
            cola.addLast(nuevo);
            enVentana = new ArrayList<>(cola);
        }
        purgarSiToca(desde);

        List<Long> ids = enVentana.stream().map(Registro::pagoId).distinct().toList();
        Set<Long> activos = Set.copyOf(pagoRepository.findIdsPendientesIn(ids));
        int unidadesActivas = enVentana.stream()
            .filter(r -> activos.contains(r.pagoId())).mapToInt(Registro::unidades).sum();
        if (unidadesActivas <= maxUnidades) return;

        LocalDateTime liberarEn = nuevo.cuando().plusMinutes(liberarEnMinutos);
        int marcadas = 0;
        for (Pago p : pagoRepository.findAllById(activos)) {
            if (marcar(p, liberarEn)) marcadas++;
        }
        if (activos.contains(pagoActual.getId()) && marcar(pagoActual, liberarEn)) marcadas++;
        log.warn("[reserva-antibot] posible bot id={} unidades={} reservas={} en {} min (umbral {}): {} reservas se liberan en {} min",
            huella(clave), unidadesActivas, activos.size(), ventanaMinutos, maxUnidades, marcadas, liberarEnMinutos);
    }

    private static boolean marcar(Pago p, LocalDateTime liberarEn) {
        if (!Constants.PAGO_PENDIENTE.equals(p.getEstadoPago())) return false;
        if (p.getFechaExpiracion() != null && !p.getFechaExpiracion().isAfter(liberarEn)) return false;
        p.setFechaExpiracion(liberarEn);
        return true;
    }

    private boolean excluido(Usuario usuario, boolean invitado, PaymentCheckoutRequest req, List<Pedido> pedidos) {
        if (req.getPosQrToken() != null && !req.getPosQrToken().isBlank()) return true;
        if (invitado || usuario == null) return false;
        if (usuario.getRoles() != null && usuario.getRoles().stream()
                .map(Rol::getNombreRol).anyMatch(Constants.ROL_ADMIN::equals)) return true;
        Long empresaUsuario = usuario.getEmpresa() != null ? usuario.getEmpresa().getId() : null;
        return empresaUsuario != null && pedidos != null && !pedidos.isEmpty() && pedidos.stream()
            .allMatch(p -> p.getEmpresa() != null && empresaUsuario.equals(p.getEmpresa().getId()));
    }

    private String identificador(Usuario usuario, boolean invitado) {
        if (!invitado && usuario != null && usuario.getId() != null) return "u:" + usuario.getId();
        String ip = ipActual();
        if (ip != null && !ip.isBlank()) return "ip:" + ip;
        return usuario != null && usuario.getId() != null ? "u:" + usuario.getId() : null;
    }

    private String ipActual() {
        if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) return null;
        HttpServletRequest request = attrs.getRequest();
        return clientIpResolver.resolve(request);
    }

    private void purgarSiToca(LocalDateTime desde) {
        if (contador.incrementAndGet() % PURGAR_CADA != 0 && registros.size() < MAX_IDENTIFICADORES) return;
        registros.entrySet().removeIf(e -> {
            Deque<Registro> c = e.getValue();
            synchronized (c) {
                return c.isEmpty() || c.peekLast().cuando().isBefore(desde);
            }
        });
    }

    /** Huella corta del identificador para el log (sin IP ni id en claro). */
    static String huella(String clave) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(clave.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(h, 0, 6);
        } catch (Exception e) {
            return "?";
        }
    }
}
