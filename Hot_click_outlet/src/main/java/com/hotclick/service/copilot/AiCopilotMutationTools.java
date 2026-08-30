package com.hotclick.service.copilot;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.dto.AccionPropuestaTelegram;
import com.hotclick.service.catalogo.ChatSearchTerms;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.hotclick.service.copilot.AiCopilotToolDefinitions.ESTADOS_PEDIDO_VALIDOS;

/**
 * Tools de mutación del Copilot Telegram (propose → confirm → execute).
 * Extraído bit-idéntico de AiCopilotToolExecutor — no cambia comportamiento.
 */
@Component
class AiCopilotMutationTools {

    @Autowired private JdbcTemplate jdbc;

    record PedidoCandidato(Long id, String numeroPedido, String estadoActual) {}
    record ProductoCandidato(Long id, String nombre) {}

    private static final String MSG_PROPUESTA_OK =
        "Propuesta generada. Decile al usuario en una frase corta que confirme con los botones — "
        + "no repitas el resumen en texto ni digas que ya se aplicó.";
    private static final String MSG_YA_HAY_PROPUESTA =
        "Ya se generó una propuesta en este turno — no se generó una segunda. Seguí solo con la primera.";

    List<PedidoCandidato> buscarPedidos(Long empresaId, String query) {
        String q = ChatSearchTerms.quitarComodinesLike(query.trim());
        String sql = """
            SELECT id_pedido, numero_pedido, estado_pedido
            FROM hot_click_pedido_tb
            WHERE fk_id_empresa = ? AND (numero_pedido ILIKE ? OR CAST(id_pedido AS TEXT) = ?)
            ORDER BY fecha_pedido DESC LIMIT 6
            """;
        return jdbc.queryForList(sql, empresaId, "%" + q + "%", q).stream()
            .map(f -> new PedidoCandidato(
                ((Number) f.get("id_pedido")).longValue(),
                (String) f.get("numero_pedido"),
                (String) f.get("estado_pedido")))
            .toList();
    }

    List<ProductoCandidato> buscarProductos(Long empresaId, String query) {
        String q = ChatSearchTerms.quitarComodinesLike(query.trim());
        String sql = """
            SELECT id_producto, nombre_producto
            FROM hot_click_producto_tb
            WHERE fk_id_empresa = ? AND fk_id_estado = 1 AND (nombre_producto ILIKE ? OR CAST(id_producto AS TEXT) = ?)
            ORDER BY nombre_producto LIMIT 6
            """;
        return jdbc.queryForList(sql, empresaId, "%" + q + "%", q).stream()
            .map(f -> new ProductoCandidato(
                ((Number) f.get("id_producto")).longValue(),
                (String) f.get("nombre_producto")))
            .toList();
    }

    String proponerCambiarEstadoPedido(Long empresaId, JsonNode args, AccionPropuestaTelegram[] holder) {
        String numeroPedido = args.path("numeroPedido").asText("").trim();
        String nuevoEstado  = args.path("nuevoEstado").asText("").trim().toUpperCase();
        String nota         = args.hasNonNull("nota") ? args.get("nota").asText("").trim() : null;
        if (nota != null && nota.length() > 500) nota = nota.substring(0, 500);

        if (numeroPedido.isBlank()) return "Falta el número de pedido — pedile al usuario que lo indique.";
        if (!ESTADOS_PEDIDO_VALIDOS.contains(nuevoEstado)) {
            return "Estado inválido. Los estados válidos son: " + String.join(", ", ESTADOS_PEDIDO_VALIDOS) + ".";
        }

        List<PedidoCandidato> candidatos = buscarPedidos(empresaId, numeroPedido);
        if (candidatos.isEmpty()) return "No encontré ningún pedido que coincida con \"" + numeroPedido + "\". Pedile al usuario el número exacto.";
        if (candidatos.size() > 1) {
            return "Encontré varios pedidos que coinciden: "
                + candidatos.stream().map(PedidoCandidato::numeroPedido).collect(java.util.stream.Collectors.joining(", "))
                + ". Pedile al usuario que precise cuál.";
        }
        if (holder[0] != null) return MSG_YA_HAY_PROPUESTA;

        PedidoCandidato pedido = candidatos.get(0);
        if (nuevoEstado.equals(pedido.estadoActual())) {
            return "El pedido " + pedido.numeroPedido() + " ya está en estado " + nuevoEstado + ".";
        }

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("nuevoEstado", nuevoEstado);
        if (nota != null && !nota.isBlank()) params.put("nota", nota);

        String resumen = String.format("Cambiar el pedido %s: %s → %s%s",
            pedido.numeroPedido(), pedido.estadoActual(), nuevoEstado,
            (nota != null && !nota.isBlank()) ? "\nNota: " + nota : "");

        holder[0] = new AccionPropuestaTelegram(AccionPropuestaTelegram.PEDIDO_ESTADO, pedido.id(), params, resumen);
        return MSG_PROPUESTA_OK;
    }

    String proponerAsignarGuia(Long empresaId, JsonNode args, AccionPropuestaTelegram[] holder) {
        String numeroPedido = args.path("numeroPedido").asText("").trim();
        String numeroGuia   = args.path("numeroGuia").asText("").trim();
        if (numeroPedido.isBlank() || numeroGuia.isBlank()) {
            return "Faltan datos — pedile al usuario el número de pedido y el número de guía.";
        }
        if (numeroGuia.length() > 100) numeroGuia = numeroGuia.substring(0, 100);

        List<PedidoCandidato> candidatos = buscarPedidos(empresaId, numeroPedido);
        if (candidatos.isEmpty()) return "No encontré ningún pedido que coincida con \"" + numeroPedido + "\". Pedile al usuario el número exacto.";
        if (candidatos.size() > 1) {
            return "Encontré varios pedidos que coinciden: "
                + candidatos.stream().map(PedidoCandidato::numeroPedido).collect(java.util.stream.Collectors.joining(", "))
                + ". Pedile al usuario que precise cuál.";
        }
        if (holder[0] != null) return MSG_YA_HAY_PROPUESTA;

        PedidoCandidato pedido = candidatos.get(0);
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("numeroGuia", numeroGuia);

        String resumen = String.format("Asignar guía %s al pedido %s (pasa a ENVIADO, se notifica al cliente por email)",
            numeroGuia, pedido.numeroPedido());

        holder[0] = new AccionPropuestaTelegram(AccionPropuestaTelegram.PEDIDO_GUIA, pedido.id(), params, resumen);
        return MSG_PROPUESTA_OK;
    }

    String proponerAjustarStock(Long empresaId, JsonNode args, AccionPropuestaTelegram[] holder) {
        String producto = args.path("producto").asText("").trim();
        if (!args.hasNonNull("cantidadReal")) return "Falta la cantidad real de stock — pedile al usuario el número.";
        int cantidadReal = args.path("cantidadReal").asInt(-1);
        if (producto.isBlank() || cantidadReal < 0) {
            return "Faltan datos válidos — pedile al usuario el producto y la cantidad exacta (no puede ser negativa).";
        }

        List<ProductoCandidato> candidatos = buscarProductos(empresaId, producto);
        if (candidatos.isEmpty()) return "No encontré ningún producto activo que coincida con \"" + producto + "\". Pedile al usuario el nombre exacto.";
        if (candidatos.size() > 1) {
            return "Encontré varios productos que coinciden: "
                + candidatos.stream().map(ProductoCandidato::nombre).collect(java.util.stream.Collectors.joining(", "))
                + ". Pedile al usuario que precise cuál.";
        }
        if (holder[0] != null) return MSG_YA_HAY_PROPUESTA;

        ProductoCandidato p = candidatos.get(0);
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("cantidadReal", cantidadReal);

        String resumen = String.format("Ajustar el stock de %s a %d unidades (conteo físico)", p.nombre(), cantidadReal);

        holder[0] = new AccionPropuestaTelegram(AccionPropuestaTelegram.STOCK_AJUSTE, p.id(), params, resumen);
        return MSG_PROPUESTA_OK;
    }

    String proponerAplicarOferta(Long empresaId, JsonNode args, AccionPropuestaTelegram[] holder) {
        String producto = args.path("producto").asText("").trim();
        boolean quitar = args.path("quitarOferta").asBoolean(false);
        Integer pct    = args.hasNonNull("porcentajeDescuento") ? args.get("porcentajeDescuento").asInt() : null;
        Integer precio = args.hasNonNull("precioOferta") ? args.get("precioOferta").asInt() : null;

        if (producto.isBlank()) return "Falta el nombre del producto — pedile al usuario que lo indique.";
        if (!quitar && pct == null && precio == null) {
            return "Falta el porcentaje de descuento o el precio de oferta — pedile al usuario uno de los dos.";
        }

        List<ProductoCandidato> candidatos = buscarProductos(empresaId, producto);
        if (candidatos.isEmpty()) return "No encontré ningún producto activo que coincida con \"" + producto + "\". Pedile al usuario el nombre exacto.";
        if (candidatos.size() > 1) {
            return "Encontré varios productos que coinciden: "
                + candidatos.stream().map(ProductoCandidato::nombre).collect(java.util.stream.Collectors.joining(", "))
                + ". Pedile al usuario que precise cuál.";
        }
        if (holder[0] != null) return MSG_YA_HAY_PROPUESTA;

        ProductoCandidato p = candidatos.get(0);
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("enOferta", !quitar);
        if (!quitar) {
            if (pct != null) params.put("porcentajeDescuento", pct);
            if (precio != null) params.put("precioOferta", precio);
        }

        String resumen = resumenOferta(quitar, p.nombre(), pct, precio);

        holder[0] = new AccionPropuestaTelegram(AccionPropuestaTelegram.PRODUCTO_OFERTA, p.id(), params, resumen);
        return MSG_PROPUESTA_OK;
    }

    private static String resumenOferta(boolean quitar, String nombre, Integer pct, Integer precio) {
        if (quitar) return String.format("Quitar la oferta de %s", nombre);
        String detalle = pct != null ? pct + "% de descuento" : "precio de oferta ₡" + precio;
        return String.format("Aplicar oferta a %s (%s)", nombre, detalle);
    }
}
