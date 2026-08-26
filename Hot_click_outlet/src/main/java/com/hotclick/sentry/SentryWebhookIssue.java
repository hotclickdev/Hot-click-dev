package com.hotclick.sentry;

import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Payload de webhook de Sentry (issue created / metric alert triggered).
 */
public final class SentryWebhookIssue {

    private final String action;
    private final String issueId;
    private final String titulo;
    private final String nivel;
    private final String url;
    private final String culprit;
    private final String stackTrace;
    private final String environment;

    private SentryWebhookIssue(String action, String issueId, String titulo, String nivel,
                               String url, String culprit, String stackTrace, String environment) {
        this.action = action;
        this.issueId = issueId;
        this.titulo = titulo;
        this.nivel = nivel;
        this.url = url;
        this.culprit = culprit;
        this.stackTrace = stackTrace;
        this.environment = environment;
    }

    public static SentryWebhookIssue from(Map<String, Object> body) {
        if (body == null) {
            return vacio();
        }
        String action = texto(body.get("action"));
        Map<String, Object> data = mapa(body.get("data"));
        Map<String, Object> issue = mapa(data.get("issue"));
        if (issue.isEmpty()) {
            issue = mapa(data.get("event"));
        }
        return new SentryWebhookIssue(
                action,
                texto(issue.get("id")),
                textoO(issue.get("title"), "Error desconocido"),
                textoO(issue.get("level"), "error").toUpperCase(Locale.ROOT),
                texto(issue.get("permalink")),
                texto(issue.get("culprit")),
                valorMetadata(issue.get("metadata")),
                environmentDe(issue));
    }

    public static SentryWebhookIssue vacio() {
        return new SentryWebhookIssue("", "", "Error desconocido", "ERROR", "", "", "", "");
    }

    public boolean esAccionDeAlerta() {
        return "created".equalsIgnoreCase(action) || "triggered".equalsIgnoreCase(action);
    }

    public boolean esErrorOFatal() {
        return "ERROR".equals(nivel) || "FATAL".equals(nivel);
    }

    public boolean esFatal() {
        return "FATAL".equals(nivel);
    }

    public boolean esProduccion() {
        if (environment.isBlank()) {
            return true;
        }
        return "production".equalsIgnoreCase(environment) || "prod".equalsIgnoreCase(environment);
    }

    public String mensajeTelegram() {
        String prefijo = esErrorOFatal() ? "[ERROR]" : "[WARNING]";
        String link = url.isBlank() ? "" : "\n*Ver en Sentry:* " + url;
        return String.format(
                "%s *ERROR EN PRODUCCION*\n\n*Detectado por:* Sentry\n*Nivel:* %s\n*Problema:* %s%s",
                prefijo, nivel, titulo, link);
    }

    public String action() { return action; }
    public String issueId() { return issueId; }
    public String titulo() { return titulo; }
    public String nivel() { return nivel; }
    public String url() { return url; }
    public String culprit() { return culprit; }
    public String stackTrace() { return stackTrace; }
    public String environment() { return environment; }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> mapa(Object raw) {
        if (raw instanceof Map<?, ?> m) {
            return (Map<String, Object>) m;
        }
        return Map.of();
    }

    private static String texto(Object raw) {
        return raw == null ? "" : String.valueOf(raw);
    }

    private static String textoO(Object raw, String fallback) {
        String value = texto(raw);
        return value.isBlank() ? fallback : value;
    }

    private static String valorMetadata(Object metaObj) {
        if (metaObj instanceof Map<?, ?> meta && meta.containsKey("value")) {
            return String.valueOf(meta.get("value"));
        }
        return "";
    }

    private static String environmentDe(Map<String, Object> issue) {
        String directo = texto(issue.get("environment"));
        if (!directo.isBlank()) {
            return directo;
        }
        return environmentDeTags(issue.get("tags"));
    }

    private static String environmentDeTags(Object tags) {
        if (!(tags instanceof List<?> list)) {
            return "";
        }
        for (Object item : list) {
            String env = environmentDeTag(item);
            if (!env.isBlank()) {
                return env;
            }
        }
        return "";
    }

    private static String environmentDeTag(Object item) {
        if (item instanceof List<?> pair && pair.size() >= 2
                && "environment".equals(String.valueOf(pair.get(0)))) {
            return String.valueOf(pair.get(1));
        }
        if (item instanceof Map<?, ?> tag
                && "environment".equals(String.valueOf(tag.get("key")))) {
            return texto(tag.get("value"));
        }
        return "";
    }
}
