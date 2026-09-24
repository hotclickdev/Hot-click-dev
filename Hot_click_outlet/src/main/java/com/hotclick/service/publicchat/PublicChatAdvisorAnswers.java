package com.hotclick.service.publicchat;

import com.hotclick.service.catalogo.ChatPrecioPersonalizado;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Respuestas del chat de ficha usando solo campos del producto.
 * No busca catálogo. No inventa lo que no está en la ficha.
 */
@Component
class PublicChatAdvisorAnswers {

    private final PublicChatIntentHelper intentHelper;

    PublicChatAdvisorAnswers(PublicChatIntentHelper intentHelper) {
        this.intentHelper = intentHelper;
    }

    public String responder(Map<String, Object> ficha, String mensaje, boolean isEnglish) {
        if (ficha == null || ficha.isEmpty()) {
            return isEnglish ? "I don't have this product sheet." : "No tengo la ficha de este producto.";
        }
        String n = intentHelper.normalize(mensaje == null ? "" : mensaje);
        if (intentHelper.isGreeting(mensaje) && n.split("\\s+").length <= 4) {
            return saludo(ficha, isEnglish);
        }
        if (esGarantia(n)) return garantia(ficha, isEnglish);
        if (esColor(n)) return color(ficha, isEnglish);
        if (esPrecio(n)) return precio(ficha, isEnglish);
        if (esUso(n)) return uso(ficha, isEnglish);
        if (esTalla(n)) return talla(ficha, isEnglish);
        if (esQueEs(n)) return queEs(ficha, isEnglish);
        return resumen(ficha, isEnglish);
    }

    private String saludo(Map<String, Object> ficha, boolean en) {
        String nombre = nombre(ficha);
        String desc = primero(ficha, "descripcion_corta", "descripcion_larga");
        if (en) {
            return desc.isBlank()
                ? "Hi. This is " + nombre + ". Ask about use, color or warranty — I only go by the sheet."
                : "Hi. " + nombre + ": " + recorte(desc, 180);
        }
        return desc.isBlank()
            ? "Hola. Esta es la ficha de " + nombre + ". Preguntame uso, color o garantía — te digo lo que consta."
            : "Hola. " + nombre + ": " + recorte(desc, 180);
    }

    private String queEs(Map<String, Object> ficha, boolean en) {
        String nombre = nombre(ficha);
        String desc = primero(ficha, "descripcion_larga", "descripcion_corta", "especificaciones");
        String precio = ChatPrecioPersonalizado.etiquetaDesdeMap(ficha);
        if (desc.isBlank()) {
            return en
                ? nombre + ". The sheet has no description. Price: " + precio + "."
                : nombre + ". En la ficha no hay descripción. Precio: " + precio + ".";
        }
        String extra = extraPersonalizado(ficha);
        return recorte(nombre + ". " + desc + extra, 320);
    }

    private String uso(Map<String, Object> ficha, boolean en) {
        String uso = texto(ficha.get("como_usar"));
        if (!uso.isBlank()) return recorte(uso, 280);
        String inst = texto(ficha.get("instrucciones_personalizacion"));
        if (!inst.isBlank()) return recorte(inst, 280);
        String nombre = nombre(ficha);
        return en
            ? "The sheet for " + nombre + " doesn't say how to use it."
            : "En la ficha de " + nombre + " no indica cómo se usa.";
    }

    private String color(Map<String, Object> ficha, boolean en) {
        String snippet = snippetCon(textoFicha(ficha), "color", "colour");
        if (!snippet.isBlank()) return recorte(snippet, 280);
        String nombre = nombre(ficha);
        return en
            ? "The sheet for " + nombre + " doesn't indicate the color."
            : "En la ficha de " + nombre + " no indica el color.";
    }

    private String talla(Map<String, Object> ficha, boolean en) {
        String snippet = snippetCon(textoFicha(ficha), "talla", "medida", "pecho", "altura", "size");
        if (!snippet.isBlank()) return recorte(snippet, 280);
        String nombre = nombre(ficha);
        return en
            ? "The sheet for " + nombre + " doesn't indicate size."
            : "En la ficha de " + nombre + " no indica talla ni medidas.";
    }

    private String garantia(Map<String, Object> ficha, boolean en) {
        int dias = diasGarantia(ficha.get("garantia_dias"));
        String nombre = nombre(ficha);
        if (dias > 0) {
            return en
                ? "The sheet lists a " + dias + "-day warranty for " + nombre + "."
                : "La ficha de " + nombre + " indica garantía de " + dias + " días.";
        }
        return en
            ? "The sheet for " + nombre + " doesn't list a warranty period."
            : "En la ficha de " + nombre + " no consta la garantía.";
    }

    private String precio(Map<String, Object> ficha, boolean en) {
        String etiqueta = ChatPrecioPersonalizado.etiquetaDesdeMap(ficha);
        String nombre = nombre(ficha);
        return en
            ? "The listed price for " + nombre + " is " + etiqueta + "."
            : "El precio en ficha de " + nombre + " es " + etiqueta + ".";
    }

    private String resumen(Map<String, Object> ficha, boolean en) {
        String desc = primero(ficha, "descripcion_corta", "descripcion_larga", "especificaciones");
        String nombre = nombre(ficha);
        if (desc.isBlank()) {
            return en
                ? "The sheet for " + nombre + " doesn't have that detail."
                : "En la ficha de " + nombre + " no consta ese dato. Si querés, preguntá uso, color o garantía.";
        }
        return recorte(nombre + ". " + desc, 280);
    }

    private String extraPersonalizado(Map<String, Object> ficha) {
        if (!ChatPrecioPersonalizado.esPersonalizado(ficha.get("es_personalizado"))) return "";
        String inst = texto(ficha.get("instrucciones_personalizacion"));
        return inst.isBlank() ? "" : " " + inst;
    }

    private static boolean esGarantia(String n) {
        return n.contains("garantia") || n.contains("warranty");
    }

    private static boolean esColor(String n) {
        return n.contains("color") || n.contains("colour");
    }

    private static boolean esPrecio(String n) {
        if (n.contains("vale la pena")) return false;
        return n.contains("precio") || n.contains("cuesta") || n.contains("cuanto vale")
            || n.contains("cuanto sale") || n.contains("price") || n.contains("how much");
    }

    private static boolean esUso(String n) {
        return n.contains("como se usa") || n.contains("como lo uso") || n.contains("como usar")
            || n.contains("how do i use") || n.contains("how to use") || n.contains("instrucciones");
    }

    private static boolean esTalla(String n) {
        return n.contains("talla") || n.contains("medida") || n.contains("tamano")
            || n.contains("size") || n.contains("altura") || n.contains("pecho");
    }

    private static boolean esQueEs(String n) {
        return n.contains("que es") || n.contains("que son") || n.contains("para que sirve")
            || n.contains("para que es") || n.contains("what is") || n.contains("what are");
    }

    private static String nombre(Map<String, Object> ficha) {
        String n = texto(ficha.get("nombre_producto"));
        return n.isBlank() ? "este producto" : n;
    }

    private static String primero(Map<String, Object> ficha, String... keys) {
        for (String k : keys) {
            String v = texto(ficha.get(k));
            if (!v.isBlank()) return v;
        }
        return "";
    }

    private static String textoFicha(Map<String, Object> ficha) {
        return String.join(" ",
            texto(ficha.get("descripcion_corta")),
            texto(ficha.get("descripcion_larga")),
            texto(ficha.get("especificaciones")),
            texto(ficha.get("como_usar")),
            texto(ficha.get("instrucciones_personalizacion")),
            texto(ficha.get("tags")));
    }

    private static String snippetCon(String blob, String... keys) {
        if (blob.isBlank()) return "";
        String[] partes = blob.split("(?<=[.!?\\n])\\s+");
        StringBuilder sb = new StringBuilder();
        for (String parte : partes) {
            String n = java.text.Normalizer.normalize(parte.toLowerCase(), java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
            for (String key : keys) {
                if (n.contains(key)) {
                    if (!sb.isEmpty()) sb.append(' ');
                    sb.append(parte.trim());
                    break;
                }
            }
        }
        return sb.toString().trim();
    }

    private static int diasGarantia(Object raw) {
        if (raw instanceof Number n) return n.intValue();
        return 0;
    }

    private static String recorte(String s, int max) {
        if (s.length() <= max) return s;
        return s.substring(0, max).trim() + "…";
    }

    private static String texto(Object v) {
        if (v == null) return "";
        String s = String.valueOf(v).trim();
        return "null".equals(s) ? "" : s;
    }
}
