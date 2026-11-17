package com.hotclick.service.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Riesgos 15-nov — correo de invitación de equipo: sin contraseña, con enlace para definirla")
class InvitacionMiembroSinPasswordTest {

    private final NegocioEmailBuilder builder = new NegocioEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    @Test
    @DisplayName("cuenta nueva: invita a ACEPTAR con enlace de un solo uso, sin contraseña ni 'ya tenés acceso'")
    void cuentaNuevaSinPassword() {
        String html = builder.buildInvitacionMiembro("a@b.com", "Ana", "EDITOR", "Tienda", true, "tok123");
        assertThat(html).doesNotContain("Contraseña:").doesNotContain("Ya tenés acceso").doesNotContain("Te agregaron");
        assertThat(html).contains("/equipo/invitacion/tok123").contains("definir tu propia contraseña").contains("un solo uso");
    }

    @Test
    @DisplayName("cuenta existente: también enlace de aceptación, pide iniciar sesión y no dice que ya entró")
    void cuentaExistenteAceptaConEnlace() {
        String html = builder.buildInvitacionMiembro("a@b.com", "Ana", "EDITOR", "Tienda", false, "tok123");
        assertThat(html).contains("/equipo/invitacion/tok123").contains("iniciá sesión")
            .doesNotContain("contraseña habitual").doesNotContain("Ya tenés acceso").doesNotContain("Te agregaron");
    }
}
