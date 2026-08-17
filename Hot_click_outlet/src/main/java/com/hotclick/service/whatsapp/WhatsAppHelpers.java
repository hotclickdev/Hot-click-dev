package com.hotclick.service.whatsapp;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Usuario;

import java.text.NumberFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

public final class WhatsAppHelpers {

    public static final NumberFormat CRC = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));

    private WhatsAppHelpers() {}

    /** Construye el contexto común para notificaciones de venta al emprendedor y admin IT. */
    public static Map<String, String> contextoEmprendedor(Pedido pedido) {
        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("numeroPedido",  pedido.getNumeroPedido() != null ? pedido.getNumeroPedido() : "");
        ctx.put("total",         CRC.format(pedido.getTotalPedido()));
        ctx.put("productos",     resumirProductos(pedido.getItems()));
        ctx.put("metodoPago",    pedido.getMetodoPago()  != null ? pedido.getMetodoPago()  : "");
        ctx.put("metodoEnvio",   pedido.getMetodoEnvio() != null ? pedido.getMetodoEnvio() : "");
        ctx.put("nombreEmpresa", pedido.getEmpresa() != null
            ? (pedido.getEmpresa().getNombreComercial() != null
                ? pedido.getEmpresa().getNombreComercial()
                : pedido.getEmpresa().getNombreEmpresa())
            : "HotClick");
        return ctx;
    }

    /** Costa Rica: 8 dígitos → prefijo 506. Números ya con 506 se dejan igual. */
    static String normalizarTelefono(String tel) {
        String limpio = tel.replaceAll("[^0-9]", "");
        if (limpio.startsWith("506")) return limpio;
        if (limpio.length() == 8) return "506" + limpio;
        return limpio;
    }

    public static String resumirProductos(List<PedidoItem> items) {
        if (items == null || items.isEmpty()) return "tu pedido";
        return items.stream()
            .limit(2)
            .map(i -> i.getProducto() != null ? i.getProducto().getNombreProducto() : "producto")
            .collect(Collectors.joining(", "))
            + (items.size() > 2 ? " y " + (items.size() - 2) + " más" : "");
    }

    public static String segmento(Usuario u) {
        return u.getSegmento() != null && !u.getSegmento().isBlank() ? u.getSegmento() : "NUEVO";
    }

    static String limpiarTexto(String t) {
        return t.strip()
                .replaceAll("(^[\"'])|([\"']$)", "")
                .replaceAll("\\*\\*", "")
                .strip();
    }

    static String fallback(WaPlantilla p, Map<String, String> ctx) {
        String nombre = ctx.getOrDefault("nombre", "");
        return switch (p.escenario) {
            case "CONFIRMACION_PEDIDO" ->
                "Hola " + nombre + ", tu pedido " + ctx.getOrDefault("numeroPedido", "") +
                " fue confirmado por ₡" + ctx.getOrDefault("total", "") + ". Gracias por comprar en HOTCLICK.";
            case "GUIA_ASIGNADA" ->
                "Hola " + nombre + ", tu pedido " + ctx.getOrDefault("numeroPedido", "") +
                " está en camino. Guía: " + ctx.getOrDefault("guia", "") + ".";
            case "CARRITO_ABANDONADO" ->
                "Hola " + nombre + ", te dejaste algo en el carrito. Terminá tu compra cuando quieras.";
            case "REACTIVACION" ->
                "Hola " + nombre + ", hace tiempo no te vemos. Tenemos productos nuevos esperándote.";
            default ->
                "Hola " + nombre + ", gracias por ser cliente de HOTCLICK.";
        };
    }
}
