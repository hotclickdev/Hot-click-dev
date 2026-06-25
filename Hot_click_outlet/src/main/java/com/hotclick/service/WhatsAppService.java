package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Usuario;
import com.hotclick.model.WaMensajeLog;
import com.hotclick.repository.WaMensajeLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.text.NumberFormat;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.time.LocalDateTime;
import java.util.stream.Collectors;

/**
 * Envía mensajes de WhatsApp via Meta Cloud API.
 * Si WHATSAPP_PHONE_ID o WHATSAPP_TOKEN no están configurados,
 * simula el envío (log en BD con estado SIMULADO) para poder
 * desarrollar y probar sin credenciales reales.
 *
 * Flujo: contexto del cliente → WaPlantilla aleatoria → Gemini personaliza → Meta API envía
 */
@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);
    private static final String META_URL = "https://graph.facebook.com/v19.0/%s/messages";
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final NumberFormat CRC = NumberFormat.getInstance(Locale.forLanguageTag("es-CR"));

    @Value("${whatsapp.phone-id:}")
    private String phoneId;

    @Value("${whatsapp.token:}")
    private String token;

    @Autowired private GeminiService geminiService;
    @Autowired private WaMensajeLogRepository logRepo;

    // ── API pública ───────────────────────────────────────────────────────────

    @Async
    public void enviarConfirmacionPedido(Pedido pedido) {
        Usuario u = pedido.getUsuarioFinal();
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",       u.getNombre());
        ctx.put("numeroPedido", pedido.getNumeroPedido());
        ctx.put("total",        CRC.format(pedido.getTotalPedido()));
        ctx.put("productos",    resumirProductos(pedido.getItems()));
        ctx.put("segmento",     segmento(u));

        enviar(u, pedido.getEmpresaId(), pedido.getNumeroPedido(),
               WaPlantilla.varianteAleatoria("CONFIRMACION_PEDIDO"), ctx);
    }

    @Async
    public void enviarGuiaAsignada(Pedido pedido) {
        Usuario u = pedido.getUsuarioFinal();
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",       u.getNombre());
        ctx.put("numeroPedido", pedido.getNumeroPedido());
        ctx.put("guia",         pedido.getNumeroGuia() != null ? pedido.getNumeroGuia() : "N/D");
        ctx.put("courier",      pedido.getUrlTracking() != null
                                && pedido.getUrlTracking().contains("correos") ? "Correos CR" : "HOTCLICK");

        enviar(u, pedido.getEmpresaId(), pedido.getNumeroPedido(),
               WaPlantilla.varianteAleatoria("GUIA_ASIGNADA"), ctx);
    }

    @Async
    public void enviarSolicitudResena(Pedido pedido) {
        Usuario u = pedido.getUsuarioFinal();
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",    u.getNombre());
        ctx.put("productos", resumirProductos(pedido.getItems()));
        ctx.put("puntos",    String.valueOf(u.getPuntosFidelidad()));
        ctx.put("segmento",  segmento(u));

        enviar(u, pedido.getEmpresaId(), pedido.getNumeroPedido(),
               WaPlantilla.varianteAleatoria("POST_ENTREGA_RESENA"), ctx);
    }

    @Async
    public void enviarCarritoAbandonado(Usuario u, Long empresaId, String productos) {
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",    u.getNombre());
        ctx.put("productos", productos);

        enviar(u, empresaId, null,
               WaPlantilla.varianteAleatoria("CARRITO_ABANDONADO"), ctx);
    }

    @Async
    public void enviarReactivacion(Usuario u, Long empresaId, String ultimoProducto) {
        if (u == null || u.getTelefono() == null) return;

        long dias = u.getFechaUltimoAcceso() != null
            ? ChronoUnit.DAYS.between(u.getFechaUltimoAcceso(), LocalDateTime.now(Constants.ZONA_CR))
            : 60;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",        u.getNombre());
        ctx.put("diasInactivo",  String.valueOf(dias));
        ctx.put("productos",     ultimoProducto != null ? ultimoProducto : "productos variados");
        ctx.put("puntos",        String.valueOf(u.getPuntosFidelidad()));
        ctx.put("segmento",      segmento(u));

        enviar(u, empresaId, null,
               WaPlantilla.varianteAleatoria("REACTIVACION"), ctx);
    }

    @Async
    public void enviarNuevoPedidoAEmprendedor(Pedido pedido) {
        if (pedido.getEmpresa() == null) return;
        String tel = pedido.getEmpresa().getNumeroWhatsapp() != null
            ? pedido.getEmpresa().getNumeroWhatsapp()
            : pedido.getEmpresa().getTelefonoEmpresa();
        if (tel == null || tel.isBlank()) return;

        Map<String, String> ctx = contextoEmprendedor(pedido);
        enviarANumero(tel, pedido.getEmpresaId(), pedido.getNumeroPedido(),
            WaPlantilla.varianteAleatoria("NUEVO_PEDIDO_EMPRENDEDOR"), ctx);
    }

    @Async
    public void enviarNuevoPedidoAAdminIT(Pedido pedido, String telefonoAdminIT) {
        if (telefonoAdminIT == null || telefonoAdminIT.isBlank()) return;

        Map<String, String> ctx = contextoEmprendedor(pedido);
        if (pedido.getUsuarioFinal() != null)
            ctx.put("nombreCliente", pedido.getUsuarioFinal().getNombre() != null
                ? pedido.getUsuarioFinal().getNombre() : "Invitado");
        else
            ctx.put("nombreCliente", "Invitado");

        enviarANumero(telefonoAdminIT, pedido.getEmpresaId(), pedido.getNumeroPedido(),
            WaPlantilla.varianteAleatoria("NUEVO_PEDIDO_ADMIN_IT"), ctx);
    }

    /**
     * Envío manual desde el CRM — admite cualquier escenario y contexto adicional.
     * Devuelve el texto enviado para mostrarlo en el timeline del CRM.
     */
    public String enviarDesdecrm(Usuario u, Long empresaId, String escenario,
                                  Map<String, String> ctxExtra) {
        if (u.getTelefono() == null) throw new RuntimeException("El cliente no tiene teléfono registrado");

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",   u.getNombre());
        ctx.put("segmento", segmento(u));
        ctx.put("puntos",   String.valueOf(u.getPuntosFidelidad()));
        if (ctxExtra != null) ctx.putAll(ctxExtra);

        WaPlantilla plantilla = WaPlantilla.varianteAleatoria(escenario);
        return enviar(u, empresaId, null, plantilla, ctx);
    }

    // ── Núcleo del envío ──────────────────────────────────────────────────────

    private String enviar(Usuario u, Long empresaId, String pedidoNum,
                           WaPlantilla plantilla, Map<String, String> ctx) {
        String texto = generarTexto(plantilla, ctx);
        String telefono = normalizarTelefono(u.getTelefono());

        WaMensajeLog entry = new WaMensajeLog();
        entry.setUsuarioId(u.getId());
        entry.setEmpresaId(empresaId);
        entry.setTelefono(telefono);
        entry.setTipoMensaje(plantilla.escenario);
        entry.setVariante(plantilla.name());
        entry.setTextoEnviado(texto);
        entry.setPedidoNumero(pedidoNum);

        if (!credencialesConfiguradas()) {
            entry.setEstado("SIMULADO");
            logRepo.save(entry);
            log.info("[WA-SIMULADO] {} → {}: {}", plantilla.escenario, telefono, texto);
            return texto;
        }

        try {
            String metaId = llamarMetaApi(telefono, texto);
            entry.setEstado("ENVIADO");
            entry.setMetaMessageId(metaId);
            log.info("[WA-ENVIADO] {} → {} (msgId={})", plantilla.escenario, telefono, metaId);
        } catch (Exception e) {
            entry.setEstado("ERROR");
            entry.setErrorDetalle(e.getMessage() != null ? e.getMessage().substring(0, Math.min(500, e.getMessage().length())) : "unknown");
            log.error("[WA-ERROR] {} → {}: {}", plantilla.escenario, telefono, e.getMessage());
        }

        logRepo.save(entry);
        return texto;
    }

    // ── Gemini personaliza el texto ───────────────────────────────────────────

    private String generarTexto(WaPlantilla plantilla, Map<String, String> ctx) {
        String prompt = plantilla.promptTemplate;
        for (Map.Entry<String, String> e : ctx.entrySet()) {
            prompt = prompt.replace("{{" + e.getKey() + "}}", e.getValue() != null ? e.getValue() : "");
        }
        try {
            String resultado = llamarGeminiTexto(prompt);
            if (resultado != null && !resultado.isBlank()) return limpiarTexto(resultado);
        } catch (Exception e) {
            log.warn("Gemini no disponible para WA, usando fallback: {}", e.getMessage());
        }
        return fallback(plantilla, ctx);
    }

    private String llamarGeminiTexto(String prompt) {
        try {
            var parts = List.of(Map.of("text", prompt));
            Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", parts)),
                "generationConfig", Map.of("temperature", 0.85, "maxOutputTokens", 120)
            );
            String apiKey = obtenerGeminiKey();
            if (apiKey == null || apiKey.isBlank()) return null;

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

            ResponseEntity<Map> resp = new RestTemplate().exchange(
                url, HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);

            @SuppressWarnings("unchecked")
            List<?> candidates = (List<?>) resp.getBody().get("candidates");
            if (candidates == null || candidates.isEmpty()) return null;
            @SuppressWarnings("unchecked")
            Map<?, ?> content = (Map<?, ?>) ((Map<?, ?>) candidates.get(0)).get("content");
            @SuppressWarnings("unchecked")
            List<?> resParts = (List<?>) content.get("parts");
            return (String) ((Map<?, ?>) resParts.get(0)).get("text");
        } catch (Exception e) {
            log.debug("Gemini WA error: {}", e.getMessage());
            return null;
        }
    }

    // ── Meta Cloud API ────────────────────────────────────────────────────────

    private String llamarMetaApi(String telefono, String texto) {
        Map<String, Object> body = Map.of(
            "messaging_product", "whatsapp",
            "to",                telefono,
            "type",              "text",
            "text",              Map.of("body", texto, "preview_url", false)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        String url = String.format(META_URL, phoneId);
        ResponseEntity<String> resp = new RestTemplate().exchange(
            url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);

        if (!resp.getStatusCode().is2xxSuccessful())
            throw new RuntimeException("Meta API status " + resp.getStatusCode());

        try {
            JsonNode node = JSON.readTree(resp.getBody());
            JsonNode msgs = node.path("messages");
            if (msgs.isArray() && msgs.size() > 0)
                return msgs.get(0).path("id").asText("");
        } catch (Exception ignored) {}
        return "ok";
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private boolean credencialesConfiguradas() {
        return phoneId != null && !phoneId.isBlank() && token != null && !token.isBlank();
    }

    /** Envía a un número raw (empresa, admin) sin necesidad de un Usuario registrado. */
    private String enviarANumero(String telefono, Long empresaId, String pedidoNum,
                                  WaPlantilla plantilla, Map<String, String> ctx) {
        String texto   = generarTexto(plantilla, ctx);
        String telNorm = normalizarTelefono(telefono);

        WaMensajeLog entry = new WaMensajeLog();
        entry.setEmpresaId(empresaId);
        entry.setTelefono(telNorm);
        entry.setTipoMensaje(plantilla.escenario);
        entry.setVariante(plantilla.name());
        entry.setTextoEnviado(texto);
        entry.setPedidoNumero(pedidoNum);

        if (!credencialesConfiguradas()) {
            entry.setEstado("SIMULADO");
            logRepo.save(entry);
            log.info("[WA-SIMULADO] {} → {}: {}", plantilla.escenario, telNorm, texto);
            return texto;
        }

        try {
            String metaId = llamarMetaApi(telNorm, texto);
            entry.setEstado("ENVIADO");
            entry.setMetaMessageId(metaId);
            log.info("[WA-ENVIADO] {} → {} (msgId={})", plantilla.escenario, telNorm, metaId);
        } catch (Exception e) {
            entry.setEstado("ERROR");
            entry.setErrorDetalle(e.getMessage() != null
                ? e.getMessage().substring(0, Math.min(500, e.getMessage().length())) : "unknown");
            log.error("[WA-ERROR] {} → {}: {}", plantilla.escenario, telNorm, e.getMessage());
        }

        logRepo.save(entry);
        return texto;
    }

    /** Construye el contexto común para notificaciones de venta al emprendedor y admin IT. */
    private Map<String, String> contextoEmprendedor(Pedido pedido) {
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
    private String normalizarTelefono(String tel) {
        String limpio = tel.replaceAll("[^0-9]", "");
        if (limpio.startsWith("506")) return limpio;
        if (limpio.length() == 8) return "506" + limpio;
        return limpio;
    }

    private String resumirProductos(List<PedidoItem> items) {
        if (items == null || items.isEmpty()) return "tu pedido";
        return items.stream()
            .limit(2)
            .map(i -> i.getProducto() != null ? i.getProducto().getNombreProducto() : "producto")
            .collect(Collectors.joining(", "))
            + (items.size() > 2 ? " y " + (items.size() - 2) + " más" : "");
    }

    private String segmento(Usuario u) {
        return u.getSegmento() != null && !u.getSegmento().isBlank() ? u.getSegmento() : "NUEVO";
    }

    private String limpiarTexto(String t) {
        return t.strip()
                .replaceAll("^[\"']|[\"']$", "")
                .replaceAll("\\*\\*", "")
                .strip();
    }

    private String fallback(WaPlantilla p, Map<String, String> ctx) {
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

    @Value("${google.gemini.api-key:}")
    private String geminiKey;

    private String obtenerGeminiKey() {
        return geminiKey;
    }
}
