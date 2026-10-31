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
}
