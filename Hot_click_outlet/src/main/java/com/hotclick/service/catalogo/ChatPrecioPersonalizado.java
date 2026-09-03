package com.hotclick.service.catalogo;

import java.text.NumberFormat;
import java.util.Locale;
import java.util.Map;

/**
 * Formato de precio para chats asesores: nunca exponer el placeholder ₡1 de cotización.
 */
public final class ChatPrecioPersonalizado {

    public static final String A_COTIZAR = "A cotizar";
    public static final String MODO_FIJO = "FIJO";
    public static final String MODO_RANGO = "RANGO";
    public static final String MODO_COTIZACION = "COTIZACION";
    /** Mismo placeholder que el wizard al publicar cotización. */
    public static final int PLACEHOLDER_COTIZACION = 1;

    private static final NumberFormat COLONES =
        NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));

    private ChatPrecioPersonalizado() {}

    public static boolean esPersonalizado(Object flag) {
        if (flag instanceof Boolean b) return b;
        if (flag instanceof Number n) return n.intValue() != 0;
        return false;
    }

    public static String modo(Object raw) {
        if (raw == null) return null;
        String s = String.valueOf(raw).trim().toUpperCase(Locale.ROOT);
        return s.isEmpty() || "null".equalsIgnoreCase(s) ? null : s;
    }

    public static Integer entero(Object raw) {
        if (raw instanceof Number n) return n.intValue();
        return null;
    }

    /** Etiqueta legible para prompt y tarjetas. */
    public static String etiqueta(boolean personalizado, String modoPrecio,
                                  Integer precioVenta, Integer precioOferta,
                                  Integer min, Integer max) {
        if (!personalizado) return etiquetaCatalogo(precioVenta, precioOferta);
        if (MODO_COTIZACION.equals(modoPrecio)) return A_COTIZAR;
        if (MODO_RANGO.equals(modoPrecio)) return etiquetaRango(min, max);
        return etiquetaCatalogo(precioVenta, precioOferta);
    }

    public static String etiquetaDesdeMap(Map<String, Object> p) {
        return etiqueta(
            esPersonalizado(p.get("es_personalizado")),
            modo(p.get("modo_precio_personalizado")),
            entero(p.get("precio_venta")),
            entero(p.get("precio_oferta")),
            entero(p.get("precio_personalizado_min")),
            entero(p.get("precio_personalizado_max")));
    }

    /**
     * Precio numérico para UI/carrito: null en cotización (no ₡1);
     * en rango usa el mínimo; en fijo/normal, oferta o venta.
     */
    public static Integer precioNumerico(boolean personalizado, String modoPrecio,
                                         Integer precioVenta, Integer precioOferta,
                                         Integer min) {
        if (personalizado && MODO_COTIZACION.equals(modoPrecio)) return null;
        if (personalizado && MODO_RANGO.equals(modoPrecio)) {
            return min != null && min > 0 ? min : null;
        }
        if (precioOferta != null && precioOferta > 0) return precioOferta;
        if (precioVenta != null && precioVenta > 0) return precioVenta;
        return null;
    }

    /** True si el CTA debe ir a ficha (encargo), no al carrito. */
    public static boolean requiereFichaEncargo(boolean personalizado, String modoPrecio) {
        return personalizado && !MODO_FIJO.equals(modoPrecio);
    }

    public static String fragmentoSelectSql() {
        return """
            , COALESCE(p.es_personalizado, FALSE) AS es_personalizado
            , p.modo_precio_personalizado
            , p.precio_personalizado_min
            , p.precio_personalizado_max
            , LEFT(COALESCE(p.instrucciones_personalizacion, ''), 280) AS instrucciones_personalizacion
            """;
    }

    /** Prefiere personalizados en el ORDER BY cuando la intención es a medida. */
    public static String orderBoostPersonalizado(boolean preferir) {
        if (!preferir) return "";
        return "CASE WHEN COALESCE(p.es_personalizado, FALSE) = TRUE THEN 0 ELSE 1 END, ";
    }

    private static String etiquetaCatalogo(Integer precioVenta, Integer precioOferta) {
        if (precioOferta != null && precioOferta > 0) {
            String base = precioVenta != null && precioVenta > 0
                ? " (antes ₡" + COLONES.format(precioVenta) + ")" : "";
            return "₡" + COLONES.format(precioOferta) + base;
        }
        if (precioVenta == null || precioVenta <= 0) return A_COTIZAR;
        return "₡" + COLONES.format(precioVenta);
    }

    private static String etiquetaRango(Integer min, Integer max) {
        if (min != null && min > 0 && max != null && max > 0) {
            return "Desde ₡" + COLONES.format(min) + " hasta ₡" + COLONES.format(max);
        }
        if (min != null && min > 0) return "Desde ₡" + COLONES.format(min);
        return A_COTIZAR;
    }
}
