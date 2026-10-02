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
    @DisplayName("Incluye el código y el tiempo de vencimiento — nunca el código en el asunto")
    void incluyeDatosClave() {
        ReflectionTestUtils.invokeMethod(service, "enviarEmail", "andrea@correo.com", "Andrea", "482913", 600);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> asuntoCaptor = ArgumentCaptor.forClass(String.class);
        verify(resendEmailService).send(org.mockito.ArgumentMatchers.eq("andrea@correo.com"), asuntoCaptor.capture(), htmlCaptor.capture());

        // El asunto es visible en notificaciones/lockscreen sin abrir el correo: nunca lleva el codigo.
        assertThat(asuntoCaptor.getValue()).doesNotContain("482913");
        // Dos grupos de 3 como en Figma (482 913); el hueco es un margen, no un espacio copiable.
        assertThat(htmlCaptor.getValue())
            .contains("482<span")
            .contains(">913</span>")
            .contains("10 minutos")
            .doesNotContain("482 913")
            .contains("/email/icono-candado.png");
    }

    @Test
    @DisplayName("No inserta el nombre del usuario (Figma no lo muestra), así que no hay HTML que inyectar")
    void noInsertaElNombre() {
        ReflectionTestUtils.invokeMethod(service, "enviarEmail", "x@correo.com", "<script>alert(1)</script>", "123456", 300);

        ArgumentCaptor<String> htmlCaptor = ArgumentCaptor.forClass(String.class);
        verify(resendEmailService).send(org.mockito.ArgumentMatchers.eq("x@correo.com"), org.mockito.ArgumentMatchers.anyString(), htmlCaptor.capture());

        assertThat(htmlCaptor.getValue())
            .doesNotContain("<script>alert(1)</script>")
            .doesNotContain("script");
    }
}
