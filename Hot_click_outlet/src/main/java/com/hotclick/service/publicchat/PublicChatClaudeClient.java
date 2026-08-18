package com.hotclick.service.publicchat;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class PublicChatClaudeClient {

    private static final Logger log = LoggerFactory.getLogger(PublicChatClaudeClient.class);

    @Value("${anthropic.api-key:}")
    private String apiKey;

    private final JdbcTemplate jdbc;
    private final PublicChatPromptBuilder promptBuilder;
    private final PublicChatClaudeStreamer streamer;
    private final PublicChatMockResponses mockResponses;

    public PublicChatClaudeClient(JdbcTemplate jdbc,
                                  PublicChatPromptBuilder promptBuilder,
                                  PublicChatClaudeStreamer streamer,
                                  PublicChatMockResponses mockResponses) {
        this.jdbc = jdbc;
        this.promptBuilder = promptBuilder;
        this.streamer = streamer;
        this.mockResponses = mockResponses;
    }

    public boolean hasApiKey() {
        return apiKey != null && !apiKey.isBlank();
    }

    public String getEmpresaWhatsapp(Long empresaId) {
        try {
            return (String) jdbc.queryForMap(
                "SELECT COALESCE(numero_whatsapp, telefono_empresa, '50686667888') AS wa " +
                    "FROM hot_click_empresa_tb WHERE id_empresa = ?", empresaId).get("wa");
        } catch (Exception e) {
            return "50686667888";
        }
    }

    public String businessInfoText(Long empresaId, boolean isEnglish) {
        String wa = getEmpresaWhatsapp(empresaId);
        return promptBuilder.businessInfoText(wa, isEnglish);
    }

    public String whatsappContactText(Long empresaId, boolean isEnglish) {
        String wa = getEmpresaWhatsapp(empresaId);
        return promptBuilder.whatsappContactText(wa, isEnglish);
    }

    public String buildSalesSystemPrompt(Long empresaId, String context,
                                         List<Map<String, Object>> productos,
                                         boolean isEnglish, boolean isGift,
                                         Long maxBudget, Set<String> negations,
                                         boolean afterHours) {
        String wa = getEmpresaWhatsapp(empresaId);
        return promptBuilder.buildSalesSystemPrompt(wa, context, productos,
            isEnglish, isGift, maxBudget, negations, afterHours);
    }

    public void streamClaudeResponse(SseEmitter emitter, String userMessage,
                                     List<Map<String, Object>> productos,
                                     List<Map<String, Object>> history,
                                     Long empresaId, String context,
                                     boolean isEnglish, boolean isGift,
                                     Long maxBudget, Set<String> negations,
                                     boolean afterHours, List<String> smartOpts) {
        String wa = getEmpresaWhatsapp(empresaId);
        streamer.streamClaudeResponse(log, emitter, userMessage, productos, history, wa, context,
            isEnglish, isGift, maxBudget, negations, afterHours, smartOpts);
    }

    public void streamAdvisorResponse(SseEmitter emitter, String userMessage,
                                      Map<String, Object> ficha,
                                      List<Map<String, Object>> history,
                                      Long empresaId, boolean isEnglish, boolean afterHours,
                                      List<String> smartOpts) {
        String wa = getEmpresaWhatsapp(empresaId);
        streamer.streamAdvisor(log, emitter, userMessage, ficha, history, wa, isEnglish, afterHours, smartOpts);
    }

    public String generarRespuestaMock(List<Map<String, Object>> productos,
                                       List<Map<String, Object>> history,
                                       boolean isEnglish) {
        return mockResponses.generarRespuestaMock(productos, history, isEnglish);
    }

    public List<String> generateOpts(String context, List<Map<String, Object>> productos,
                                     String userMessage, boolean isEnglish, boolean afterHours) {
        return mockResponses.generateOpts(context, productos, userMessage, isEnglish, afterHours);
    }

    public List<String> generateAdvisorOpts(boolean isEnglish) {
        return mockResponses.generateAdvisorOpts(isEnglish);
    }

    public String generarRespuestaAsesor(Map<String, Object> ficha, boolean isEnglish) {
        return mockResponses.generarRespuestaAsesor(ficha, isEnglish);
    }
}
