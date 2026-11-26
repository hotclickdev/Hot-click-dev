package com.hotclick.agente.webhook;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.metricas.AlertaCalidadMeta;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * AG-02 · Webhook entrante de Meta: WhatsApp Cloud API, Instagram y Messenger por la misma ruta.
 *
 * <p>La ruta /api/webhooks/** es pública (SecurityAuthorizationRules); la autenticación real es:
 * <ul>
 *   <li>GET: {@code hub.verify_token} contra {@code meta.webhook.verify-token}; devuelve {@code hub.challenge}.</li>
 *   <li>POST: firma {@code X-Hub-Signature-256} sobre el cuerpo crudo con el secreto de la app.</li>
 * </ul>
 * Mismo molde que el webhook de Telegram: el cuerpo se lee a mano con un tope real de {@value #MAX_BODY_BYTES} bytes
 * (también chunked), firma inválida → 403 sin parsear, y a un evento válido se responde siempre 200 aunque el
 * procesamiento falle, para que Meta no reintente en bucle. Cada mensaje pasa por {@link MetaEventoDedup} antes de
 * llegar a los {@link MensajeEntranteHandler}.
 *
 * <p>Nunca se registran teléfonos, ids de usuario ni texto de mensajes (Ley 8968).
 */
@RestController
@RequestMapping("/api/webhooks")
public class MetaWebhookController {

    private static final Logger log = LoggerFactory.getLogger(MetaWebhookController.class);

    /** Un lote de Meta pesa pocos KB; mismo tope que Telegram y ONVO. */
    static final int MAX_BODY_BYTES = 64 * 1024;

    private final MetaWebhookFirma firma;
    private final MetaWebhookParser parser;
    private final MetaEventoDedup dedup;
    private final ObjectProvider<MensajeEntranteHandler> handlers;
    private final ObjectMapper objectMapper;
    private final ObjectProvider<EstadoEntranteHandler> estadoHandlers;
    private final ObjectProvider<AlertaCalidadMeta> calidad;

    public MetaWebhookController(MetaWebhookFirma firma, MetaWebhookParser parser, MetaEventoDedup dedup,
                                 ObjectProvider<MensajeEntranteHandler> handlers, ObjectMapper objectMapper) {
        this(firma, parser, dedup, handlers, objectMapper, null, null);
    }

    /** Con avisos de calidad de Meta (AG-32), sin handlers de estado. */
    public MetaWebhookController(MetaWebhookFirma firma, MetaWebhookParser parser, MetaEventoDedup dedup,
                                 ObjectProvider<MensajeEntranteHandler> handlers, ObjectMapper objectMapper,
                                 ObjectProvider<AlertaCalidadMeta> calidad) {
        this(firma, parser, dedup, handlers, objectMapper, null, calidad);
    }

    @Autowired // con varios constructores Spring no elige solo
    public MetaWebhookController(MetaWebhookFirma firma, MetaWebhookParser parser, MetaEventoDedup dedup,
                                 ObjectProvider<MensajeEntranteHandler> handlers, ObjectMapper objectMapper,
                                 ObjectProvider<EstadoEntranteHandler> estadoHandlers,
                                 ObjectProvider<AlertaCalidadMeta> calidad) {
        this.firma = firma;
        this.parser = parser;
        this.dedup = dedup;
        this.handlers = handlers;
        this.objectMapper = objectMapper;
        this.estadoHandlers = estadoHandlers;
        this.calidad = calidad;
    }

    @GetMapping(value = "/meta", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> verificar(@RequestParam(value = "hub.mode", required = false) String modo,
                                            @RequestParam(value = "hub.verify_token", required = false) String token,
                                            @RequestParam(value = "hub.challenge", required = false) String challenge) {
        if (!"subscribe".equals(modo) || challenge == null || challenge.isBlank() || challenge.length() > 200
                || !firma.tokenValido(token)) {
            log.warn("[meta-webhook] verificación de suscripción rechazada");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        log.info("[meta-webhook] suscripción verificada");
        return ResponseEntity.ok(challenge);
    }

    @PostMapping("/meta")
    public ResponseEntity<Void> recibir(@RequestHeader(value = "X-Hub-Signature-256", required = false) String cabecera,
                                        HttpServletRequest request) {
        if (!firma.configurado()) {
            log.warn("[meta-webhook] evento rechazado: falta meta.app-secret o meta.webhook.verify-token");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }
        if (request.getContentLengthLong() > MAX_BODY_BYTES) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build();
        }
        byte[] cuerpo;
        try (InputStream in = request.getInputStream()) {
            cuerpo = in.readNBytes(MAX_BODY_BYTES + 1); // tope real: también con Transfer-Encoding: chunked
        } catch (IOException e) {
            log.warn("[meta-webhook] no se pudo leer el cuerpo — {}", e.getClass().getSimpleName());
            return ResponseEntity.badRequest().build();
        }
        if (cuerpo.length > MAX_BODY_BYTES) {
            log.warn("[meta-webhook] cuerpo mayor a {} bytes rechazado", MAX_BODY_BYTES);
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).build();
        }
        // La firma se calcula sobre los bytes crudos, ANTES de parsear.
        if (!firma.firmaValida(cuerpo, cabecera)) {
            log.warn("[meta-webhook] evento rechazado: firma inválida o ausente");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        JsonNode raiz;
        try {
            raiz = objectMapper.readTree(cuerpo);
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        }
        if (raiz == null || !raiz.isObject()) {
            return ResponseEntity.badRequest().build();
        }

        try {
            despachar(parser.parsear(raiz));
        } catch (RuntimeException e) {
            log.error("[meta-webhook] error procesando evento — {}", e.getClass().getSimpleName());
        }
        try {
            despacharEstados(parser.parsearEstados(raiz));
        } catch (RuntimeException e) {
            log.error("[meta-webhook] error procesando estados — {}", e.getClass().getSimpleName());
        }
        registrarAvisosDeMeta(raiz);
        return ResponseEntity.ok().build();
    }

    /** Acuses de entrega/lectura y estado de plantillas. Idempotentes: no pasan por la deduplicación de mensajes. */
    private void despacharEstados(EstadoEntrante estados) {
        if (estadoHandlers == null || estados.sinEventos()) return;
        List<EstadoEntranteHandler> hs = estadoHandlers.orderedStream().toList();
        for (EstadoEntrante.EstadoMensaje m : estados.mensajes()) {
            for (EstadoEntranteHandler h : hs) {
                try {
                    h.estado(m);
                } catch (RuntimeException e) {
                    log.error("[meta-webhook] handler de estado {} falló — {}",
                        h.getClass().getSimpleName(), e.getClass().getSimpleName());
                }
            }
        }
        for (EstadoEntrante.EstadoPlantilla p : estados.plantillas()) {
            for (EstadoEntranteHandler h : hs) {
                try {
                    h.plantilla(p);
                } catch (RuntimeException e) {
                    log.error("[meta-webhook] handler de plantilla {} falló — {}",
                        h.getClass().getSimpleName(), e.getClass().getSimpleName());
                }
            }
        }
    }

    /** AG-32: avisos de cuenta o calidad del número (no son mensajes). Un fallo aquí nunca cambia la respuesta a Meta. */
    private void registrarAvisosDeMeta(JsonNode raiz) {
        AlertaCalidadMeta registrador = calidad == null ? null : calidad.getIfAvailable();
        if (registrador == null) return;
        try {
            registrador.registrar(raiz);
        } catch (RuntimeException e) {
            log.error("[meta-webhook] error registrando avisos de Meta — {}", e.getClass().getSimpleName());
        }
    }

    private void despachar(List<MensajeEntrante> mensajes) {
        List<MensajeEntranteHandler> hs = handlers.orderedStream().toList();
        int nuevos = 0;
        for (MensajeEntrante m : mensajes) {
            if (!dedup.esNuevo(m.mensajeId(), m.canal())) continue;
            nuevos++;
            for (MensajeEntranteHandler h : hs) {
                try {
                    h.manejar(m);
                } catch (RuntimeException e) {
                    log.error("[meta-webhook] handler {} falló con {} — {}",
                        h.getClass().getSimpleName(), m, e.getClass().getSimpleName());
                }
            }
        }
        if (!mensajes.isEmpty()) {
            log.info("[meta-webhook] {} mensaje(s), {} nuevo(s), {} handler(s)", mensajes.size(), nuevos, hs.size());
        }
    }
}
