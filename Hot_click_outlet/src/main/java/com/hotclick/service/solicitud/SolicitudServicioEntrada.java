package com.hotclick.service.solicitud;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;

import java.util.Map;

/**
 * Lo que acepta POST /api/servicios. El endpoint es público: sin estos topes
 * se pueden llenar la tabla y el panel de admin con texto o URLs arbitrarias.
 */
public final class SolicitudServicioEntrada {

    public static final int DESCRIPCION_MAX = 2000;
    public static final int NOMBRE_MAX = 100;
    public static final int TELEFONO_MAX = 30;
    public static final int PRESUPUESTO_MAX = 100;
    public static final int FOTOS_MAX = 3;
    public static final int URL_MAX = 500;

    private static final ObjectMapper JSON = new ObjectMapper();

    private SolicitudServicioEntrada() {}

    public record Datos(String descripcion, String nombre, String telefono, String presupuesto, String fotosUrls) {}

    public static Datos validar(Map<String, String> body) {
        String descripcion = texto(body.get("descripcion"), DESCRIPCION_MAX, "La descripción es requerida", "La descripción es demasiado larga");
        return new Datos(
            descripcion,
            opcional(body.get("nombreContacto"), NOMBRE_MAX, "El nombre es demasiado largo"),
            opcional(body.get("telefonoContacto"), TELEFONO_MAX, "El teléfono es demasiado largo"),
            opcional(body.get("presupuesto"), PRESUPUESTO_MAX, "El presupuesto es demasiado largo"),
            fotosHttps(body.get("fotosUrls"))
        );
    }

    private static String texto(String valor, int max, String siFalta, String siLargo) {
        if (valor == null || valor.isBlank()) {
            throw new IllegalArgumentException(siFalta);
        }
        String limpio = valor.trim();
        if (limpio.length() > max) {
            throw new IllegalArgumentException(siLargo);
        }
        return limpio;
    }

    private static String opcional(String valor, int max, String siLargo) {
        if (valor == null || valor.isBlank()) return null;
        String limpio = valor.trim();
        if (limpio.length() > max) {
            throw new IllegalArgumentException(siLargo);
        }
        return limpio;
    }

    /** Solo https, como mucho 3. Rechaza javascript:, data: y http. */
    static String fotosHttps(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            JsonNode nodo = JSON.readTree(raw);
            if (!nodo.isArray() || nodo.size() > FOTOS_MAX) {
                throw new IllegalArgumentException("Las fotos de la solicitud no son válidas");
            }
            ArrayNode salida = JSON.createArrayNode();
            for (JsonNode item : nodo) {
                salida.add(urlHttps(item));
            }
            return salida.isEmpty() ? null : JSON.writeValueAsString(salida);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Las fotos de la solicitud no son válidas");
        }
    }

    private static String urlHttps(JsonNode item) {
        if (item == null || !item.isTextual()) {
            throw new IllegalArgumentException("Las fotos de la solicitud no son válidas");
        }
        String url = item.asText().trim();
        if (url.length() > URL_MAX || !url.startsWith("https://") || url.contains(" ")) {
            throw new IllegalArgumentException("Las fotos de la solicitud no son válidas");
        }
        return url;
    }
}
