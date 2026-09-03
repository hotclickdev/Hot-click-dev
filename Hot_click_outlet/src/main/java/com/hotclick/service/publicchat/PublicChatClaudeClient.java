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
        return getEmpresaChatInfo(empresaId).whatsapp();
    }

    public EmpresaChatInfo getEmpresaChatInfo(Long empresaId) {
        try {
            Map<String, Object> row = jdbc.queryForMap(
                "SELECT COALESCE(numero_whatsapp, telefono_empresa, '50686667888') AS wa, "
                    + "COALESCE(NULLIF(TRIM(nombre_comercial), ''), 'la tienda') AS nombre "
                    + "FROM hot_click_empresa_tb WHERE id_empresa = ?", empresaId);
            return new EmpresaChatInfo(
                String.valueOf(row.get("wa")),
                String.valueOf(row.get("nombre")));
        } catch (Exception e) {
            log.debug("[Chat] Empresa info fallback: {}", e.getMessage());
            return new EmpresaChatInfo("50686667888", "la tienda");
        }
    }

    public String businessInfoText(Long empresaId, boolean marketplace, boolean isEnglish) {
        EmpresaChatInfo info = getEmpresaChatInfo(empresaId);
        return promptBuilder.businessInfoText(info.whatsapp(), info.nombre(), marketplace, isEnglish);
    }

    public String whatsappContactText(Long empresaId, boolean isEnglish) {
        String wa = getEmpresaWhatsapp(empresaId);
        return promptBuilder.whatsappContactText(wa, isEnglish);
    }

    public void streamClaudeResponse(SseEmitter emitter, String userMessage,
                                     List<Map<String, Object>> productos,
                                     List<Map<String, Object>> history,
                                     Long empresaId, boolean marketplace, String context,
                                     boolean isEnglish, boolean isGift,
                                     Long maxBudget, Set<String> negations,
                                     boolean afterHours, List<String> smartOpts, boolean mostrarFichas) {
        EmpresaChatInfo info = getEmpresaChatInfo(empresaId);
        streamer.streamClaudeResponse(log, emitter, userMessage, productos, history,
            info.whatsapp(), info.nombre(), marketplace, context,
            isEnglish, isGift, maxBudget, negations, afterHours, smartOpts, mostrarFichas);
    }

    public void streamAdvisorResponse(SseEmitter emitter, String userMessage,
                                      Map<String, Object> ficha,
                                      List<Map<String, Object>> history,
                                      Long empresaId, boolean marketplace,
                                      boolean isEnglish, boolean afterHours,
                                      List<String> smartOpts) {
        EmpresaChatInfo info = getEmpresaChatInfo(empresaId);
        streamer.streamAdvisor(log, emitter, userMessage, ficha, history,
            info.whatsapp(), info.nombre(), marketplace, isEnglish, afterHours, smartOpts);
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

    /** Datos mínimos de tienda para el prompt público. */
    public record EmpresaChatInfo(String whatsapp, String nombre) {}
}
