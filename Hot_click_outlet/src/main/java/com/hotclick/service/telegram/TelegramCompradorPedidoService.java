package com.hotclick.service.telegram;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoEntrega;
import com.hotclick.model.Producto;
import com.hotclick.model.TelegramCompradorSesion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoEntregaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TelegramCompradorSesionRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Convierte el carrito del comprador en un pedido con pago ONVO (SANDBOX) reutilizando el checkout de invitado
 * ({@link PaymentService#checkout}): reserva de stock, cobro, vencimiento y liberación son los de la tienda web.
 * El bot NUNCA recibe datos de tarjeta: solo manda el enlace de pago hospedado.
 */
@Service
public class TelegramCompradorPedidoService {

    private static final Logger log = LoggerFactory.getLogger(TelegramCompradorPedidoService.class);

    public static final String MSG_NO_DISPONIBLE =
        "Los pedidos por Telegram todavía no están disponibles. Podés comprar desde la tienda en línea.";

    /** Resultado de iniciar el pago: mensaje de error apto para el comprador, o el enlace de pago. */
    public record Inicio(boolean ok, String mensaje, String numeroPedido, String urlPago, int total) {
        static Inicio error(String m) { return new Inicio(false, m, null, null, 0); }
    }

    @Autowired private PaymentService paymentService;
    @Autowired private OnvoService onvoService;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PedidoEntregaRepository entregaRepository;
    @Autowired private PedidoGrupoService pedidoGrupoService;
    @Autowired private TelegramCompradorSesionRepository sesionRepository;
    @Autowired private GuestCancelTokenService guestCancelTokenService;
    @Autowired private PlatformTransactionManager transactionManager;

    @Value("${telegram.comprador.habilitado:false}")
    private boolean habilitado;

    /** Gate fail-closed: flag encendida Y ONVO en sandbox. Nada de cobros reales por este canal. */
    public boolean pagosPermitidos() {
        return habilitado && onvoService.esSandbox();
    }

    /** ¿Alguna bodega activa de la tienda permite retiro? (misma regla que el checkout de tienda). */
    public boolean ofreceRetiro(Long empresaId) {
        List<Bodega> bodegas = bodegaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        return bodegas != null && bodegas.stream().anyMatch(b -> Boolean.TRUE.equals(b.getPermiteRetiroCliente()));
    }

    /** Crea el pedido PENDIENTE con stock reservado y la sesión de pago ONVO. */
    public Inicio iniciarPago(TelegramCompradorSesion sesion, TelegramCompradorCtx c) {
        if (!pagosPermitidos()) return Inicio.error(MSG_NO_DISPONIBLE);
        if (c.carrito.isEmpty()) return Inicio.error("Tu carrito está vacío.");
        Long empresaId = sesion.getEmpresaId();
        String error = revisarCarrito(empresaId, c);
        if (error != null) return Inicio.error(error);

        PaymentCheckoutRequest req = armarRequest(c);
        // El anti-bot de reservas identifica al invitado por IP; en el webhook la IP es la de Telegram (la misma
        // para todos los compradores). Sin request en el hilo cae al id del usuario invitado: un identificador por comprador.
        RequestAttributes previo = RequestContextHolder.getRequestAttributes();
        Long tenantPrevio = TenantContext.get();
        RequestContextHolder.resetRequestAttributes();
        TenantContext.set(empresaId);
        try {
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            return tx.execute(st -> crearPedidoYEnlazar(sesion.getChatId(), req, c));
        } catch (com.hotclick.exception.StockInsuficienteException e) {
            return Inicio.error("Se agotó el stock de alguno de los productos. Revisá tu carrito.");
        } catch (IllegalArgumentException | IllegalStateException | com.hotclick.exception.RecursoNoEncontradoException e) {
            log.info("[telegram-comprador] checkout rechazado ({})", e.getClass().getSimpleName());
            return Inicio.error(mensajePublico(e));
        } catch (RuntimeException e) {
            log.warn("[telegram-comprador] checkout falló ({})", e.getClass().getSimpleName());
            return Inicio.error("No pude crear tu pedido. Intentá de nuevo en unos minutos.");
        } finally {
            if (tenantPrevio != null) TenantContext.set(tenantPrevio); else TenantContext.clear();
            if (previo != null) RequestContextHolder.setRequestAttributes(previo);
        }
    }

    /** Dentro de una sola transacción: checkout, datos del comprador, ubicación y vínculo con la sesión. */
    private Inicio crearPedidoYEnlazar(Long chatId, PaymentCheckoutRequest req, TelegramCompradorCtx c) {
        PaymentCheckoutResponse resp = paymentService.checkout(req, null);
        if (resp.getRedirectUrl() == null || resp.getRedirectUrl().isBlank()) {
            throw new IllegalStateException("Sin enlace de pago");
        }
        Pedido principal = pedidoRepository.findById(resp.getPedidoId()).orElseThrow();
        for (Pedido p : pedidoGrupoService.delGrupo(principal)) {
            p.setClienteNombre(c.nombre);
            p.setClienteTel(c.telefono);
            p.setNotas("Pedido por Telegram");
            pedidoRepository.save(p);
            if (c.esDomicilio()) guardarEntrega(p, c);
        }
        TelegramCompradorSesion s = sesionRepository.findByChatId(chatId).orElseThrow();
        s.setPedidoId(principal.getId());
        s.setPaso(TelegramCompradorService.ESPERANDO_PAGO);
        s.setContexto(null); // la dirección y el pin no quedan en el contexto del chat
        s.setUltimaActividad(LocalDateTime.now(Constants.ZONA_CR));
        sesionRepository.save(s);
        log.info("[telegram-comprador] pedido {} creado geo={}", resp.getNumeroPedido(), c.lat != null ? "si" : "no");
        return new Inicio(true, null, resp.getNumeroPedido(), resp.getRedirectUrl(), resp.getTotal() != null ? resp.getTotal() : 0);
    }

    private void guardarEntrega(Pedido p, TelegramCompradorCtx c) {
        PedidoEntrega e = new PedidoEntrega();
        e.setPedidoId(p.getId());
        e.setFuente(c.fuente != null ? c.fuente : PedidoEntrega.TEXTO);
        e.setDireccionTexto(recortar(c.direccionTexto, 500));
        e.setUrlNormalizada(recortar(c.url, 500));
        e.setLat(c.lat);
        e.setLng(c.lng);
        e.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        entregaRepository.save(e);
    }

    static PaymentCheckoutRequest armarRequest(TelegramCompradorCtx c) {
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setProvider(Constants.PROVEEDOR_ONVO);
        req.setGuestEmail(c.correo);
        req.setGuestPhone(c.telefono);
        req.setNotas("Pedido por Telegram");
        List<PaymentCheckoutRequest.ItemDTO> items = new ArrayList<>();
        c.carrito.forEach((id, n) -> {
            PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO();
            i.setProductoId(id);
            i.setCantidad(n);
            items.add(i);
        });
        req.setItems(items);
        if (c.esDomicilio()) {
            // ENVIO_A_DOMICILIO es solo del panel; el checkout público usa Envío Normal y el servidor decide GAM / fuera del GAM.
            req.setMetodoEnvio("ENVIO_NORMAL_GAM");
            req.setProvincia(c.provincia);
            req.setCanton(c.canton);
            req.setDireccionEntrega(direccionParaEntrega(c));
        } else {
            req.setMetodoEnvio(Constants.ENVIO_RETIRO);
        }
        return req;
    }

    /** Texto que verá el negocio en el pedido: señas, o el enlace / pin que dio el comprador. */
    static String direccionParaEntrega(TelegramCompradorCtx c) {
        StringBuilder sb = new StringBuilder();
        if (c.direccionTexto != null && !c.direccionTexto.isBlank()) sb.append(c.direccionTexto.trim());
        if (c.url != null && !c.url.isBlank()) {
            if (sb.length() > 0) sb.append(" — ");
            sb.append(c.url);
        }
        if (sb.length() == 0) sb.append("Ubicación indicada por Telegram");
        return sb.toString();
    }

    /** Revalida cada producto contra la empresa de la sesión (IDOR) y su disponibilidad antes de reservar. */
    String revisarCarrito(Long empresaId, TelegramCompradorCtx c) {
        if (productoRepository.contarDeTiendasPausadas(c.carrito.keySet()) > 0) {
            return "Esta tienda está pausada por ahora. No se puede comprar.";
        }
        for (var e : c.carrito.entrySet()) {
            Producto p = productoRepository.findByIdAndEmpresaId(e.getKey(), empresaId).orElse(null);
            if (p == null || !StockReservationService.esPublicableEnMemoria(p) || Boolean.TRUE.equals(p.getVendido())
                    || p.esACotizar() || Boolean.TRUE.equals(p.getEsPersonalizado())) {
                return "Alguno de los productos ya no está disponible. Revisá tu carrito.";
            }
            if (p.getStockDisponible() < e.getValue()) {
                return "No hay stock suficiente de «" + TelegramTexto.escaparMarkdown(p.getNombreProducto()) + "». Revisá tu carrito.";
            }
        }
        return null;
    }

    private static String mensajePublico(RuntimeException e) {
        if (e instanceof IllegalArgumentException || e instanceof IllegalStateException) {
            String m = e.getMessage();
            if (m != null && m.length() <= 200 && !m.contains("@")) return m;
        }
        return "No pude crear tu pedido. Revisá tus datos e intentá de nuevo.";
    }

    /** Cancela un pedido aún no pagado (libera la reserva por el camino de la tienda web). */
    public boolean cancelarNoPagado(String numeroPedido) {
        try {
            paymentService.cancelarAnon(numeroPedido, guestCancelTokenService.emitir(numeroPedido));
            return true;
        } catch (Exception e) {
            log.info("[telegram-comprador] cancelar pedido {} no fue posible ({})", numeroPedido, e.getClass().getSimpleName());
            return false;
        }
    }

    private static String recortar(String s, int max) {
        return s == null ? null : (s.length() <= max ? s : s.substring(0, max));
    }
}
