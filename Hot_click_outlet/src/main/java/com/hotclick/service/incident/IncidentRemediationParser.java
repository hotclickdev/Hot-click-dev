package com.hotclick.service.incident;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class IncidentRemediationParser {

    private static final Logger log = LoggerFactory.getLogger(IncidentRemediationParser.class);

    private final ObjectMapper objectMapper;

    public IncidentRemediationParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public RespuestaRemedicion parsearRespuesta(String texto) {
        RespuestaRemedicion resp = new RespuestaRemedicion();
        try {
            int inicio = texto.indexOf('{');
            int fin = texto.lastIndexOf('}');
            if (inicio >= 0 && fin > inicio) {
                String json = texto.substring(inicio, fin + 1);
                JsonNode node = objectMapper.readTree(json);
                resp.analisis = node.path("analisis").asText("Sin análisis");
                resp.causaRaiz = node.path("causa_raiz").asText("No determinada");
                resp.descripcionFix = node.path("descripcion_fix").asText("Sin descripción");
                resp.codigoCorregido = node.path("codigo_corregido").asText("");
            }
        } catch (Exception e) {
            log.warn("No se pudo parsear respuesta JSON de Claude: {}", e.getMessage());
            resp.analisis = texto.substring(0, Math.min(texto.length(), 500));
            resp.causaRaiz = "Ver análisis completo";
        }
        return resp;
    }

    public static class RespuestaRemedicion {
        public String analisis = "";
        public String causaRaiz = "";
        public String descripcionFix = "";
        public String codigoCorregido = "";
    }
}
