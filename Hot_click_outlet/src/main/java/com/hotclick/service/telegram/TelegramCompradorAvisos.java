package com.hotclick.service.telegram;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoEntrega;
import com.hotclick.model.TelegramCompradorSesion;
import com.hotclick.repository.PedidoEntregaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.TelegramCompradorSesionRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.service.retiro.PedidoRetiroTokenService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.EmpresaNombre;
import com.hotclick.utils.FormatoColones;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Avisos de un pedido del comprador por Telegram: pago confirmado (comprador + bot del NEGOCIO), QR de retiro,
 * y reconciliación de pedidos que vencieron sin pagarse. No depende de PaymentService (lo llama la fachada de pagos).
 */
@Service
public class TelegramCompradorAvisos {

    private static final Logger log = LoggerFactory.getLogger(TelegramCompradorAvisos.class);
    private static final Set<String> PAGADOS = Set.of(
        Constants.PEDIDO_PAGADO, Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_COMPLETADO);

    @Autowired private TelegramCompradorSesionRepository sesionRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PedidoEntregaRepository entregaRepository;
    @Autowired private PedidoGrupoService pedidoGrupoService;
    @Autowired private PedidoRetiroTokenService retiroService;
    @Autowired private TelegramClienteBotService bot;
    @Autowired private TelegramNotificacionClienteService notificacionNegocio;
    @Autowired private PlatformTransactionManager transactionManager;

    /** Datos ya leídos dentro de la transacción; el envío por red ocurre después. */
    record Aviso(long chatId, Long empresaId, String slug, String numero, int total, String tienda, boolean retiro,
                 List<String> urlsQr, String comprador, String telefono, String detalleEntrega) {}

    /**
     * Pago confirmado de {@code pedidoId} (principal). Idempotente: solo actúa si la sesión del chat sigue
     * esperando el pago. Nunca lanza: un fallo de aviso no puede afectar la confirmación del pago.
     */
    public void alPagar(Long pedidoId) {
        try {
            if (pedidoId == null || sesionRepository.findFirstByPedidoId(pedidoId).isEmpty()) return; // la mayoría de pedidos no son de Telegram
            // REQUIRES_NEW: la fachada nos llama en afterCommit; unirse a esa transacción (ya confirmada) perdería los cambios.
            TransactionTemplate tx = new TransactionTemplate(transactionManager);
            tx.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
            Aviso a = tx.execute(st -> preparar(pedidoId));
            if (a != null) enviar(a);
        } catch (RuntimeException e) {
            log.warn("[telegram-comprador] aviso de pago falló ({})", e.getClass().getSimpleName());
        }
    }

    private Aviso preparar(Long pedidoId) {
        TelegramCompradorSesion s = sesionRepository.findFirstByPedidoId(pedidoId).orElse(null);
        if (s == null || !TelegramCompradorService.ESPERANDO_PAGO.equals(s.getPaso())) return null;
        Pedido principal = pedidoRepository.findById(pedidoId).orElse(null);
        if (principal == null) return null;
        // Transición atómica: si el webhook y la reconciliación coinciden, solo uno avisa.
        if (sesionRepository.cambiarPaso(s.getId(), TelegramCompradorService.ESPERANDO_PAGO,
                TelegramCompradorService.PAGADO, LocalDateTime.now(Constants.ZONA_CR)) != 1) return null;

        List<Pedido> grupo = pedidoGrupoService.delGrupo(principal);
        boolean retiro = Constants.ENVIO_RETIRO.equals(principal.getMetodoEnvio());
        List<String> urls = retiro
            ? TelegramCompradorAvisoMapeos.urlsQr(retiroService.emitirGrupo(grupo), retiroService::urlPublica)
            : List.of();
        String detalle = retiro ? "Entrega: *retiro en tienda* (el comprador muestra un QR en caja)"
            : detalleDomicilio(principal);
        int total = grupo.stream().mapToInt(p -> p.getTotalPedido() != null ? p.getTotalPedido() : 0).sum();
        String slug = principal.getEmpresa() != null ? principal.getEmpresa().getSlug() : null;
        return new Aviso(s.getChatId(), principal.getEmpresaId(), slug, principal.getNumeroPedido(), total,
            EmpresaNombre.mostrar(principal.getEmpresa(), "la tienda"), retiro, urls,
            principal.getClienteNombre(), principal.getClienteTel(), detalle);
    }

    private String detalleDomicilio(Pedido p) {
        StringBuilder sb = new StringBuilder("Entrega: *a domicilio*");
        if (p.getClienteTel() != null) sb.append("\nTel: ").append(TelegramTexto.escaparMarkdown(p.getClienteTel()));
        String dir = p.getDireccionEntrega();
        if (dir != null && !dir.isBlank()) sb.append("\nDirección: ").append(TelegramTexto.escaparMarkdown(dir));
        PedidoEntrega e = entregaRepository.findByPedidoId(p.getId()).orElse(null);
        if (e != null && e.getLat() != null && e.getLng() != null) {
            sb.append("\nMapa: ").append(TelegramTexto.escaparMarkdown(
                EnlaceUbicacionValidator.urlDeCoordenadas(e.getLat(), e.getLng())));
        }
        return sb.toString();
    }

    private void enviar(Aviso a) {
        StringBuilder t = new StringBuilder("✅ *¡Pago recibido!*\n\nPedido *").append(TelegramTexto.escaparMarkdown(a.numero()))
            .append("* en *").append(TelegramTexto.escaparMarkdown(a.tienda())).append("* por ")
            .append(FormatoColones.colones(a.total())).append(".\n\n");
        List<List<Map<String, Object>>> teclado = List.of();
        if (a.retiro()) {
            t.append("Para retirar, mostrá el código QR en caja. Vale por *4 horas* y se puede usar *una sola vez*.");
            teclado = TelegramCompradorAvisoMapeos.tecladoQr(a.urlsQr());
        } else {
            t.append("La tienda te va a contactar para coordinar la entrega. ¡Gracias por tu compra!");
        }
        bot.enviarMensaje(a.chatId(), t.toString(), teclado);
        notificacionNegocio.notificarVenta(a.empresaId(), a.numero(), a.total(), "ONVO (Telegram)",
            a.comprador(), "ONLINE", a.detalleEntrega());
    }

    /**
     * Cada 2 min: pedidos de Telegram que vencieron o se cancelaron sin pagarse vuelven el chat al catálogo y se
     * avisa (el stock ya lo libera el vencimiento de pagos de la tienda); pagos cuyo aviso se perdió se reenvían;
     * y se borran las sesiones abandonadas (carrito sin pedido) de más de 24 h.
     */
    @Scheduled(fixedDelay = 2 * 60 * 1000)
    @SchedulerLock(name = "telegram_comprador_reconciliar", lockAtMostFor = "PT5M", lockAtLeastFor = "PT20S")
    public void reconciliarProgramado() {
        reconciliar(LocalDateTime.now(Constants.ZONA_CR));
    }

    /** @return cuántas sesiones se cerraron por vencimiento. */
    public int reconciliar(LocalDateTime ahora) {
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        List<TelegramCompradorSesion> pendientes = sesionRepository.findTop200ByPasoOrderByUltimaActividadAsc(TelegramCompradorService.ESPERANDO_PAGO);
        Map<Long, Pedido> pedidos = TelegramCompradorAvisoMapeos.porId(
            pedidoRepository.findAllById(TelegramCompradorAvisoMapeos.pedidoIds(pendientes)));
        int cerradas = TelegramCompradorAvisoMapeos.recorrer(pendientes, pedidos, PAGADOS, Constants.PEDIDO_CANCELADO,
            id -> {
                try { alPagar(id); }
                catch (RuntimeException e) { log.warn("[telegram-comprador] reconciliar sesión falló ({})", e.getClass().getSimpleName()); }
            },
            s -> {
                try {
                    Long chatId = s.getChatId();
                    Boolean cerro = tx.execute(st -> cerrarVencida(s.getId()));
                    if (Boolean.TRUE.equals(cerro)) {
                        bot.enviarMensaje(chatId, "⌛ Tu pedido venció sin pagarse y liberé los productos. "
                            + "Si querés, armá uno nuevo.", List.of(List.of(
                                TelegramClienteBotService.boton("🛍️ Ver productos", TelegramCompradorService.CB_CATALOGO))));
                        return true;
                    }
                } catch (RuntimeException e) {
                    log.warn("[telegram-comprador] reconciliar sesión falló ({})", e.getClass().getSimpleName());
                }
                return false;
            });
        Integer borradas = tx.execute(st -> sesionRepository.borrarInactivas(ahora.minusHours(24)));
        if (borradas != null && borradas > 0) log.info("[telegram-comprador] {} sesiones abandonadas borradas", borradas);
        return cerradas;
    }

    private boolean cerrarVencida(Long sesionId) {
        return sesionRepository.cerrarVencida(sesionId, TelegramCompradorService.ESPERANDO_PAGO,
            TelegramCompradorService.CATALOGO, LocalDateTime.now(Constants.ZONA_CR)) == 1;
    }
}
