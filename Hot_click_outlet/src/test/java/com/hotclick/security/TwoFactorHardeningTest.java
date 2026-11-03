package com.hotclick.security;

import com.fasterxml.jackson.databind.JsonNode;
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

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Endurecimiento 2FA: con el 2FA activo, reconfigurar (/2fa/setup) o desactivar (/2fa/disable)
 * exige credencial vigente; los tres endpoints tienen tope por IP (429).
 */
@DisplayName("[2FA] setup/disable exigen credencial y los endpoints tienen rate limit")
class TwoFactorHardeningTest extends BaseIntegrationTest {

    @Autowired private ObjectMapper mapper;

    // Semilla generada en cada corrida (no hay valor fijo en el repo).
    private final String semilla = new DefaultSecretGenerator().generate();
    private static final String PASS   = "Test1234!";

    private void activar2faTotp() {
        testUser.setTwoFactorEnabled(true);
        testUser.addMethod(Constants.METODO_2FA_TOTP);
        testUser.setTwoFactorSecret(semilla);
        usuarioRepository.saveAndFlush(testUser);
    }

    private String codigoValido() throws Exception {
        return new DefaultCodeGenerator().generate(semilla, Math.floorDiv(System.currentTimeMillis() / 1000, 30));
    }

    private Usuario recargar() {
        return usuarioRepository.findById(testUser.getId()).orElseThrow();
    }

    private org.springframework.test.web.servlet.ResultActions llamar(String ruta, Map<String, String> body) throws Exception {
        var req = post("/api/auth/2fa/" + ruta).header("Authorization", userToken);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body));
        return mockMvc.perform(req);
    }

    // ── setup con 2FA activo ────────────────────────────────────────────────

    @Test
    void setup_conDosFaActivo_sinCredencial_401_ySecretoIntacto() throws Exception {
        activar2faTotp();
        llamar("setup", null).andExpect(status().isUnauthorized());
        llamar("setup", Map.of()).andExpect(status().isUnauthorized());
        Usuario u = recargar();
        assertThat(u.getTwoFactorSecret()).isEqualTo(semilla);
        assertThat(u.getTwoFactorEnabled()).isTrue();
    }

    @Test
    void setup_conDosFaActivo_contrasenaIncorrecta_oCodigoIncorrecto_401() throws Exception {
        activar2faTotp();
        llamar("setup", Map.of("contrasena", "Otra1234!")).andExpect(status().isUnauthorized());
        llamar("setup", Map.of("code", "000000")).andExpect(status().isUnauthorized());
        assertThat(recargar().getTwoFactorSecret()).isEqualTo(semilla);
    }

    @Test
    void setup_conDosFaActivo_conContrasenaVigenteYCodigo_200_peroNoPisaElSecretoVigente() throws Exception {
        activar2faTotp();
        llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isUnauthorized());   // B3: falta el código vigente
        llamar("setup", Map.of("contrasena", PASS, "code", codigoValido())).andExpect(status().isOk());
        Usuario u = recargar();
        assertThat(u.getTwoFactorSecret()).isEqualTo(semilla);   // el vigente sigue igual hasta activar
        assertThat(u.getTwoFactorPendingSecret()).isNotNull();
        assertThat(u.hasTotpEnabled()).isTrue();
    }

    @Test
    void setup_conDosFaActivo_soloConCodigoTotp_401_laContrasenaEsSiempreObligatoria() throws Exception {
        activar2faTotp();
        llamar("setup", Map.of("code", codigoValido())).andExpect(status().isUnauthorized());
        Usuario u = recargar();
        assertThat(u.getTwoFactorSecret()).isEqualTo(semilla);
        assertThat(u.getTwoFactorPendingSecret()).isNull();
    }

    @Test
    void setup_sinDosFaActivo_conContrasena_200_dejaSecretoPendiente() throws Exception {
        llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isOk());
        Usuario u = recargar();
        assertThat(u.getTwoFactorPendingSecret()).isNotNull();
        assertThat(u.getTwoFactorSecret()).isNull();
        assertThat(u.getTwoFactorEnabled()).isFalse();
    }

    // ── disable ─────────────────────────────────────────────────────────────

    @Test
    void disable_sinCredencial_401_yNoDesactiva() throws Exception {
        activar2faTotp();
        llamar("disable", null).andExpect(status().isUnauthorized());
        llamar("disable", Map.of()).andExpect(status().isUnauthorized());
        llamar("disable", Map.of("contrasena", PASS)).andExpect(status().isUnauthorized());
        llamar("disable", Map.of("code", codigoValido())).andExpect(status().isUnauthorized());
        Usuario u = recargar();
        assertThat(u.getTwoFactorSecret()).isEqualTo(semilla);
        assertThat(u.hasTotpEnabled()).isTrue();
    }

    @Test
    void disable_conContrasenaYCodigo_200() throws Exception {
        activar2faTotp();
        llamar("disable", Map.of("contrasena", PASS, "code", codigoValido())).andExpect(status().isOk());
        assertThat(recargar().getTwoFactorSecret()).isNull();
    }

    // ── activate: camino feliz ──────────────────────────────────────────────

    @Test
    void setup_y_activate_caminoFeliz() throws Exception {
        String resp = llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode n = mapper.readTree(resp);
        String secreto = n.findValue("secret").asText();
        String code = new DefaultCodeGenerator().generate(secreto, Math.floorDiv(System.currentTimeMillis() / 1000, 30));
        llamar("activate", Map.of("code", code, "contrasena", PASS)).andExpect(status().isOk());
        Usuario u = recargar();
        assertThat(u.getTwoFactorPendingSecret()).isNull();
        assertThat(u.getTwoFactorSecret()).isNotNull();
        assertThat(u.hasTotpEnabled()).isTrue();
    }

    // ── rate limit (429) con el limiter real ────────────────────────────────

    @Test
    void setup_superadoElTope_429() throws Exception {
        for (int i = 0; i < 5; i++) llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isOk());
        llamar("setup", Map.of("contrasena", PASS)).andExpect(status().isTooManyRequests());
    }

    @Test
    void activate_superadoElTope_429() throws Exception {
        for (int i = 0; i < 10; i++) llamar("activate", Map.of("code", "000000")).andExpect(status().is4xxClientError());
        llamar("activate", Map.of("code", "000000")).andExpect(status().isTooManyRequests());
    }

    @Test
    void disable_superadoElTope_429() throws Exception {
        activar2faTotp();
        for (int i = 0; i < 5; i++) llamar("disable", Map.of("contrasena", "mala", "code", "000000")).andExpect(status().isUnauthorized());
        llamar("disable", Map.of("contrasena", PASS, "code", codigoValido())).andExpect(status().isTooManyRequests());
        assertThat(recargar().getTwoFactorSecret()).isEqualTo(semilla);
    }
}
