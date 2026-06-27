package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

/**
 * Autonomous Incident Remediation — flujo:
 * 1. Recibe error de Sentry (título, nivel, culprit, stack trace)
 * 2. Extrae el archivo afectado y lo obtiene de GitHub
 * 3. Llama a Claude API con el contexto completo
 * 4. Claude devuelve análisis + archivo corregido
 * 5. Crea branch + commit + PR en GitHub
 * 6. Notifica a Telegram con el link del PR
 */
@Service
public class IncidentRemediationService {

    private static final Logger log = LoggerFactory.getLogger(IncidentRemediationService.class);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${anthropic.api-key:}")
    private String anthropicKey;

    @Value("${anthropic.model:claude-sonnet-4-6}")
    private String model;

    @Autowired private GitHubService gitHubService;
    @Autowired private TelegramService telegramService;
    @Autowired private ObjectMapper objectMapper;

    @Async
    public void remediar(String titulo, String nivel, String culprit, String sentryUrl, String stackTrace) {
        log.info("IncidentRemediation: iniciando para — {}", titulo);

        if (anthropicKey == null || anthropicKey.isBlank()) {
            log.warn("IncidentRemediation: ANTHROPIC_API_KEY no configurado — saltando");
            return;
        }

        try {
            // 1. Extraer ruta del archivo desde el culprit
            // Formato: "com.hotclick.service.PedidoService in crearPedido"
            String filePath = resolverRutaArchivo(culprit);
            if (filePath == null) {
                log.warn("IncidentRemediation: no se pudo resolver ruta desde culprit={}", culprit);
                telegramService.enviar(String.format(
                        "🤖 *Remediación automática*\n\n*Error:* %s\n*Resultado:* No se pudo identificar el archivo afectado.\n*Acción:* Revisar manualmente en Sentry\n%s",
                        titulo, sentryUrl));
                return;
            }

            // 2. Obtener contenido del archivo desde GitHub
            String contenidoOriginal = gitHubService.obtenerArchivo(filePath);
            if (contenidoOriginal == null) {
                log.warn("IncidentRemediation: archivo no encontrado en GitHub — {}", filePath);
                telegramService.enviar(String.format(
                        "🤖 *Remediación automática*\n\n*Error:* %s\n*Resultado:* Archivo `%s` no encontrado en el repo.\n%s",
                        titulo, filePath, sentryUrl));
                return;
            }

            // 3. Llamar a Claude con el contexto completo
            String respuestaClaudeJson = llamarClaude(titulo, nivel, culprit, stackTrace, filePath, contenidoOriginal);
            if (respuestaClaudeJson == null) {
                log.error("IncidentRemediation: Claude no respondió");
                return;
            }

            // 4. Parsear respuesta de Claude
            RespuestaRemedicion resp = parsearRespuesta(respuestaClaudeJson);

            // 5. Si Claude propone un fix en el código, crear PR
            if (resp.codigoCorregido != null && !resp.codigoCorregido.isBlank()
                    && !resp.codigoCorregido.equals(contenidoOriginal)) {

                String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss"));
                String branchName = "hotfix/sentry-" + timestamp;
                String tituloPR = "[Auto-fix] " + titulo.substring(0, Math.min(titulo.length(), 60));
                String cuerpoPR = String.format(
                        "## Remediación Automática — Incident Bot\n\n" +
                        "**Error detectado por Sentry:**\n> %s\n\n" +
                        "**Nivel:** %s\n\n" +
                        "**Análisis de Claude:**\n%s\n\n" +
                        "**Causa raíz:**\n%s\n\n" +
                        "**Cambios aplicados:**\n%s\n\n" +
                        "---\n⚠️ *Revisar antes de hacer merge. Generado automáticamente.*\n\n" +
                        "🔗 [Ver en Sentry](%s)",
                        titulo, nivel, resp.analisis, resp.causaRaiz, resp.descripcionFix, sentryUrl);

                gitHubService.crearBranch(branchName);
                String sha = gitHubService.obtenerShaArchivo(filePath);
                gitHubService.actualizarArchivo(branchName, filePath, resp.codigoCorregido,
                        "fix: " + titulo.substring(0, Math.min(titulo.length(), 72)), sha);
                String prUrl = gitHubService.abrirPullRequest(branchName, tituloPR, cuerpoPR);

                telegramService.enviar(String.format(
                        "🤖 *PR de fix automático listo*\n\n*Error:* %s\n\n*Causa raíz:* %s\n\n*Fix:* %s\n\n[Revisar PR](%s)",
                        titulo, resp.causaRaiz, resp.descripcionFix, prUrl));
            } else {
                // Claude analizó pero no propuso código — solo enviamos el análisis
                telegramService.enviar(String.format(
                        "🤖 *Análisis automático de error*\n\n*Error:* %s\n\n*Análisis:* %s\n\n*Causa raíz:* %s\n\n[Ver en Sentry](%s)",
                        titulo, resp.analisis, resp.causaRaiz, sentryUrl));
            }

        } catch (Exception e) {
            log.error("IncidentRemediation: error inesperado — {}", e.getMessage(), e);
            telegramService.enviar(String.format(
                    "🤖 *Remediación automática fallida*\n\n*Error original:* %s\n*Fallo interno:* %s",
                    titulo, e.getMessage()));
        }
    }

    private String resolverRutaArchivo(String culprit) {
        if (culprit == null || culprit.isBlank()) return null;

        // Frontend JS/JSX: "ProductDetailPage in handleSubmit" o "src/pages/ProductDetailPage.jsx"
        if (culprit.contains(".jsx") || culprit.contains(".js") || culprit.contains(".tsx")) {
            return resolverRutaFrontend(culprit);
        }

        // Backend Java: "com.hotclick.service.PedidoService in crearPedido"
        String clazz = culprit.contains(" in ") ? culprit.split(" in ")[0].trim() : culprit.trim();
        if (!clazz.startsWith("com.hotclick")) return null;
        return "Hot_click_outlet/src/main/java/" + clazz.replace('.', '/') + ".java";
    }

    private String resolverRutaFrontend(String culprit) {
        // Si ya viene con ruta relativa: "src/pages/ProductDetailPage.jsx in handleSubmit"
        String parte = culprit.contains(" in ") ? culprit.split(" in ")[0].trim() : culprit.trim();
        if (parte.startsWith("src/")) {
            return "Hot_click_outlet/frontend/" + parte;
        }
        // Si viene solo el nombre: "ProductDetailPage" → buscar en páginas conocidas
        String nombre = parte.contains("/") ? parte.substring(parte.lastIndexOf('/') + 1) : parte;
        nombre = nombre.replace(".jsx", "").replace(".js", "").replace(".tsx", "");
        // Intentar rutas comunes
        String[] candidatos = {
            "Hot_click_outlet/frontend/src/pages/" + nombre + ".jsx",
            "Hot_click_outlet/frontend/src/pages/admin/" + nombre + ".jsx",
            "Hot_click_outlet/frontend/src/components/" + nombre + ".jsx",
            "Hot_click_outlet/frontend/src/components/ui/" + nombre + ".jsx",
            "Hot_click_outlet/frontend/src/services/" + nombre + ".js",
        };
        for (String candidato : candidatos) {
            try {
                String contenido = gitHubService.obtenerArchivo(candidato);
                if (contenido != null) return candidato;
            } catch (Exception e) { log.debug("candidato no accesible: {}", e.getMessage()); }
        }
        return null;
    }

    private String llamarClaude(String titulo, String nivel, String culprit, String stackTrace,
                                 String filePath, String contenido) {
        try {
            boolean esFrontend = filePath.contains(".jsx") || filePath.contains(".js") || filePath.contains(".tsx");
            String systemPrompt = esFrontend ? """
                    Eres un experto en React/JavaScript especializado en debugging de errores de consola y red en producción.
                    Cuando recibas un error de Sentry con el código fuente afectado, debes:
                    1. Analizar el error (puede ser error de consola, red, o excepción no manejada)
                    2. Proponer el código corregido completo del archivo JSX/JS (no solo el fragmento)
                    3. Explicar brevemente qué cambió y por qué

                    Errores comunes de red: fetch/axios sin manejo de error, status codes no validados, CORS.
                    Errores de consola: TypeError, undefined properties, null access, hooks mal usados.

                    Responde SIEMPRE en este formato JSON exacto:
                    {
                      "analisis": "descripción del problema en español",
                      "causa_raiz": "causa raíz específica en español",
                      "descripcion_fix": "qué se corrigió y por qué en español",
                      "codigo_corregido": "código JSX/JS completo del archivo corregido"
                    }

                    Si no puedes determinar un fix con certeza, devuelve codigo_corregido como cadena vacía.
                    """ : """
                    Eres un experto en Java/Spring Boot especializado en debugging y corrección de bugs en producción.
                    Cuando recibas un error de Sentry con el código fuente afectado, debes:
                    1. Analizar el error y su causa raíz
                    2. Proponer el código corregido completo del archivo (no solo el fragmento)
                    3. Explicar brevemente qué cambió y por qué

                    Responde SIEMPRE en este formato JSON exacto:
                    {
                      "analisis": "descripción del problema en español",
                      "causa_raiz": "causa raíz específica en español",
                      "descripcion_fix": "qué se corrigió y por qué en español",
                      "codigo_corregido": "código Java completo del archivo corregido"
                    }

                    Si no puedes determinar un fix con certeza, devuelve codigo_corregido como cadena vacía.
                    No hagas suposiciones riesgosas. Prioriza la seguridad sobre la completitud.
                    """;

            String userMessage = String.format("""
                    Error detectado en producción:

                    **Título:** %s
                    **Nivel:** %s
                    **Culprit:** %s

                    **Stack trace:**
                    %s

                    **Archivo afectado (%s):**
                    ```java
                    %s
                    ```

                    Analiza el error y proporciona el fix en el formato JSON solicitado.
                    """, titulo, nivel, culprit,
                    stackTrace != null ? stackTrace.substring(0, Math.min(stackTrace.length(), 2000)) : "No disponible",
                    filePath,
                    contenido.substring(0, Math.min(contenido.length(), 8000)));

            String requestBody = objectMapper.writeValueAsString(Map.of(
                    "model", model,
                    "max_tokens", 8000,
                    "system", systemPrompt,
                    "messages", List.of(Map.of("role", "user", "content", userMessage))));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.anthropic.com/v1/messages"))
                    .timeout(Duration.ofSeconds(120))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", anthropicKey)
                    .header("anthropic-version", "2023-06-01")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> response = HTTP.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.error("Claude API error: status={} body={}", response.statusCode(), response.body());
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            return root.path("content").get(0).path("text").asText();

        } catch (Exception e) {
            log.error("Error llamando a Claude: {}", e.getMessage(), e);
            return null;
        }
    }

    private RespuestaRemedicion parsearRespuesta(String texto) {
        RespuestaRemedicion resp = new RespuestaRemedicion();
        try {
            // Extraer JSON del texto (Claude puede agregar texto antes/después)
            int inicio = texto.indexOf('{');
            int fin    = texto.lastIndexOf('}');
            if (inicio >= 0 && fin > inicio) {
                String json = texto.substring(inicio, fin + 1);
                JsonNode node = objectMapper.readTree(json);
                resp.analisis       = node.path("analisis").asText("Sin análisis");
                resp.causaRaiz      = node.path("causa_raiz").asText("No determinada");
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

    private static class RespuestaRemedicion {
        String analisis = "";
        String causaRaiz = "";
        String descripcionFix = "";
        String codigoCorregido = "";
    }
}
