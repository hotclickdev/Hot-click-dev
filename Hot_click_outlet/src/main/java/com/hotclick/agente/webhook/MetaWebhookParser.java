package com.hotclick.agente.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Convierte el cuerpo de un webhook de Meta en mensajes normalizados.
 *
 * <ul>
 *   <li>WhatsApp: {@code object=whatsapp_business_account}, {@code entry[].changes[].value.messages[]}.</li>
 *   <li>Messenger: {@code object=page}, {@code entry[].messaging[]}.</li>
 *   <li>Instagram: {@code object=instagram}, {@code entry[].messaging[]}.</li>
 * </ul>
 * Se ignoran los ecos de mensajes propios, los acuses de entrega/lectura ({@code statuses}, {@code read},
 * {@code delivery}) y todo lo que no traiga un id de mensaje. Nunca lanza por datos raros: lo que no
 * entiende lo salta.
 */
@Component
public class MetaWebhookParser {

    static final int MAX_ID = 200;
    static final int MAX_TEXTO = 4096;

    public List<MensajeEntrante> parsear(JsonNode raiz) {
        List<MensajeEntrante> out = new ArrayList<>();
        if (raiz == null || !raiz.isObject()) return out;
        String objeto = raiz.path("object").asText("");
        for (JsonNode entry : raiz.path("entry")) {
            switch (objeto) {
                case "whatsapp_business_account" -> whatsapp(entry, out);
                case "page" -> messaging(entry, Canal.MESSENGER, out);
                case "instagram" -> messaging(entry, Canal.INSTAGRAM, out);
                default -> { /* objeto no soportado */ }
            }
        }
        return out;
    }

    /**
     * Acuses de mensajes enviados ({@code value.statuses[]}) y cambios de estado de plantillas
     * ({@code field=message_template_status_update}) de WhatsApp. No lanza por datos raros: lo que no entiende lo salta.
     */
    public EstadoEntrante parsearEstados(JsonNode raiz) {
        if (raiz == null || !raiz.isObject() || !"whatsapp_business_account".equals(raiz.path("object").asText(""))) {
            return EstadoEntrante.VACIO;
        }
        List<EstadoEntrante.EstadoMensaje> mensajes = new ArrayList<>();
        List<EstadoEntrante.EstadoPlantilla> plantillas = new ArrayList<>();
        for (JsonNode entry : raiz.path("entry")) {
            for (JsonNode change : entry.path("changes")) {
                String campo = change.path("field").asText("");
                JsonNode value = change.path("value");
                if ("messages".equals(campo)) {
                    for (JsonNode st : value.path("statuses")) estadoMensaje(st, mensajes);
                } else if ("message_template_status_update".equals(campo)) {
                    String id = texto(value.path("message_template_id"));
                    String evento = texto(value.path("event"));
                    if (id != null && evento != null && id.length() <= MAX_ID) {
                        plantillas.add(new EstadoEntrante.EstadoPlantilla(id, texto(value.path("message_template_name")),
                            evento.toUpperCase(java.util.Locale.ROOT), texto(value.path("reason"))));
                    }
                }
            }
        }
        return mensajes.isEmpty() && plantillas.isEmpty() ? EstadoEntrante.VACIO : new EstadoEntrante(mensajes, plantillas);
    }

    private static void estadoMensaje(JsonNode st, List<EstadoEntrante.EstadoMensaje> out) {
        String id = texto(st.path("id"));
        String estado = texto(st.path("status"));
        if (id == null || estado == null || id.length() > MAX_ID) return;
        JsonNode errores = st.path("errors");
        int codigo = errores.isArray() && !errores.isEmpty() ? errores.get(0).path("code").asInt(0) : 0;
        out.add(new EstadoEntrante.EstadoMensaje(id, estado.toLowerCase(java.util.Locale.ROOT),
            st.path("timestamp").asLong(0), codigo));
    }

    private void whatsapp(JsonNode entry, List<MensajeEntrante> out) {
        for (JsonNode change : entry.path("changes")) {
            if (!"messages".equals(change.path("field").asText())) continue;
            JsonNode value = change.path("value");
            String cuenta = texto(value.path("metadata").path("phone_number_id"));
            for (JsonNode m : value.path("messages")) {
                String id = texto(m.path("id"));
                String de = texto(m.path("from"));
                if (id == null || de == null || cuenta == null || id.length() > MAX_ID) continue;
                String tipo = m.path("type").asText("desconocido");
                String txt = null;
                String media = null;
                String boton = null;
                switch (tipo) {
                    case "text" -> txt = texto(m.path("text").path("body"));
                    case "interactive" -> {
                        JsonNode i = m.path("interactive");
                        JsonNode elegido = i.path("button_reply").isObject() ? i.path("button_reply") : i.path("list_reply");
                        txt = texto(elegido.path("title"));
                        boton = texto(elegido.path("id"));
                    }
                    case "button" -> {
                        txt = texto(m.path("button").path("text"));
                        boton = texto(m.path("button").path("payload"));
                    }
                    case "audio", "image", "video", "document", "sticker" -> {
                        media = texto(m.path(tipo).path("id"));
                        txt = texto(m.path(tipo).path("caption"));
                    }
                    default -> { /* ubicación, contactos, reacciones: solo se registra el tipo */ }
                }
                out.add(new MensajeEntrante(Canal.WHATSAPP, cuenta, de, nombreContacto(value, de),
                        id, tipo, recortar(txt), media, m.path("timestamp").asLong(0), idBoton(boton)));
            }
        }
    }

    private static String nombreContacto(JsonNode value, String waId) {
        for (JsonNode c : value.path("contacts")) {
            if (waId.equals(c.path("wa_id").asText())) return texto(c.path("profile").path("name"));
        }
        return null;
    }

    private void messaging(JsonNode entry, Canal canal, List<MensajeEntrante> out) {
        String cuenta = texto(entry.path("id"));
        for (JsonNode ev : entry.path("messaging")) {
            String de = texto(ev.path("sender").path("id"));
            if (cuenta == null || de == null || de.equals(cuenta)) continue;
            long ts = ev.path("timestamp").asLong(0) / 1000L;
            JsonNode msg = ev.path("message");
            if (msg.isObject()) {
                if (msg.path("is_echo").asBoolean(false)) continue;
                String id = texto(msg.path("mid"));
                if (id == null || id.length() > MAX_ID) continue;
                String txt = texto(msg.path("text"));
                String tipo = txt != null ? "text" : "adjunto";
                String media = null;
                JsonNode adj = msg.path("attachments");
                if (txt == null && adj.isArray() && !adj.isEmpty()) {
                    tipo = adj.get(0).path("type").asText("adjunto");
                    media = texto(adj.get(0).path("payload").path("url"));
                }
                String boton = idBoton(texto(msg.path("quick_reply").path("payload")));
                out.add(new MensajeEntrante(canal, cuenta, de, null, id, tipo, recortar(txt), media, ts, boton));
                continue;
            }
            JsonNode pb = ev.path("postback");
            if (pb.isObject()) {
                String id = texto(pb.path("mid"));
                if (id == null || id.length() > MAX_ID) continue;
                String txt = texto(pb.path("title"));
                out.add(new MensajeEntrante(canal, cuenta, de, null, id, "postback", recortar(txt), null, ts,
                        idBoton(texto(pb.path("payload")))));
            }
        }
    }

    private static String texto(JsonNode n) {
        if (n == null || n.isMissingNode() || n.isNull()) return null;
        String s = n.asText("").trim();
        return s.isEmpty() ? null : s;
    }

    /** Ids de botón: los arma HotClick (≤ 256 en WhatsApp); uno más largo se descarta. */
    static final int MAX_BOTON = 256;

    private static String idBoton(String s) {
        return s == null || s.length() > MAX_BOTON ? null : s;
    }

    private static String recortar(String s) {
        return s == null || s.length() <= MAX_TEXTO ? s : s.substring(0, MAX_TEXTO);
    }
}
