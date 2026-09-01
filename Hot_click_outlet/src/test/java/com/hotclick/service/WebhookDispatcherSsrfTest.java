package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.*;

/**
 * FIX-01 — SSRF protection in WebhookDispatcherService.
 *
 * Validates that validateWebhookUrl() correctly blocks:
 * - Private/loopback IPs
 * - Cloud metadata endpoint
 * - Internal ports
 * - Non-http(s) schemes
 * - Null/blank URLs
 */
@DisplayName("FIX-01 — SSRF: WebhookDispatcherService.validateWebhookUrl()")
class WebhookDispatcherSsrfTest {

    // ── Caso feliz ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("URL pública HTTPS → aceptada sin excepción")
    void publicHttpsUrl_accepted() {
        assertThatNoException().isThrownBy(() ->
            WebhookDispatcherService.validateWebhookUrl("https://webhook.site/abc123"));
    }

    @Test
    @DisplayName("URL pública HTTP → aceptada sin excepción")
    void publicHttpUrl_accepted() {
        assertThatNoException().isThrownBy(() ->
            WebhookDispatcherService.validateWebhookUrl("http://example.com/hook"));
    }

    // ── Casos error: IPs privadas ─────────────────────────────────────────────

    @ParameterizedTest(name = "IP privada {0} → bloqueada")
    @ValueSource(strings = {
        "http://192.168.1.1/admin",
        "http://10.0.0.1/hook",
        "http://172.16.0.1/api",
        "http://172.31.255.255/secret"
    })
    @DisplayName("IPs privadas (RFC 1918) → IllegalArgumentException")
    void privateIp_blocked(String url) {
        assertThatThrownBy(() -> WebhookDispatcherService.validateWebhookUrl(url))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("privada");
    }

    @Test
    @DisplayName("Loopback 127.0.0.1 → bloqueado")
    void loopback_blocked() {
        assertThatThrownBy(() -> WebhookDispatcherService.validateWebhookUrl("http://127.0.0.1/hook"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("localhost → bloqueado")
    void localhost_blocked() {
        assertThatThrownBy(() -> WebhookDispatcherService.validateWebhookUrl("http://localhost:8080/hook"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    // ── Caso error: cloud metadata ────────────────────────────────────────────

    @Test
    @DisplayName("169.254.169.254 (AWS metadata) → bloqueado")
    void cloudMetadata_blocked() {
        assertThatThrownBy(() ->
            WebhookDispatcherService.validateWebhookUrl("http://169.254.169.254/latest/meta-data"))
            .isInstanceOf(IllegalArgumentException.class)
            .satisfies(ex -> {
                String msg = ex.getMessage() != null ? ex.getMessage().toLowerCase() : "";
                boolean blocked = msg.contains("privada") || msg.contains("metadata")
                    || msg.contains("cloud") || msg.contains("restringido") || msg.contains("host");
                assertThat(blocked).as("Exception should mention blocked host").isTrue();
            });
    }

    // ── Caso error: puertos internos ──────────────────────────────────────────

    @ParameterizedTest(name = "Puerto {0} → bloqueado")
    @ValueSource(ints = { 22, 3306, 5432, 6379, 9200, 27017 })
    @DisplayName("Puertos internos → IllegalArgumentException")
    void internalPorts_blocked(int port) {
        assertThatThrownBy(() ->
            WebhookDispatcherService.validateWebhookUrl("https://api.ejemplo.com:" + port + "/hook"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Puerto interno restringido");
    }

    // ── Caso error: schemes no permitidos ────────────────────────────────────

    @ParameterizedTest(name = "Scheme {0} → bloqueado")
    @ValueSource(strings = { "file:///etc/passwd", "ftp://server/file", "jdbc:postgresql://host/db" })
    @DisplayName("Schemes no http/https → IllegalArgumentException")
    void nonHttpScheme_blocked(String url) {
        assertThatThrownBy(() -> WebhookDispatcherService.validateWebhookUrl(url))
            .isInstanceOf(IllegalArgumentException.class)
            .satisfies(ex -> {
                String msg = ex.getMessage() != null ? ex.getMessage() : "";
                boolean blocked = msg.contains("Solo se permiten") || msg.contains("URL inválida")
                    || msg.contains("URL sin host");
                assertThat(blocked).as("scheme '%s' should be blocked", url).isTrue();
            });
    }

    // ── Caso error: URL nula o vacía ──────────────────────────────────────────

    @Test
    @DisplayName("URL null → IllegalArgumentException")
    void nullUrl_blocked() {
        assertThatThrownBy(() -> WebhookDispatcherService.validateWebhookUrl(null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("URL requerida");
    }

    @Test
    @DisplayName("URL vacía → IllegalArgumentException")
    void blankUrl_blocked() {
        assertThatThrownBy(() -> WebhookDispatcherService.validateWebhookUrl("   "))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("URL requerida");
    }
}
