package com.hotclick.agente.catalogo;

import com.hotclick.agente.catalogo.CatalogoRepositorio.ProductoFila;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Traduce un producto visible al formato de {@code items_batch} de Meta y calcula su huella (SHA-256 de lo que se
 * envía): si la huella no cambió, el producto no se vuelve a enviar. Sin E/S.
 *
 * <p>El {@code id} del item es el id del producto ({@code retailer_id}): estable y único dentro del catálogo del
 * negocio; es el que usa {@code product_retailer_id} en los mensajes de WhatsApp. Meta exige título, descripción,
 * disponibilidad, condición, precio con moneda, enlace, marca e imagen: un producto sin imagen https no se sincroniza.
 */
final class ItemCatalogo {

    static final String MONEDA = "CRC";
    static final int MAX_TITULO = 200;
    static final int MAX_DESCRIPCION = 5000;

    private ItemCatalogo() { }

    static String retailerId(long productoId) {
        return Long.toString(productoId);
    }

    /** @return el item listo para {@code data}, o vacío si Meta lo rechazaría (sin imagen https, sin nombre o sin precio) */
    static Optional<Map<String, Object>> aItem(ProductoFila p, String urlBase) {
        if (p.nombre() == null || p.nombre().isBlank() || p.precio() <= 0) return Optional.empty();
        if (p.imagenUrl() == null || !p.imagenUrl().regionMatches(true, 0, "https://", 0, 8)) return Optional.empty();
        String titulo = recortar(p.nombre().strip(), MAX_TITULO);
        String descripcion = p.descripcion() == null || p.descripcion().isBlank() ? titulo
            : recortar(p.descripcion().strip(), MAX_DESCRIPCION);
        String marca = p.marca() == null || p.marca().isBlank() ? p.negocio() : p.marca().strip();
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("id", retailerId(p.id()));
        d.put("title", titulo);
        d.put("description", descripcion);
        d.put("availability", p.stock() > 0 ? "in stock" : "out of stock");
        d.put("condition", condicion(p.condicion()));
        d.put("price", p.precio() + " " + MONEDA);
        d.put("link", urlBase + "/tienda/" + p.slug() + "/producto/" + p.id());
        d.put("image_link", p.imagenUrl());
        d.put("brand", recortar(marca == null || marca.isBlank() ? "HotClick" : marca, 100));
        return Optional.of(d);
    }

    static String condicion(String c) {
        String x = c == null ? "" : c.strip().toUpperCase(Locale.ROOT);
        return switch (x) {
            case "USADO" -> "used";
            case "REACONDICIONADO" -> "refurbished";
            default -> "new";
        };
    }

    static String huella(Map<String, Object> item) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(item.toString().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    static Map<String, Object> pedidoUpdate(Map<String, Object> item) {
        return Map.of("method", "UPDATE", "data", item);
    }

    static Map<String, Object> pedidoDelete(long productoId) {
        return Map.of("method", "DELETE", "data", Map.of("id", retailerId(productoId)));
    }

    private static String recortar(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
