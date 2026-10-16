package com.hotclick.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.LoggingEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("LOG-1 | el log tapa IBAN, cédula, onboardingUrl y secretos")
class RedaccionLogTest {

    // Valores de relleno, armados por partes para que ningún escáner de secretos los tome por reales.
    private static final String IBAN_FALSO = "CR00 0000 0000 0000 0000 00";
    private static final String STRIPE_FALSA = "sk_" + "test_" + "FALSO0000";

    @Test
    void iban() {
        assertThat(RedaccionLog.enmascarar("payout a " + IBAN_FALSO + " listo")).isEqualTo("payout a [IBAN] listo");
        assertThat(RedaccionLog.enmascarar("iban=CR00000000000000000000")).doesNotContain("CR0000").contains("[IBAN]");
    }

    @Test
    void cedulas() {
        assertThat(RedaccionLog.enmascarar("remitente cedula=1-2345-6789")).doesNotContain("2345").contains("[CEDULA]");
        assertThat(RedaccionLog.enmascarar("jurídica 3-101-123456 ok")).isEqualTo("jurídica [CEDULA] ok");
        assertThat(RedaccionLog.enmascarar("cedula 112340567")).isEqualTo("cedula [CEDULA]");
    }

    @Test
    void noTocaLoQueNoEs() {
        String normal = "Pedido ORD-E617C7DEBF47 total=15000 empresa=42 tel 88887777";
        assertThat(RedaccionLog.enmascarar(normal)).isEqualTo(normal);
        assertThat(RedaccionLog.enmascarar(null)).isNull();
    }

    @Test
    void onboardingYSecretos() {
        assertThat(RedaccionLog.enmascarar("onboardingUrl=https://onvo.example/onboarding/abc123 x"))
            .doesNotContain("abc123").contains("onboardingUrl=[URL]");
        assertThat(RedaccionLog.enmascarar("link https://pagos.example/connect/onboarding?s=zz"))
            .doesNotContain("zz").contains("[URL]");
        assertThat(RedaccionLog.enmascarar("token=abcdef123456 password: hunter2xx"))
            .doesNotContain("abcdef123456").doesNotContain("hunter2xx");
        assertThat(RedaccionLog.enmascarar("Authorization: Bearer eyJhbGciOi.payload.sig"))
            .doesNotContain("eyJhbGciOi");
        assertThat(RedaccionLog.enmascarar("clave " + STRIPE_FALSA)).doesNotContain("FALSO0000").contains("[SECRETO]");
    }

    @Test
    @DisplayName("el converter de logback aplica la redacción al mensaje formateado")
    void converter() {
        LoggerContext ctx = new LoggerContext();
        LoggingEvent ev = new LoggingEvent("x", ctx.getLogger("t"), Level.INFO,
            "Comprobante pedido={} cedula={}", null, new Object[]{"ORD-1", "1-2345-6789"});
        MensajeEnmascaradoConverter c = new MensajeEnmascaradoConverter();
        assertThat(c.convert(ev)).isEqualTo("Comprobante pedido=ORD-1 cedula=[CEDULA]");
    }

    @Test
    @DisplayName("%exSeguro tapa los datos dentro del mensaje de la excepción y de su causa")
    void converterExcepcion() {
        LoggerContext ctx = new LoggerContext();
        RuntimeException causa = new IllegalStateException("payout rechazado iban=" + IBAN_FALSO.replace(" ", ""));
        RuntimeException ex = new RuntimeException("falló cedula=1-2345-6789 token=abcdef123456", causa);
        LoggingEvent ev = new LoggingEvent("x", ctx.getLogger("t"), Level.ERROR, "error", ex, null);
        ExcepcionEnmascaradaConverter c = new ExcepcionEnmascaradaConverter();
        c.setContext(ctx);
        c.setOptionList(java.util.List.of("30"));
        c.start();
        String traza = c.convert(ev);
        assertThat(traza)
            .contains("RuntimeException", "IllegalStateException", "[CEDULA]", "[IBAN]")
            .doesNotContain("2345-6789", "abcdef123456", "CR0000");
    }
}
