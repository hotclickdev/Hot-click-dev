package com.hotclick.service.telegram;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoRetiroToken;
import com.hotclick.model.TelegramCompradorSesion;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Predicate;
import java.util.function.UnaryOperator;

/** Armado en memoria de los avisos del comprador. Sin acceso a base de datos: los bucles viven acá, no junto a los repositorios. */
final class TelegramCompradorAvisoMapeos {

    private TelegramCompradorAvisoMapeos() {}

    static List<String> urlsQr(List<PedidoRetiroToken> tokens, UnaryOperator<String> urlPublica) {
        List<String> urls = new ArrayList<>();
        for (PedidoRetiroToken t : tokens) urls.add(urlPublica.apply(t.getToken()));
        return urls;
    }

    static List<List<Map<String, Object>>> tecladoQr(List<String> urls) {
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        for (String url : urls) {
            teclado.add(List.of(Map.of("text", "📱 Ver mi QR de retiro", "url", url)));
        }
        return teclado;
    }

    static List<Long> pedidoIds(List<TelegramCompradorSesion> sesiones) {
        List<Long> ids = new ArrayList<>();
        for (TelegramCompradorSesion s : sesiones) {
            if (s.getPedidoId() != null) ids.add(s.getPedidoId());
        }
        return ids;
    }

    static Map<Long, Pedido> porId(List<Pedido> pedidos) {
        Map<Long, Pedido> out = new HashMap<>();
        for (Pedido p : pedidos) out.put(p.getId(), p);
        return out;
    }

    /**
     * Recorre sesiones ya cargadas: avisa un pago confirmado, o propone cerrar si el pedido no existe o está cancelado.
     * Sin repositorios: las acciones las hace quien llama.
     */
    static int recorrer(List<TelegramCompradorSesion> pendientes, Map<Long, Pedido> pedidos,
                        Set<String> estadosPagados, String estadoCancelado,
                        Consumer<Long> alPagar, Predicate<TelegramCompradorSesion> cerrarSiVencio) {
        int cerradas = 0;
        for (TelegramCompradorSesion s : pendientes) {
            Pedido p = s.getPedidoId() == null ? null : pedidos.get(s.getPedidoId());
            if (p != null && estadosPagados.contains(p.getEstadoPedido())) {
                alPagar.accept(p.getId());
            } else if (p == null || estadoCancelado.equals(p.getEstadoPedido())) {
                if (cerrarSiVencio.test(s)) cerradas++;
            }
        }
        return cerradas;
    }

    /** Aplica {@code accion} una vez por chat distinto (sin repetir aunque haya varias sesiones); cuenta los que salieron bien. */
    static int paraCadaChat(List<TelegramCompradorSesion> sesiones, Predicate<Long> accion) {
        Set<Long> vistos = new java.util.LinkedHashSet<>();
        for (TelegramCompradorSesion s : sesiones) {
            if (s.getChatId() != null) vistos.add(s.getChatId());
        }
        int ok = 0;
        for (Long chatId : vistos) {
            if (accion.test(chatId)) ok++;
        }
        return ok;
    }
}
