package com.hotclick.service.email;

import com.hotclick.service.ResendEmailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/** El aviso al admin por REEMBOLSO_PENDIENTE solo lleva id interno, estado y link: nada de datos del cliente ni montos. */
@ExtendWith(MockitoExtension.class)
@DisplayName("[Aviso admin] Correo de reembolso pendiente sin PII")
class AvisoReembolsoPendienteCorreoTest {

    @Mock ResendEmailService resendEmailService;
    @Mock NegocioEmailBuilder negocioEmailBuilder;
    @Spy EmailLayoutHelper emailLayoutHelper = new EmailLayoutHelper();
    @InjectMocks NotificacionNegocioEmailSender sender;

    @Test
    @DisplayName("Asunto y cuerpo: id del pago, estado y link; sin correo, teléfono, nombre ni monto")
    void sinPii() {
        sender.enviarAvisoReembolsoPendienteAdmin("admin@hotclick.test", 4242L, "REEMBOLSO_PENDIENTE",
            "https://hotclick.lat/plataforma/dinero/cobros");

        ArgumentCaptor<String> asunto = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(resendEmailService).send(eq("admin@hotclick.test"), asunto.capture(), html.capture());
        String todo = asunto.getValue() + "\n" + html.getValue();

        assertThat(todo).contains("#4242").contains("REEMBOLSO_PENDIENTE")
            .contains("https://hotclick.lat/plataforma/dinero/cobros");
        // Sin PII: ningún correo (fuera del destinatario), teléfono, monto ni moneda.
        assertThat(html.getValue()).doesNotContainPattern("[\\w.+-]+@[\\w-]+\\.[\\w.]+");
        assertThat(todo).doesNotContainPattern("\\b\\d{4}-?\\d{4}\\b")
            .doesNotContain("₡").doesNotContain("US$").doesNotContainIgnoringCase("monto")
            .doesNotContainIgnoringCase("cliente:").doesNotContainIgnoringCase("tel");
    }

    @Test
    @DisplayName("Un fallo del proveedor de correo se propaga para que el servicio de aviso lo registre")
    void falloSePropaga() {
        org.mockito.Mockito.doThrow(new RuntimeException("caído"))
            .when(resendEmailService).send(anyString(), anyString(), anyString());
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> sender.enviarAvisoReembolsoPendienteAdmin(
            "admin@hotclick.test", 1L, "REEMBOLSO_PENDIENTE", "https://hotclick.lat/plataforma/dinero/cobros"))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("Punto 4 #477: el resumen de pagos viejos lleva id, monto y fecha; sin correo, teléfono ni nombre del cliente")
    void resumenSinPii() {
        sender.enviarResumenReembolsosPendientesAdmin("admin@hotclick.test", java.util.List.of(
                new ReembolsoPendienteResumenItem(11L, 10000, "CRC", java.time.LocalDateTime.of(2026, 10, 1, 9, 30)),
                new ReembolsoPendienteResumenItem(12L, 2500, "USD", java.time.LocalDateTime.of(2026, 10, 2, 18, 5))),
            "https://hotclick.lat/plataforma/dinero/cobros");

        ArgumentCaptor<String> asunto = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(resendEmailService).send(eq("admin@hotclick.test"), asunto.capture(), html.capture());
        String todo = asunto.getValue() + "\n" + html.getValue();

        assertThat(asunto.getValue()).contains("2 cobros");
        assertThat(html.getValue()).contains("#11").contains("10000 CRC").contains("2026-10-01 09:30")
            .contains("#12").contains("2500 USD").contains("2026-10-02 18:05")
            .contains("https://hotclick.lat/plataforma/dinero/cobros");
        assertThat(html.getValue()).doesNotContainPattern("[\\w.+-]+@[\\w-]+\\.[\\w.]+");
        assertThat(todo).doesNotContainPattern("\\b\\d{4}-\\d{4}\\b")
            .doesNotContainIgnoringCase("cliente:").doesNotContainIgnoringCase("tel")
            .doesNotContainIgnoringCase("nombre").doesNotContainIgnoringCase("cédula");
    }

    @Test
    @DisplayName("Resumen #477: el correo agrupa por origen con un título y conteo por grupo, sin PII")
    void resumenAgrupadoPorOrigen() {
        var O = ReembolsoPendienteResumenItem.Origen.class;
        java.time.LocalDateTime f = java.time.LocalDateTime.of(2026, 10, 1, 9, 30);
        sender.enviarResumenReembolsosPendientesAdmin("admin@hotclick.test", java.util.List.of(
                new ReembolsoPendienteResumenItem(1L, 100, "CRC", f, ReembolsoPendienteResumenItem.Origen.OTRO),
                new ReembolsoPendienteResumenItem(2L, 200, "CRC", f, ReembolsoPendienteResumenItem.Origen.SINPE),
                new ReembolsoPendienteResumenItem(3L, 300, "CRC", f, ReembolsoPendienteResumenItem.Origen.ONVO_CANCELADO),
                new ReembolsoPendienteResumenItem(4L, 400, "CRC", f, ReembolsoPendienteResumenItem.Origen.SOBREVENTA),
                new ReembolsoPendienteResumenItem(5L, 500, "CRC", f, ReembolsoPendienteResumenItem.Origen.SINPE)),
            "https://hotclick.lat/plataforma/dinero/cobros");
        ArgumentCaptor<String> html = ArgumentCaptor.forClass(String.class);
        verify(resendEmailService).send(eq("admin@hotclick.test"), anyString(), html.capture());
        String h = html.getValue();

        int onvo = h.indexOf("Cobro ONVO sobre pedido cancelado (1)"), sinpe = h.indexOf("SINPE (2)"),
            sobre = h.indexOf("Sobreventa (1)"), otro = h.indexOf("Otro (origen no determinable) (1)");
        assertThat(onvo).isNotNegative();
        assertThat(sinpe).isGreaterThan(onvo);
        assertThat(sobre).isGreaterThan(sinpe);
        assertThat(otro).isGreaterThan(sobre);
        // Cada pago cae bajo su título.
        assertThat(h.indexOf("#3<")).isBetween(onvo, sinpe);
        assertThat(h.indexOf("#2<")).isBetween(sinpe, sobre);
        assertThat(h.indexOf("#5<")).isBetween(sinpe, sobre);
        assertThat(h.indexOf("#4<")).isBetween(sobre, otro);
        assertThat(h.indexOf("#1<")).isGreaterThan(otro);
        assertThat(h).doesNotContainPattern("[\\w.+-]+@[\\w-]+\\.[\\w.]+").doesNotContain("ONVOPI");
    }
}
