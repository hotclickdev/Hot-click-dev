package com.hotclick.agente.canal;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.service.whatsapp.PlantillaMeta;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import com.hotclick.agente.conexion.MetaRechazoException;
import com.hotclick.exception.IntegracionExternaException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

/**
 * Envío por Graph API con el token de la cuenta: WhatsApp en {@code /{phone_number_id}/messages}; Instagram y
 * Messenger por el Send API en {@code /me/messages} (el token de página resuelve "me"). Sin token → simulado.
 */
@Component
public class MetaCanalMensajeria implements CanalMensajeria {

    private static final Logger log = LoggerFactory.getLogger(MetaCanalMensajeria.class);
    private static final String INTEGRACION = "meta-graph";
    static final String VERSION_POR_DEFECTO = "v23.0";
    static final int MAX_WHATSAPP = 4096;
    static final int MAX_SOCIAL = 1000;
    private static final ObjectMapper JSON = new ObjectMapper();

    private final CanalCuentaService cuentas;
    private final RestTemplate http;
    private final String graph;

    @org.springframework.beans.factory.annotation.Autowired
    public MetaCanalMensajeria(CanalCuentaService cuentas,
                               @org.springframework.beans.factory.annotation.Value("${meta.graph-version:v23.0}") String graphVersion) {
        this(cuentas, nuevoCliente(), graphVersion);
    }

    MetaCanalMensajeria(CanalCuentaService cuentas, RestTemplate http) {
        this(cuentas, http, VERSION_POR_DEFECTO);
    }

    MetaCanalMensajeria(CanalCuentaService cuentas, RestTemplate http, String graphVersion) {
        this.cuentas = cuentas;
        this.http = http;
        this.graph = "https://graph.facebook.com/" + versionValida(graphVersion) + "/";
    }

    /** Solo vNN.N; cualquier otra cosa (vacío, mal escrito) cae a la versión por defecto. */
    static String versionValida(String v) {
        String x = v == null ? "" : v.trim().toLowerCase(java.util.Locale.ROOT);
        return x.matches("v\\d{1,2}\\.\\d") ? x : VERSION_POR_DEFECTO;
    }

    @Override
    public String enviarTexto(CanalCuenta cuenta, String destinatario, String texto) {
        validar(cuenta, destinatario);
        if (texto == null || texto.isBlank())
            throw new IllegalArgumentException("destinatario y texto son obligatorios");
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        boolean wa = MensajesInteractivos.esWhatsapp(cuenta.getTipo());
        String cuerpoTexto = recortar(texto, wa ? MAX_WHATSAPP : MAX_SOCIAL);
        Map<String, Object> body = wa
            ? Map.of("messaging_product", "whatsapp", "to", destinatario, "type", "text",
                     "text", Map.of("body", cuerpoTexto, "preview_url", false))
            : Map.of("recipient", Map.of("id", destinatario), "messaging_type", "RESPONSE",
                     "message", Map.of("text", cuerpoTexto));
        return post(cuenta, token, body);
    }

    @Override
    public String enviarPlantilla(CanalCuenta cuenta, String destinatario, PlantillaMeta plantilla, List<String> parametros) {
        validar(cuenta, destinatario);
        if (plantilla == null || !MensajesInteractivos.esWhatsapp(cuenta.getTipo()))
            throw new UnsupportedOperationException("Solo WhatsApp tiene plantillas");
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        return post(cuenta, token, plantilla.cuerpoWhatsApp(destinatario, parametros == null ? List.of() : parametros));
    }

    @Override
    public String enviarProducto(CanalCuenta cuenta, String destinatario, TarjetaProducto p) {
        validar(cuenta, destinatario);
        if (p == null || p.nombre() == null || p.nombre().isBlank())
            throw new IllegalArgumentException("el producto y su nombre son obligatorios");
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        Map<String, Object> body = MensajesInteractivos.esWhatsapp(cuenta.getTipo())
            ? MensajesInteractivos.waProducto(destinatario, p)
            : MensajesInteractivos.socialProducto(destinatario, p);
        return conRespaldo(cuenta, destinatario, token, body, MensajesInteractivos.respaldoProducto(p));
    }

    @Override
    public String enviarProductoCatalogo(CanalCuenta cuenta, String destinatario, ReferenciaCatalogo ref,
                                         TarjetaProducto respaldo) {
        validar(cuenta, destinatario);
        boolean wa = MensajesInteractivos.esWhatsapp(cuenta.getTipo());
        boolean completa = ref != null && ref.catalogoId() != null && ref.retailerId() != null
            && (wa || ref.metaProductoId() != null);
        if (!completa) return enviarProducto(cuenta, destinatario, respaldo);
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        Map<String, Object> body = wa
            ? MensajesInteractivos.waProductoCatalogo(destinatario, ref.catalogoId(), ref.retailerId(),
                respaldo == null ? "Mira este producto"
                    : MensajesInteractivos.textoProducto(respaldo, MensajesInteractivos.WA_MAX_CUERPO))
            : MensajesInteractivos.socialProductoCatalogo(destinatario, ref.metaProductoId());
        try {
            return post(cuenta, token, body);
        } catch (HttpClientErrorException e) {
            log.warn("[canal] Meta rechazó la tarjeta del catálogo (cuenta {}, HTTP {}); se usa la tarjeta normal",
                cuenta.getId(), e.getStatusCode().value());
            return enviarProducto(cuenta, destinatario, respaldo);
        }
    }

    @Override
    public String enviarListaProductosCatalogo(CanalCuenta cuenta, String destinatario, String catalogoId,
                                               String titulo, String cuerpo, List<String> retailerIds,
                                               List<TarjetaProducto> respaldos) {
        validar(cuenta, destinatario);
        if (!MensajesInteractivos.esWhatsapp(cuenta.getTipo()) || catalogoId == null || retailerIds == null
                || retailerIds.isEmpty() || titulo == null || cuerpo == null || cuerpo.isBlank()) {
            return CanalMensajeria.super.enviarListaProductosCatalogo(
                cuenta, destinatario, catalogoId, titulo, cuerpo, retailerIds, respaldos);
        }
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        try {
            return post(cuenta, token,
                MensajesInteractivos.waListaProductos(destinatario, catalogoId, titulo, cuerpo, retailerIds));
        } catch (HttpClientErrorException e) {
            log.warn("[canal] Meta rechazó la lista de productos (cuenta {}, HTTP {}); se mandan tarjetas normales",
                cuenta.getId(), e.getStatusCode().value());
            return CanalMensajeria.super.enviarListaProductosCatalogo(
                cuenta, destinatario, catalogoId, titulo, cuerpo, retailerIds, respaldos);
        }
    }

    /**
     * Plantilla MARKETING aprobada. 4xx (plantilla no aprobada, número bloqueado, límite de marketing por usuario) se
     * traduce a {@link MetaRechazoException} con el código de Meta, sin cuerpo; red, 429 y 5xx a
     * {@link IntegracionExternaException}, para que quien envía decida entre fallar o reintentar.
     */
    @Override
    public String enviarPlantillaMarketing(CanalCuenta cuenta, String destinatario, String nombrePlantilla,
                                           String idioma, List<String> parametros) {
        validar(cuenta, destinatario);
        if (!MensajesInteractivos.esWhatsapp(cuenta.getTipo()))
            throw new UnsupportedOperationException("Solo WhatsApp tiene plantillas");
        if (nombrePlantilla == null || nombrePlantilla.isBlank())
            throw new IllegalArgumentException("la plantilla es obligatoria");
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        try {
            return post(cuenta, token, MensajesInteractivos.waPlantilla(destinatario, nombrePlantilla,
                idioma == null || idioma.isBlank() ? "es" : idioma, parametros == null ? List.of() : parametros));
        } catch (HttpClientErrorException e) {
            int status = e.getStatusCode().value();
            if (status == 429) throw new IntegracionExternaException(INTEGRACION,
                IntegracionExternaException.Tipo.RATE_LIMIT, "Graph HTTP 429");
            throw new MetaRechazoException(codigoMeta(e, status));
        } catch (HttpServerErrorException e) {
            throw new IntegracionExternaException(INTEGRACION, IntegracionExternaException.Tipo.IO_ERROR,
                "Graph HTTP " + e.getStatusCode().value());
        } catch (ResourceAccessException e) {
            throw new IntegracionExternaException(INTEGRACION, IntegracionExternaException.Tipo.TIMEOUT,
                "Graph sin respuesta");
        }
    }

    private static int codigoMeta(HttpClientErrorException e, int status) {
        try {
            return JSON.readTree(e.getResponseBodyAsString()).path("error").path("code").asInt(status);
        } catch (Exception ex) {
            return status;
        }
    }

    @Override
    public String enviarBotones(CanalCuenta cuenta, String destinatario, String texto, List<Boton> botones) {
        validar(cuenta, destinatario);
        if (texto == null || texto.isBlank() || botones == null || MensajesInteractivos.botonesValidos(botones, 1).isEmpty())
            throw new IllegalArgumentException("texto y al menos un botón son obligatorios");
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        Map<String, Object> body = MensajesInteractivos.esWhatsapp(cuenta.getTipo())
            ? MensajesInteractivos.waBotones(destinatario, texto, botones)
            : MensajesInteractivos.socialQuickReplies(destinatario, texto, botones);
        return conRespaldo(cuenta, destinatario, token, body, MensajesInteractivos.respaldoBotones(texto, botones));
    }

    @Override
    public String enviarLista(CanalCuenta cuenta, String destinatario, String texto, String textoBoton, List<FilaLista> filas) {
        validar(cuenta, destinatario);
        if (texto == null || texto.isBlank() || filas == null || filas.isEmpty())
            throw new IllegalArgumentException("texto y al menos una fila son obligatorios");
        String respaldo = MensajesInteractivos.respaldoLista(texto, filas);
        if (!MensajesInteractivos.esWhatsapp(cuenta.getTipo()))
            return enviarTexto(cuenta, destinatario, respaldo); // IG/Messenger no tienen lista
        String token = tokenOSimulado(cuenta);
        if (token == null) return "simulado";
        return conRespaldo(cuenta, destinatario, token,
            MensajesInteractivos.waLista(destinatario, texto, textoBoton, filas), respaldo);
    }

    private static void validar(CanalCuenta cuenta, String destinatario) {
        if (cuenta == null || cuenta.getEstado() != EstadoCanal.ACTIVA)
            throw new IllegalStateException("La cuenta del canal no está activa");
        if (destinatario == null || destinatario.isBlank())
            throw new IllegalArgumentException("destinatario y texto son obligatorios");
    }

    /** @return token, o null si la cuenta no tiene (modo simulado). */
    private String tokenOSimulado(CanalCuenta cuenta) {
        String token = cuentas.tokenDe(cuenta);
        if (token == null || token.isBlank()) {
            log.info("[canal] modo simulado (cuenta {} sin token): mensaje no enviado", cuenta.getId());
            return null;
        }
        return token;
    }

    /** Envía el mensaje rico; si Meta lo rechaza (4xx) reenvía como texto con opciones numeradas. */
    private String conRespaldo(CanalCuenta cuenta, String destinatario, String token, Map<String, Object> body, String respaldo) {
        try {
            return post(cuenta, token, body);
        } catch (HttpClientErrorException e) {
            log.warn("[canal] Meta rechazó el mensaje interactivo (cuenta {}, HTTP {}); se envía respaldo en texto",
                cuenta.getId(), e.getStatusCode().value());
            return enviarTexto(cuenta, destinatario, respaldo);
        }
    }

    private String post(CanalCuenta cuenta, String token, Map<String, Object> body) {
        boolean wa = MensajesInteractivos.esWhatsapp(cuenta.getTipo());
        String url = wa ? graph + cuenta.getIdExterno() + "/messages" : graph + "me/messages";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        String resp = http.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class).getBody();
        return idDeRespuesta(resp, wa);
    }

    static String recortar(String t, int max) {
        return t.length() <= max ? t : t.substring(0, max - 1) + "…";
    }

    private static String idDeRespuesta(String resp, boolean wa) {
        try {
            JsonNode n = JSON.readTree(resp);
            if (wa) {
                JsonNode m = n.path("messages");
                if (m.isArray() && m.size() > 0) return m.get(0).path("id").asText("ok");
            } else {
                String id = n.path("message_id").asText("");
                if (!id.isEmpty()) return id;
            }
        } catch (Exception e) {
            log.debug("[canal] respuesta de Meta no interpretable");
        }
        return "ok";
    }

    private static RestTemplate nuevoCliente() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(10_000);
        return new RestTemplate(f);
    }
}
