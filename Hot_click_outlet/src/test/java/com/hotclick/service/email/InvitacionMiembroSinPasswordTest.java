package com.hotclick.service.email;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Riesgos 15-nov — correo de invitación de equipo: sin contraseña, con enlace para definirla")
class InvitacionMiembroSinPasswordTest {

    private static final String SECRETO = "Zx9Qw3Er7Ty5";
    private final NegocioEmailBuilder builder = new NegocioEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    @Test
    @DisplayName("cuenta nueva: no hay contraseña en claro y el CTA lleva a /recuperar-contrasena")
    void cuentaNuevaSinPassword() {
        String html = builder.buildInvitacionMiembro("a@b.com", "Ana", "EDITOR", "Tienda", true);
        assertThat(html).doesNotContain(SECRETO).doesNotContain("Contraseña:");
        assertThat(html).contains("/recuperar-contrasena").contains("a@b.com");
    }

    @Test
    @DisplayName("cuenta existente: sigue yendo a /login con su contraseña habitual")
    void cuentaExistenteVaALogin() {
        String html = builder.buildInvitacionMiembro("a@b.com", "Ana", "EDITOR", "Tienda", false);
        assertThat(html).contains("/login").contains("contraseña habitual").doesNotContain("/recuperar-contrasena");
    }
}
