package com.hotclick.service.auth;

import com.hotclick.dto.RegisterRequest;
import com.hotclick.model.Usuario;
import com.hotclick.service.EmailVerificationService;
import com.hotclick.service.SecurityAuditService;
import com.hotclick.service.TelegramService;
import com.hotclick.service.TurnstileService;
import com.hotclick.service.UsuarioService;
import com.hotclick.utils.CedulaRegistro;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("fix/registro-cedula-otp: cédula en registro y tipos de OTP")
class RegistroCedulaOtpTest {

    @Test
    void formatosCr() {
        assertThat(CedulaRegistro.normalizarOFallar("1-2345-6789")).isEqualTo("123456789");
        assertThat(CedulaRegistro.normalizarOFallar("3-101-123456")).isEqualTo("3101123456");
        assertThat(CedulaRegistro.normalizarOFallar("155812345678")).isEqualTo("155812345678");
        assertThat(CedulaRegistro.normalizarOFallar("15581234567")).isEqualTo("15581234567");
        for (String mala : new String[]{"12345678", "2101123456", "1234567890123", "1-2345-678a", "", " "}) {
            assertThatThrownBy(() -> CedulaRegistro.normalizarOFallar(mala))
                .hasMessage(CedulaRegistro.MSG_INVALIDA);
        }
    }

    @Test
    void cedulaNoApareceEnToString() {
        RegisterRequest r = new RegisterRequest();
        r.setIdentificacion("123456789");
        Usuario u = new Usuario();
        u.setIdentificacion("123456789");
        assertThat(r.toString()).doesNotContain("123456789");
        assertThat(u.toString()).doesNotContain("123456789");
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    class Register {
        @Mock UsuarioService usuarioService;
        @Mock PasswordEncoder passwordEncoder;
        @Mock TelegramService telegramService;
        @Mock TurnstileService turnstileService;
        @Mock SecurityAuditService securityAuditService;
        @InjectMocks AuthRegistrationService service;

        private RegisterRequest req(String cedula) {
            RegisterRequest r = new RegisterRequest();
            r.setNombre("Ana");
            r.setCorreo("ana@test.cr");
            r.setContrasena("clave-segura-123");
            r.setDeclaraMayoriaEdad(true);
            r.setIdentificacion(cedula);
            return r;
        }

        @Test
        void registerOkConCedula() {
            when(turnstileService.verify(any(), any())).thenReturn(true);
            when(passwordEncoder.encode(any())).thenReturn("hash");
            when(usuarioService.registrarSolicitud(any())).thenAnswer(i -> i.getArgument(0));
            var res = service.register(req("1-2345-6789"), new MockHttpServletRequest());
            assertThat(res.getStatusCode().value()).isEqualTo(200);
            ArgumentCaptor<Usuario> cap = ArgumentCaptor.forClass(Usuario.class);
            verify(usuarioService).registrarSolicitud(cap.capture());
            assertThat(cap.getValue().getIdentificacion()).isEqualTo("123456789");
        }

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"123", "2101123456", "abcdefghi"})
        void register400ConCedulaInvalidaOFaltante(String cedula) {
            when(turnstileService.verify(any(), any())).thenReturn(true);
            var res = service.register(req(cedula), new MockHttpServletRequest());
            assertThat(res.getStatusCode().value()).isEqualTo(400);
            assertThat(res.getBody().getMessage()).isEqualTo(CedulaRegistro.MSG_INVALIDA);
            verifyNoInteractions(usuarioService);
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    class SendVerification {
        @Mock PasswordEncoder passwordEncoder;
        @Mock EmailVerificationService emailVerificationService;
        @Mock AuthSupport authSupport;
        @Mock TurnstileService turnstileService;
        @Mock SecurityAuditService securityAuditService;
        @InjectMocks AuthVerificationHandler handler;

        private Usuario alta(String cedula) {
            Usuario u = new Usuario();
            u.setCorreo("ana@test.cr");
            u.setContrasenaHash("clave-segura-123");
            u.setDeclaraMayoriaEdad(true);
            u.setIdentificacion(cedula);
            return u;
        }

        @Test
        void altaOkNormalizaCedula() {
            when(turnstileService.verify(any(), any())).thenReturn(true);
            when(passwordEncoder.encode(any())).thenReturn("hash");
            Usuario u = alta("3-101-123456");
            var res = handler.sendVerification(u, null, new MockHttpServletRequest());
            assertThat(res.getStatusCode().value()).isEqualTo(200);
            assertThat(u.getIdentificacion()).isEqualTo("3101123456");
            verify(emailVerificationService).iniciarRegistro(u);
        }

        @Test
        void alta400ConCedulaInvalida() {
            when(turnstileService.verify(any(), any())).thenReturn(true);
            var res = handler.sendVerification(alta("12"), null, new MockHttpServletRequest());
            assertThat(res.getStatusCode().value()).isEqualTo(400);
            assertThat(res.getBody().getMessage()).isEqualTo(CedulaRegistro.MSG_INVALIDA);
            verifyNoInteractions(emailVerificationService);
        }
    }

    @Test
    @DisplayName("V188 siembra REGISTRO y RESET_PASSWORD en la tabla de la entidad, idempotente, y está en Actualizado.sql")
    void migracionV188() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V188__tipos_otp_registro_reset.sql"));
        String tabla = com.hotclick.model.TipoOtp.class.getAnnotation(jakarta.persistence.Table.class).name();
        assertThat(tabla).isEqualTo("hot_click_tipo_otp_tb");
        for (String tipo : new String[]{Constants.OTP_TIPO_REGISTRO, Constants.OTP_TIPO_RESET_PASSWORD}) {
            assertThat(sql).contains("SELECT '" + tipo + "', 300, 6, 1")
                .contains("WHERE NOT EXISTS (SELECT 1 FROM " + tabla + " WHERE nombre = '" + tipo + "')");
        }
        String sinComentarios = sql.replaceAll("(?m)^--.*$", "");
        assertThat(sinComentarios).doesNotContain("\"HOT_CLICK_TIPO_OTP_TB\"").doesNotContainIgnoringCase("DROP ")
            .doesNotContainIgnoringCase("DELETE ").doesNotContainIgnoringCase("UPDATE ");
        assertThat(Files.readString(Path.of("Actualizado.sql"))).contains(sql.trim());
        try (var s = Files.list(Path.of("src/main/resources/db/migration"))) {
            assertThat(s.filter(p -> p.getFileName().toString().startsWith("V188__")).count()).isEqualTo(1);
        }
    }
}
