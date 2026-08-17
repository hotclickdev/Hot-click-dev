package com.hotclick.service;

import com.hotclick.service.incident.IncidentClaudeClient;
import com.hotclick.service.incident.IncidentPathResolver;
import com.hotclick.service.incident.IncidentRemediationParser;
import com.hotclick.service.incident.IncidentRemediationParser.RespuestaRemedicion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

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

    private final GitHubService gitHubService;
    private final TelegramService telegramService;
    private final IncidentPathResolver incidentPathResolver;
    private final IncidentClaudeClient incidentClaudeClient;
    private final IncidentRemediationParser incidentRemediationParser;

    public IncidentRemediationService(GitHubService gitHubService,
                                      TelegramService telegramService,
                                      IncidentPathResolver incidentPathResolver,
                                      IncidentClaudeClient incidentClaudeClient,
                                      IncidentRemediationParser incidentRemediationParser) {
        this.gitHubService = gitHubService;
        this.telegramService = telegramService;
        this.incidentPathResolver = incidentPathResolver;
        this.incidentClaudeClient = incidentClaudeClient;
        this.incidentRemediationParser = incidentRemediationParser;
    }

    @Async
    public void remediar(String titulo, String nivel, String culprit, String sentryUrl, String stackTrace) {
        log.info("IncidentRemediation: iniciando para — {}", titulo);

        if (!incidentClaudeClient.hasApiKey()) {
            log.warn("IncidentRemediation: ANTHROPIC_API_KEY no configurado — saltando");
            return;
        }

        try {
            // 1. Extraer ruta del archivo desde el culprit
            // Formato: "com.hotclick.service.PedidoService in crearPedido"
            String filePath = incidentPathResolver.resolverRutaArchivo(culprit);
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
            String respuestaClaudeJson = incidentClaudeClient.llamarClaude(
                    titulo, nivel, culprit, stackTrace, filePath, contenidoOriginal);
            if (respuestaClaudeJson == null) {
                log.error("IncidentRemediation: Claude no respondió");
                return;
            }

            // 4. Parsear respuesta de Claude
            RespuestaRemedicion resp = incidentRemediationParser.parsearRespuesta(respuestaClaudeJson);

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
}
