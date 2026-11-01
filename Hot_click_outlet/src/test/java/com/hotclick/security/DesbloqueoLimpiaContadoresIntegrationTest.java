package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.model.Usuario;
import com.hotclick.service.AdminUsuarioService;
import com.hotclick.service.OtpService;
import com.hotclick.service.PasswordResetService;
import com.hotclick.service.WebAuthnService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Seguimiento de #408 (Seguridad L1/L2): desbloquear una cuenta tiene que limpiar también los contadores del limitador
 * (global y por IP), y un WebAuthn exitoso limpia como un login completo. Antes, tras desbloquear, el contador global
 * seguía en el tope y el primer error volvía a bloquear la cuenta.
 */
@DisplayName("[Auth] desbloqueos y WebAuthn limpian los contadores de fallos")
class DesbloqueoLimpiaContadoresIntegrationTest extends BaseIntegrationTest {

    @Autowired private ObjectMapper mapper;
    @Autowired private AdminUsuarioService adminUsuarioService;
    @Autowired private PasswordResetService passwordResetService;
    @MockitoBean private WebAuthnService webAuthnService;
    @MockitoBean private OtpService otpService;

    private static final String PASS = "Test1234!";
    private static final String IP_A = "203.0.113.5";
    private static final String IP_B = "198.51.100.7";

    private static RequestPostProcessor desde(String ip) {
        return req -> { req.setRemoteAddr(ip); return req; };
    }

    private MockHttpServletResponse login(String ip, String clave) throws Exception {
        String c = clave.equals(PASS) ? clave : "Mala1234!" + clave;
        return mockMvc.perform(post("/api/auth/login").with(desde(ip)).contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("correo", testUser.getCorreo(), "contrasena", c))))
            .andReturn().getResponse();
    }

    private Usuario recargar() {
        return usuarioRepository.findById(testUser.getId()).orElseThrow();
    }

    private int contadoresDelUsuario() {
        Integer n = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hot_click_rate_limit_tb WHERE bucket_key LIKE ?", Integer.class,
            "auth:fallos:usuario:" + testUser.getId() + ":%");
        return n == null ? 0 : n;
    }

    /** 5 fallos de IP_A (esa IP queda agotada) + 15 de IPs distintas = 20 globales → bloqueo temporal de la cuenta. */
    private void bloquearCuenta() throws Exception {
        for (int i = 0; i < 5; i++) login(IP_A, "mala");
        for (int i = 1; i <= 15; i++) login("192.0.2." + i, "mala");
        assertThat(recargar().getBloqueadoHasta()).as("precondición: cuenta bloqueada").isNotNull();
        assertThat(contadoresDelUsuario()).isGreaterThan(1);
    }

    private void verificarQueElPrimerErrorNoVuelveABloquear() throws Exception {
        assertThat(recargar().getBloqueadoHasta()).as("desbloqueada").isNull();
        assertThat(contadoresDelUsuario()).as("sin buckets de fallos tras desbloquear").isZero();
        assertThat(login(IP_B, "mala").getStatus()).isEqualTo(401);
        assertThat(recargar().getBloqueadoHasta()).as("el primer error tras desbloquear NO vuelve a bloquear").isNull();
        assertThat(contadoresDelUsuario()).as("solo cuentan desde cero: global + esa IP").isEqualTo(2);
    }

    @Test
    @DisplayName("L2 admin: desbloquear() borra global y por IP; el primer error después no vuelve a bloquear")
    void adminDesbloquearLimpiaContadores() throws Exception {
        bloquearCuenta();
        Usuario u = recargar();
        u.setEstado(Constants.ESTADO_SUSPENDIDO);
        usuarioRepository.save(u);

        adminUsuarioService.desbloquear(testUser.getId());

        verificarQueElPrimerErrorNoVuelveABloquear();
        assertThat(login(IP_A, PASS).getStatus()).as("la IP que estaba agotada vuelve a poder entrar").isEqualTo(200);
    }

    @Test
    @DisplayName("L2 reset de contraseña: cambiarContrasena borra global y por IP; el primer error después no vuelve a bloquear")
    void resetDeContrasenaLimpiaContadores() throws Exception {
        when(otpService.canjearOtpVerificado(any(), eq(Constants.OTP_TIPO_RESET_PASSWORD), anyString())).thenReturn(true);
        bloquearCuenta();

        assertThat(passwordResetService.cambiarContrasena(testUser.getCorreo(), "123456", "NuevaClave123!")).isPresent();

        verificarQueElPrimerErrorNoVuelveABloquear();
        MockHttpServletResponse ok = mockMvc.perform(post("/api/auth/login").with(desde(IP_A)).contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("correo", testUser.getCorreo(), "contrasena", "NuevaClave123!"))))
            .andReturn().getResponse();
        assertThat(ok.getStatus()).as("la IP que estaba agotada entra con la clave nueva").isEqualTo(200);
    }

    @Test
    @DisplayName("L1 WebAuthn: un login/finish exitoso borra los tropiezos de esa IP y los globales, como un login completo")
    void webauthnExitosoLimpiaContadores() throws Exception {
        when(webAuthnService.finishAuthentication(eq(testUser.getCorreo()), anyString())).thenReturn(true);
        for (int i = 0; i < 3; i++) login(IP_A, "mala");
        assertThat(contadoresDelUsuario()).as("precondición: global + IP").isEqualTo(2);

        var r = mockMvc.perform(post("/api/auth/webauthn/login/finish").with(desde(IP_A)).contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("email", testUser.getCorreo(), "response", "{}"))))
            .andReturn().getResponse();

        assertThat(r.getStatus()).isEqualTo(200);
        assertThat(contadoresDelUsuario()).as("WebAuthn limpió los contadores").isZero();
        assertThat(recargar().getIntentosFallidos()).isZero();
        // con los 3 previos no limpiados, estos 4 sumarían 7 ≥ 5 y la IP quedaría agotada
        for (int i = 0; i < 4; i++) login(IP_A, "mala");
        assertThat(login(IP_A, PASS).getStatus()).isEqualTo(200);
    }
}
