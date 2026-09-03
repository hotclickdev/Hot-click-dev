package com.hotclick.service.publicchat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Catálogo de descubrimiento: fichas en pantalla desde el primer pedido de producto.
 */
@Component
public class PublicChatDiscoveryHandler {

    private static final Logger log = LoggerFactory.getLogger(PublicChatDiscoveryHandler.class);

    private final JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;
    private final PublicChatIntentHelper intentHelper;
    private final PublicChatProductSearch productSearch;
    private final PublicChatClaudeClient claudeClient;

    public PublicChatDiscoveryHandler(JdbcTemplate jdbc, ObjectMapper objectMapper,
                                      PublicChatIntentHelper intentHelper,
                                      PublicChatProductSearch productSearch,
                                      PublicChatClaudeClient claudeClient) {
        this.jdbc = jdbc;
        this.objectMapper = objectMapper;
        this.intentHelper = intentHelper;
        this.productSearch = productSearch;
        this.claudeClient = claudeClient;
    }

    public void responder(Long empresaId, boolean marketplace, String userMessage, int offset,
                          List<Map<String, Object>> history, String context,
                          List<Long> focusIds, SseEmitter emitter) throws Exception {
        boolean isEnglish = intentHelper.isEnglish(userMessage);
        Long maxBudget = intentHelper.extractMaxBudget(userMessage);
        boolean isGift = intentHelper.isGiftIntent(userMessage);
        Set<String> negations = intentHelper.extractNegations(userMessage);
        boolean afterHours = intentHelper.isOutsideBusinessHours();
        String intent = intentHelper.classifyIntent(userMessage, isGift, maxBudget);

        boolean showAll = intentHelper.isShowAllOrPopularQuery(userMessage);
        boolean showOffers = !showAll && intentHelper.isOfferQuery(userMessage);
        boolean tieneTerminos = !intentHelper.userTerms(userMessage).isEmpty();
        boolean mostrarFichas = fichasEnPantalla(context, showAll, showOffers, tieneTerminos);

        List<Map<String, Object>> page = pagina(empresaId, marketplace, userMessage, offset,
            history, focusIds, showAll, showOffers, maxBudget, negations,
            intentHelper.isPersonalizedIntent(userMessage));
        enviarProductos(emitter, mostrarFichas ? page : List.of(), mostrarFichas && page.size() >= productSearch.getPageSize(), userMessage);
        logChat(empresaId, userMessage, intent, isEnglish, maxBudget, afterHours, page.size(),
            showAll || showOffers ? "" : intentHelper.buildTsQuery(userMessage));

        if (mostrarFichas && page.isEmpty()) {
            enviarSinResultado(emitter, isEnglish);
            return;
        }
        streamVenta(emitter, userMessage, page, history, empresaId, marketplace, context,
            isEnglish, isGift, maxBudget, negations, afterHours, mostrarFichas);
    }

    static boolean fichasEnPantalla(String context, boolean showAll, boolean showOffers,
                                    boolean tieneTerminos) {
        if (context != null && context.startsWith("CARRITO")) return true;
        return PublicChatTurnos.tieneIntencionProducto(showAll, showOffers, tieneTerminos);
    }

    private List<Map<String, Object>> pagina(Long empresaId, boolean marketplace, String userMessage,
                                             int offset, List<Map<String, Object>> history, List<Long> focusIds,
                                             boolean showAll, boolean showOffers, Long maxBudget, Set<String> negations,
                                             boolean preferirPersonalizado) {
        boolean isFaqFollowUp = !showAll && !showOffers && history != null && !history.isEmpty()
            && focusIds != null && !focusIds.isEmpty() && intentHelper.isProductFaqFollowUp(userMessage);
        String tsQuery = (showAll || showOffers || isFaqFollowUp) ? "" : intentHelper.buildTsQuery(userMessage);
        List<Map<String, Object>> productos = buscar(empresaId, marketplace, userMessage, offset,
            focusIds, showAll, showOffers, isFaqFollowUp, tsQuery, maxBudget, negations, preferirPersonalizado);
        if (isFaqFollowUp && productos.isEmpty()) {
            productos = productSearch.buscarProductos(
                empresaId, marketplace, intentHelper.buildTsQuery(userMessage),
                userMessage, offset, maxBudget, negations, preferirPersonalizado);
        }
        return productos.stream().limit(productSearch.getPageSize()).toList();
    }

    private List<Map<String, Object>> buscar(Long empresaId, boolean marketplace, String userMessage,
                                             int offset, List<Long> focusIds, boolean showAll, boolean showOffers,
                                             boolean isFaqFollowUp, String tsQuery, Long maxBudget, Set<String> negations,
                                             boolean preferirPersonalizado) {
        if (isFaqFollowUp) return productSearch.buscarPorIds(empresaId, marketplace, focusIds);
        if (showAll) return productSearch.buscarPopulares(empresaId, marketplace, offset);
        if (showOffers) return productSearch.buscarEnOferta(empresaId, marketplace, offset);
        return productSearch.buscarProductos(empresaId, marketplace, tsQuery, userMessage, offset,
            maxBudget, negations, preferirPersonalizado);
    }

    private void enviarProductos(SseEmitter emitter, List<Map<String, Object>> page,
                                 boolean hasMore, String userMessage) throws Exception {
        Map<String, Object> productEvent = new LinkedHashMap<>();
        productEvent.put("productos", page);
        productEvent.put("hasMore", hasMore);
        productEvent.put("query", userMessage);
        emitter.send(SseEmitter.event().name("products").data(objectMapper.writeValueAsString(productEvent)));
    }

    private void logChat(Long empresaId, String userMessage, String intent, boolean isEnglish,
                         Long maxBudget, boolean afterHours, int encontrados, String tsQuery) {
        try {
            jdbc.update(
                "INSERT INTO hot_click_chat_log_tb (fk_id_empresa, idioma, intencion, mensaje_length, " +
                    "productos_encontrados, budget_detectado, terminos_busqueda, fuera_horario) " +
                    "VALUES (?,?,?,?,?,?,?,?)",
                empresaId, isEnglish ? "en" : "es", intent, userMessage.length(),
                encontrados, maxBudget, tsQuery, afterHours);
        } catch (Exception e) {
            log.debug("[Chat] Analytics log failed: {}", e.getMessage());
        }
    }

    private void enviarSinResultado(SseEmitter emitter, boolean isEnglish) throws Exception {
        String noResult = isEnglish
            ? "I didn't find products for that. Could you describe what you're looking for? Example: living room, kitchen, bedroom…"
            : "No encontré productos para eso. ¿Podés describirlo con otras palabras? Ej: sala, cocina, jardín, dormitorio…";
        emitter.send(SseEmitter.event().name("delta").data(objectMapper.writeValueAsString(Map.of("text", noResult))));
        List<String> opts = isEnglish
            ? List.of("Show popular items", "What's on sale?")
            : List.of("Ver productos populares", "¿Qué hay en oferta?");
        emitter.send(SseEmitter.event().name("done").data(objectMapper.writeValueAsString(Map.of("opts", opts))));
        emitter.complete();
    }

    private void streamVenta(SseEmitter emitter, String userMessage, List<Map<String, Object>> page,
                             List<Map<String, Object>> history, Long empresaId, boolean marketplace, String context,
                             boolean isEnglish, boolean isGift, Long maxBudget, Set<String> negations,
                             boolean afterHours, boolean mostrarFichas) throws Exception {
        List<String> smartOpts = mostrarFichas
            ? claudeClient.generateOpts(context, page, userMessage, isEnglish, afterHours)
            : List.of();
        if (claudeClient.hasApiKey()) {
            claudeClient.streamClaudeResponse(emitter, userMessage, page, history, empresaId, marketplace, context,
                isEnglish, isGift, maxBudget, negations, afterHours, smartOpts, mostrarFichas);
            return;
        }
        String texto = claudeClient.generarRespuestaMock(page, history, isEnglish);
        emitter.send(SseEmitter.event().name("delta").data(objectMapper.writeValueAsString(Map.of("text", texto))));
        emitter.send(SseEmitter.event().name("done").data(objectMapper.writeValueAsString(Map.of("opts", smartOpts))));
        emitter.complete();
    }
}
