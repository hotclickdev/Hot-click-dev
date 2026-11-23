package com.hotclick.service.telegram;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoEntrega;
import com.hotclick.model.Producto;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.utils.Constants;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.LongFunction;

/** Armado y validación en memoria del pedido del comprador. Sin acceso a base de datos: los bucles viven acá. */
final class TelegramCompradorPedidoMapeos {

    private TelegramCompradorPedidoMapeos() {}

    static PaymentCheckoutRequest armarRequest(TelegramCompradorCtx c) {
        PaymentCheckoutRequest req = new PaymentCheckoutRequest();
        req.setProvider(Constants.PROVEEDOR_ONVO);
        req.setGuestEmail(c.correo);
        req.setGuestPhone(c.telefono);
        req.setNotas("Pedido por Telegram");
        List<PaymentCheckoutRequest.ItemDTO> items = new ArrayList<>();
        for (Map.Entry<Long, Integer> e : c.carrito.entrySet()) {
            PaymentCheckoutRequest.ItemDTO i = new PaymentCheckoutRequest.ItemDTO();
            i.setProductoId(e.getKey());
            i.setCantidad(e.getValue());
            items.add(i);
        }
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

    /** Copia nombre, teléfono y nota a cada pedido del grupo y devuelve las ubicaciones de entrega por guardar (a domicilio). */
    static List<PedidoEntrega> aplicarComprador(List<Pedido> grupo, TelegramCompradorCtx c) {
        List<PedidoEntrega> entregas = new ArrayList<>();
        for (Pedido p : grupo) {
            p.setClienteNombre(c.nombre);
            p.setClienteTel(c.telefono);
            p.setNotas("Pedido por Telegram");
            if (c.esDomicilio()) entregas.add(entrega(p, c));
        }
        return entregas;
    }

    private static PedidoEntrega entrega(Pedido p, TelegramCompradorCtx c) {
        PedidoEntrega e = new PedidoEntrega();
        e.setPedidoId(p.getId());
        e.setFuente(c.fuente != null ? c.fuente : PedidoEntrega.TEXTO);
        e.setDireccionTexto(recortar(c.direccionTexto, 500));
        e.setUrlNormalizada(recortar(c.url, 500));
        e.setLat(c.lat);
        e.setLng(c.lng);
        e.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        return e;
    }

    /** Revalida cada producto (resuelto ya acotado a la empresa de la sesión) y su disponibilidad. null = todo en orden. */
    static String revisarCarrito(Map<Long, Integer> carrito, LongFunction<Producto> productoDeLaTienda) {
        for (Map.Entry<Long, Integer> e : carrito.entrySet()) {
            Producto p = productoDeLaTienda.apply(e.getKey());
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

    static String recortar(String s, int max) {
        return s == null ? null : (s.length() <= max ? s : s.substring(0, max));
    }
}
