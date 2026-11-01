package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguimiento 2FA (pedido de Seguridad):
 * 1) setup y activate exigen la contraseña actual aunque el 2FA esté apagado;
 * 2) tope por usuarioId (tryAcquireEstricto, falla cerrado) en todo /2fa/*;
 * 3) disable responde igual con contraseña mala o código malo;
 * 4) el secreto nuevo queda pendiente hasta que activate valida un código.
 */
@DisplayName("[2FA] seguimiento: contraseña en setup/activate, tope por usuario, 401 unificado, secreto pendiente")
class TwoFactorSeguimientoTest extends BaseIntegrationTest {

    @Autowired private ObjectMapper mapper;
    @Autowired private RateLimiter  rateLimiter;
    @Autowired private com.hotclick.service.TwoFactorService twoFactorService;

    private static final String PASS = "Test1234!";
    private final String semilla = new DefaultSecretGenerator().generate();

    private void activar2faTotp() {
        testUser.addMethod(Constants.METODO_2FA_TOTP);
        testUser.setTwoFactorSecret(twoFactorService.encryptForStorage(semilla));
        usuarioRepository.saveAndFlush(testUser);
    }

    private String codigo(String secreto) throws Exception {
        return new DefaultCodeGenerator().generate(secreto, Math.floorDiv(System.currentTimeMillis() / 1000, 30));
    }

    private Usuario recargar() {
        return usuarioRepository.findById(testUser.getId()).orElseThrow();
    }

    private ResultActions llamar(String ruta, Map<String, String> body) throws Exception {
        var req = post("/api/auth/2fa/" + ruta).header("Authorization", userToken);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body));
        return mockMvc.perform(req);
    }

    /** El cuerpo trae un timestamp que cambia en cada respuesta; lo demás debe ser idéntico. */
    private static String sinHora(String cuerpo) {
        return cuerpo.replaceAll("\"timestamp\":\"[^\"]*\"", "\"timestamp\":\"-\"");
    }

    private String secretoDelSetup(String resp) throws Exception {
        return mapper.readTree(resp).findValue("secret").asText();
    }

    // ── (1) contraseña obligatoria en setup y activate, con el 2FA apagado ──────

    @Test
    void setup_conDosFaApagado_sinContrasena_401_ynoGuardaNada() throws Exception {
        llamar("setup", null).andExpect(status().isUnauthorized());
        llamar("setup", Map.of()).andExpect(status().isUnauthorized());
        llamar("setup", Map.of("contrasena", "Otra1234!")).andExpect(status().isUnauthorized());
        Usuario u = recargar();
        assertThat(u.getTwoFactorPendingSecret()).isNull();
        assertThat(u.getTwoFactorSecret()).isNull();
    }

    @Test
    void activate_conDosFaApagado_sinContrasena_401_aunqueElCodigoSeaValido() throws Exception {
        String resp = llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String nuevo = secretoDelSetup(resp);
        llamar("activate", Map.of("code", codigo(nuevo))).andExpect(status().isUnauthorized());
        llamar("activate", Map.of("code", codigo(nuevo), "contrasena", "Otra1234!")).andExpect(status().isUnauthorized());
        Usuario u = recargar();
        assertThat(u.hasTotpEnabled()).isFalse();
        assertThat(u.getTwoFactorPendingSecret()).isNotNull();
        llamar("activate", Map.of("code", codigo(nuevo), "contrasena", PASS)).andExpect(status().isOk());
        assertThat(recargar().hasTotpEnabled()).isTrue();
    }

    // ── (3) disable: mismo 401 y mismo cuerpo, sin oráculo ─────────────────────

    @Test
    void disable_contrasenaMala_y_codigoMalo_responden_identico() throws Exception {
        activar2faTotp();
        var contrasenaMala = llamar("disable", Map.of("contrasena", "Otra1234!", "code", codigo(semilla)))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        var codigoMalo = llamar("disable", Map.of("contrasena", PASS, "code", "000000"))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        var ambosMalos = llamar("disable", Map.of("contrasena", "Otra1234!", "code", "000000"))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertThat(sinHora(codigoMalo)).isEqualTo(sinHora(contrasenaMala));
        assertThat(sinHora(ambosMalos)).isEqualTo(sinHora(contrasenaMala));
        assertThat(sinHora(contrasenaMala)).contains("Contraseña o código incorrecto");
        assertThat(recargar().hasTotpEnabled()).isTrue();
    }

    // ── (4) secreto pendiente hasta activar ────────────────────────────────────

    @Test
    void setup_conTotpActivo_noPisaElSecretoVigente_yElLoginSigueConElViejo() throws Exception {
        activar2faTotp();
        String cifradoAntes = recargar().getTwoFactorSecret();
        String resp = llamar("setup", Map.of("contrasena", PASS, "code", codigo(semilla))).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String nuevo = secretoDelSetup(resp);
        Usuario u = recargar();
        assertThat(u.getTwoFactorSecret()).isEqualTo(cifradoAntes);
        assertThat(u.hasTotpEnabled()).isTrue();
        assertThat(u.getActiveMethods()).contains(Constants.METODO_2FA_TOTP);
        // El código del secreto viejo sigue valiendo para el login; el del pendiente todavía no.
        assertThat(twoFactorService.verifyCode(u.getTwoFactorSecret(), codigo(semilla))).isTrue();
        assertThat(twoFactorService.verifyCode(u.getTwoFactorSecret(), codigo(nuevo))).isFalse();
    }

    @Test
    void activate_conCodigoDelSecretoViejo_400_yElVigenteNoCambia() throws Exception {
        activar2faTotp();
        String cifradoAntes = recargar().getTwoFactorSecret();
        llamar("setup", Map.of("contrasena", PASS, "code", codigo(semilla))).andExpect(status().isOk());
        llamar("activate", Map.of("code", codigo(semilla), "contrasena", PASS)).andExpect(status().isBadRequest());
        Usuario u = recargar();
        assertThat(u.getTwoFactorSecret()).isEqualTo(cifradoAntes);
        assertThat(u.getTwoFactorPendingSecret()).isNotNull();
    }

    @Test
    void activate_conCodigoDelPendiente_200_yRecienAhoraRotaElSecreto() throws Exception {
        activar2faTotp();
        String cifradoAntes = recargar().getTwoFactorSecret();
        String resp = llamar("setup", Map.of("contrasena", PASS, "code", codigo(semilla))).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        String nuevo = secretoDelSetup(resp);
        llamar("activate", Map.of("code", codigo(nuevo), "contrasena", PASS)).andExpect(status().isOk());
        Usuario u = recargar();
        assertThat(u.getTwoFactorSecret()).isNotEqualTo(cifradoAntes);
        assertThat(u.getTwoFactorPendingSecret()).isNull();
        assertThat(u.hasTotpEnabled()).isTrue();
        assertThat(twoFactorService.verifyCode(u.getTwoFactorSecret(), codigo(nuevo))).isTrue();
    }

    // ── (4b) B3: rotar un secreto TOTP vigente exige también el código actual ──────

    @Test
    void setup_conTotpActivo_soloConContrasena_401_yNoGuardaPendiente() throws Exception {
        activar2faTotp();
        String cifradoAntes = recargar().getTwoFactorSecret();
        llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isUnauthorized());
        llamar("setup", Map.of("contrasena", PASS, "code", "")).andExpect(status().isUnauthorized());
        Usuario u = recargar();
        assertThat(u.getTwoFactorPendingSecret()).isNull();
        assertThat(u.getTwoFactorSecret()).isEqualTo(cifradoAntes);
    }

    @Test
    void setup_conTotpActivo_contrasenaMala_codigoMalo_o_ambos_responden_identico() throws Exception {
        activar2faTotp();
        var sinCodigo = llamar("setup", Map.of("contrasena", PASS))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        var codigoMalo = llamar("setup", Map.of("contrasena", PASS, "code", "000000"))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        var contrasenaMala = llamar("setup", Map.of("contrasena", "Otra1234!", "code", codigo(semilla)))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        var ambosMalos = llamar("setup", Map.of("contrasena", "Otra1234!", "code", "000000"))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        assertThat(sinHora(codigoMalo)).isEqualTo(sinHora(sinCodigo));
        assertThat(sinHora(contrasenaMala)).isEqualTo(sinHora(sinCodigo));
        assertThat(sinHora(ambosMalos)).isEqualTo(sinHora(sinCodigo));
        assertThat(sinHora(sinCodigo)).contains("Contraseña o código incorrecto");
        assertThat(recargar().getTwoFactorPendingSecret()).isNull();
    }

    @Test
    void setup_conTotpActivo_contrasenaYCodigoCorrectos_200_yGuardaElPendiente() throws Exception {
        activar2faTotp();
        llamar("setup", Map.of("contrasena", PASS, "code", codigo(semilla))).andExpect(status().isOk());
        assertThat(recargar().getTwoFactorPendingSecret()).isNotNull();
    }

    @Test
    void setup_sinTotpActivo_sigueBastandoLaContrasena() throws Exception {
        llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isOk());
        assertThat(recargar().getTwoFactorPendingSecret()).isNotNull();
    }

    @Test
    void activate_sinSetupPrevio_400() throws Exception {
        llamar("activate", Map.of("code", "123456", "contrasena", PASS)).andExpect(status().isBadRequest());
    }

    // ── (2) tope por usuarioId en todo /2fa/* ──────────────────────────────────

    private void agotarTopeGestion() {
        for (int i = 0; i < 15; i++) {
            assertThat(rateLimiter.tryAcquireEstricto("2fa:usuario:" + testUser.getId(), 15, 300)).isTrue();
        }
    }

    @Test
    void conElTopeDelUsuarioAgotado_todaLaGestion2fa_responde429() throws Exception {
        activar2faTotp();
        agotarTopeGestion();
        Map<String, String> cuerpo = Map.of("contrasena", PASS, "code", codigo(semilla));
        llamar("setup", cuerpo).andExpect(status().isTooManyRequests());
        llamar("activate", cuerpo).andExpect(status().isTooManyRequests());
        llamar("disable", cuerpo).andExpect(status().isTooManyRequests());
        llamar("recovery-codes/regenerate", cuerpo).andExpect(status().isTooManyRequests());
        llamar("email/enable", null).andExpect(status().isTooManyRequests());
        llamar("email/activate", cuerpo).andExpect(status().isTooManyRequests());
        llamar("email/disable", cuerpo).andExpect(status().isTooManyRequests());
        // y nada cambió
        Usuario u = recargar();
        assertThat(u.hasTotpEnabled()).isTrue();
        assertThat(u.getTwoFactorPendingSecret()).isNull();
    }

    @Test
    void elTopeEsPorUsuario_otroUsuarioNoSeAfecta() throws Exception {
        agotarTopeGestion();
        // un usuario distinto (otro id) tiene su propio bucket
        assertThat(rateLimiter.tryAcquireEstricto("2fa:usuario:" + (testUser.getId() + 1000), 15, 300)).isTrue();
    }

    private static final String IP_ATACANTE = "203.0.113.5";
    private static final String IP_DUENO     = "198.51.100.7";

    private static org.springframework.test.web.servlet.request.RequestPostProcessor desde(String ip) {
        return req -> { req.setRemoteAddr(ip); return req; };
    }

    private void agotarTopeLogin(String ip) {
        for (int i = 0; i < 10; i++) {
            assertThat(rateLimiter.tryAcquireEstricto("2fa:login:usuario:" + testUser.getId() + ":ip:" + ip, 10, 300)).isTrue();
        }
    }

    private ResultActions verify(String ip, String temp, String code) throws Exception {
        return mockMvc.perform(post("/api/auth/2fa/verify").with(desde(ip)).contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("tempToken", temp, "code", code))));
    }

    private ResultActions emailSend(String ip, String temp) throws Exception {
        return mockMvc.perform(post("/api/auth/2fa/email/send").with(desde(ip)).contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("tempToken", temp))));
    }

    @Test
    void conElTopeDeLoginAgotado_verifyYEmailSend_responden429_paraEsaIp() throws Exception {
        activar2faTotp();
        agotarTopeLogin(IP_ATACANTE);
        String temp = jwtUtil.generateTempToken(testUser.getCorreo(), testUser.getId());
        verify(IP_ATACANTE, temp, codigo(semilla)).andExpect(status().isTooManyRequests());
        emailSend(IP_ATACANTE, temp).andExpect(status().isTooManyRequests());
    }

    /** B1: quien tiene la contraseña (y por eso un tempToken) no le gasta el cupo de login al dueño desde otra IP. */
    @Test
    void elTopeDeLoginEsPorUsuarioMasIp_unAtacanteConLaContrasenaNoBloqueaAlDueno() throws Exception {
        activar2faTotp();
        agotarTopeLogin(IP_ATACANTE);
        String temp = jwtUtil.generateTempToken(testUser.getCorreo(), testUser.getId());
        verify(IP_ATACANTE, temp, "000000").andExpect(status().isTooManyRequests());
        // El dueño, desde su IP, sigue pudiendo entrar con su código.
        verify(IP_DUENO, temp, codigo(semilla)).andExpect(status().isOk());
    }

    @Test
    void elTopeDeLoginEsPorUsuarioMasIp_elDuenoTampocoPierdeElEmailSend() throws Exception {
        activar2faTotp();
        agotarTopeLogin(IP_ATACANTE);
        String temp = jwtUtil.generateTempToken(testUser.getCorreo(), testUser.getId());
        emailSend(IP_DUENO, temp).andExpect(result ->
            assertThat(result.getResponse().getStatus()).isNotEqualTo(429));
    }

    @Test
    void sinSesion_siguiendo401_yNoGastaElTopeDeNadie() throws Exception {
        mockMvc.perform(post("/api/auth/2fa/setup").contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void fallaCerrado_siLaBdDelLimiterNoResponde() {
        org.springframework.jdbc.core.JdbcTemplate roto = org.mockito.Mockito.mock(org.springframework.jdbc.core.JdbcTemplate.class);
        org.mockito.Mockito.when(roto.queryForList(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.eq(Long.class), org.mockito.ArgumentMatchers.any()))
            .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("bd caída"));
        assertThat(new RateLimiter(roto).tryAcquireEstricto("2fa:usuario:1", 15, 300)).isFalse();
    }
}
