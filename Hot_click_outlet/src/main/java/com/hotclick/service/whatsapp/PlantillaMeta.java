package com.hotclick.service.whatsapp;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Catálogo de plantillas de Meta (WhatsApp Business) de categoría UTILITY.
 *
 * <p>Fuera de la ventana de servicio de 24 h Meta rechaza el texto libre: los mensajes iniciados
 * por el negocio deben ser plantillas aprobadas. Cada entrada define el nombre técnico registrado
 * en Meta, el idioma, el cuerpo con variables {{1}}...{{n}} y qué claves del contexto llenan cada
 * variable (en orden). El texto de {@link #cuerpo} debe ser IDÉNTICO al que se envía a aprobación
 * (ver docs/agente-ia/plantillas-meta.md).
 *
 * <p>Idioma: se usa {@code es} (español genérico). Meta no ofrece un código es_CR; {@code es} cubre
 * a los clientes de Costa Rica sin tener que aprobar una variante por país.
 *
 * <p>Reglas de Meta que respetan los cuerpos: la variable no abre ni cierra el texto, los parámetros
 * van sin saltos de línea y no hay datos sensibles (sin teléfonos, cédulas ni precios internos).
 */
public enum PlantillaMeta {

    PAGO_CONFIRMADO("hotclick_pago_confirmado_v1", "CONFIRMACION_PEDIDO",
        "Hola {{1}}, recibimos tu pago del pedido {{2}} por ₡{{3}}. Estamos preparando tu pedido y te avisaremos cuando salga. Gracias por comprar en HOTCLICK.",
        List.of("nombre", "numeroPedido", "total")),

    GUIA_ASIGNADA("hotclick_guia_asignada_v1", "GUIA_ASIGNADA",
        "Hola {{1}}, tu pedido {{2}} ya fue enviado con {{3}}. Tu número de guía es {{4}}. Gracias por comprar en HOTCLICK.",
        List.of("nombre", "numeroPedido", "courier", "guia")),

    PEDIDO_ENTREGADO("hotclick_pedido_entregado_v1", "POST_ENTREGA_RESENA",
        "Hola {{1}}, tu pedido {{2}} figura como entregado. Si algo no llegó bien, respondé a este mensaje y te ayudamos. Gracias por comprar en HOTCLICK.",
        List.of("nombre", "numeroPedido")),

    RECORDATORIO_COMPRA_PENDIENTE("hotclick_compra_pendiente_v1", "CARRITO_ABANDONADO",
        "Hola {{1}}, tenés pendiente la compra de {{2}} en HOTCLICK. Si querés terminarla o tenés dudas, respondé a este mensaje.",
        List.of("nombre", "productos")),

    TRASPASO_ASESOR("hotclick_traspaso_asesor_v1", PlantillaMeta.ESCENARIO_TRASPASO,
        "Hola {{1}}, recibimos tu consulta. Un asesor de HOTCLICK te responderá lo antes posible en este mismo chat.",
        List.of("nombre"));

    /** Escenario del traspaso a una persona (lo dispara el agente, AG-05). */
    public static final String ESCENARIO_TRASPASO = "TRASPASO_ASESOR";
    public static final String CATEGORIA = "UTILITY";
    public static final String IDIOMA = "es";

    private static final int MAX_PARAM = 1024;

    public final String nombreTecnico;
    public final String escenario;
    public final String cuerpo;
    public final List<String> claves;

    PlantillaMeta(String nombreTecnico, String escenario, String cuerpo, List<String> claves) {
        this.nombreTecnico = nombreTecnico;
        this.escenario = escenario;
        this.cuerpo = cuerpo;
        this.claves = claves;
    }

    /** Plantilla de utilidad que cubre un escenario, si existe (reactivación, emprendedor y admin no tienen). */
    public static Optional<PlantillaMeta> paraEscenario(String escenario) {
        for (PlantillaMeta p : values()) {
            if (p.escenario.equals(escenario)) return Optional.of(p);
        }
        return Optional.empty();
    }

    /** Valores de las variables {{1}}...{{n}} tomados del contexto, ya saneados para Meta. */
    public List<String> parametros(Map<String, String> ctx) {
        List<String> out = new ArrayList<>(claves.size());
        for (String k : claves) {
            out.add(sanear(ctx == null ? null : ctx.get(k)));
        }
        return out;
    }

    /**
     * JSON de la Cloud API para enviar esta plantilla: {@code type:"template"}, nombre, idioma y un
     * componente body con un parámetro de texto por variable.
     */
    public Map<String, Object> cuerpoWhatsApp(String telefono, List<String> parametros) {
        List<Map<String, Object>> params = new ArrayList<>();
        for (String p : parametros) {
            Map<String, Object> param = new LinkedHashMap<>();
            param.put("type", "text");
            param.put("text", p);
            params.add(param);
        }
        List<Map<String, Object>> componentes = new ArrayList<>();
        if (!params.isEmpty()) {
            Map<String, Object> bodyComp = new LinkedHashMap<>();
            bodyComp.put("type", "body");
            bodyComp.put("parameters", params);
            componentes.add(bodyComp);
        }
        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", nombreTecnico);
        template.put("language", Map.of("code", IDIOMA));
        template.put("components", componentes);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", telefono);
        body.put("type", "template");
        body.put("template", template);
        return body;
    }

    /** Cuerpo con las variables reemplazadas: es el texto que queda en el registro. */
    public String renderizar(List<String> parametros) {
        String t = cuerpo;
        for (int i = 0; i < parametros.size(); i++) {
            t = t.replace("{{" + (i + 1) + "}}", parametros.get(i));
        }
        return t;
    }

    /**
     * Meta no admite saltos de línea, tabulaciones ni más de 4 espacios seguidos en un parámetro,
     * ni parámetros vacíos.
     */
    static String sanear(String v) {
        if (v == null) return "-";
        String s = v.replaceAll("[\\r\\n\\t]+", " ").replaceAll(" {2,}", " ").strip();
        if (s.isEmpty()) return "-";
        return s.length() > MAX_PARAM ? s.substring(0, MAX_PARAM) : s;
    }
}
