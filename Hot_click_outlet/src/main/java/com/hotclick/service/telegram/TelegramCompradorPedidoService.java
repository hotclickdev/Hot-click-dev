package com.hotclick.service.telegram;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.dto.PaymentCheckoutResponse;
import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoEntrega;
import com.hotclick.model.Producto;
import com.hotclick.model.TelegramCompradorSesion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoEntregaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.TelegramCompradorSesionRepository;
import com.hotclick.security.TenantContext;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.service.payment.PedidoGrupoService;
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

    static final String MSG_TIENDA_NO_DISPONIBLE = "Esta tienda no está disponible por ahora. No se puede comprar.";

    /** Resultado de iniciar el pago: mensaje de error apto para el comprador, o el enlace de pago. */
    public record Inicio(boolean ok, String mensaje, String numeroPedido, String urlPago, int total) {
        static Inicio error(String m) { return new Inicio(false, m, null, null, 0); }
    }

    @Autowired private PaymentService paymentService;
    @Autowired private OnvoService onvoService;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private EmpresaRepository empresaRepository;
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

        PaymentCheckoutRequest req = TelegramCompradorPedidoMapeos.armarRequest(c);
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
            log.info("[telegram-comprador] checkout rechazado ({}: {})", e.getClass().getSimpleName(),
                TelegramCompradorPedidoMapeos.recortar(String.valueOf(e.getMessage()).replaceAll("[\\r\\n]+", " "), 200));
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
        List<Pedido> grupo = pedidoGrupoService.delGrupo(principal);
        List<PedidoEntrega> entregas = TelegramCompradorPedidoMapeos.aplicarComprador(grupo, c);
        pedidoRepository.saveAll(grupo);
        if (!entregas.isEmpty()) entregaRepository.saveAll(entregas);
        TelegramCompradorSesion s = sesionRepository.findByChatId(chatId).orElseThrow();
        s.setPedidoId(principal.getId());
        s.setPaso(TelegramCompradorService.ESPERANDO_PAGO);
        s.setContexto(null); // la dirección y el pin no quedan en el contexto del chat
        s.setUltimaActividad(LocalDateTime.now(Constants.ZONA_CR));
        sesionRepository.save(s);
        log.info("[telegram-comprador] pedido {} creado geo={}", resp.getNumeroPedido(), c.lat != null ? "si" : "no");
        return new Inicio(true, null, resp.getNumeroPedido(), resp.getRedirectUrl(), resp.getTotal() != null ? resp.getTotal() : 0);
    }

    /** Revalida cada producto contra la empresa de la sesión (IDOR) y su disponibilidad antes de reservar. */
    String revisarCarrito(Long empresaId, TelegramCompradorCtx c) {
        if (!tiendaApta(empresaId)) return MSG_TIENDA_NO_DISPONIBLE;
        if (productoRepository.contarDeTiendasPausadas(c.carrito.keySet()) > 0) {
            return "Esta tienda está pausada por ahora. No se puede comprar.";
        }
        return TelegramCompradorPedidoMapeos.revisarCarrito(c.carrito,
            id -> productoRepository.findByIdAndEmpresaId(id, empresaId).orElse(null));
    }

    /** La tienda de la sesión debe seguir apta (pública, activa, no pausada, no de prueba) al momento de pagar. */
    private boolean tiendaApta(Long empresaId) {
        return empresaId != null
            && empresaRepository.findById(empresaId).filter(TelegramCompradorService::tiendaPublica).isPresent();
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

}
