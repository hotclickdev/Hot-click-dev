package com.hotclick.service;

import com.hotclick.service.email.EmailLayoutHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

/**
 * Correo de código de verificación (Figma: Correo · Código de verificación).
 * Se prueba invocando el método privado enviarEmail — es el único punto donde se arma el HTML.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("OtpService — correo de código de verificación")
class OtpServiceEmailTest {

    @Mock private ResendEmailService resendEmailService;

    private final OtpService service = new OtpService();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "resendEmailService", resendEmailService);
        ReflectionTestUtils.setField(service, "layout", new EmailLayoutHelper());
    }

    @Test
    @DisplayName("Incluye el código, el nombre y el tiempo de vencimiento")
    void incluyeDatosClave() {
        ReflectionTestUtils.invokeMethod(service, "enviarEmail", "andrea@correo.com", "Andrea", "482913", 600);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> asuntoCaptor = ArgumentCaptor.forClass(String.class);
        verify(resendEmailService).send(org.mockito.ArgumentMatchers.eq("andrea@correo.com"), asuntoCaptor.capture(), htmlCaptor.capture());

        assertThat(asuntoCaptor.getValue()).contains("482913");
        assertThat(htmlCaptor.getValue())
            .contains("482913")
            .contains("Andrea")
            .contains("10 minutos");
    }

    @Test
    @DisplayName("Escapa el nombre del usuario para evitar inyección de HTML")
    void escapaNombre() {
        ReflectionTestUtils.invokeMethod(service, "enviarEmail", "x@correo.com", "<script>alert(1)</script>", "123456", 300);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(resendEmailService).send(org.mockito.ArgumentMatchers.eq("x@correo.com"), org.mockito.ArgumentMatchers.anyString(), htmlCaptor.capture());

        assertThat(htmlCaptor.getValue())
            .doesNotContain("<script>alert(1)</script>")
            .contains("&lt;script&gt;");
    }
}
