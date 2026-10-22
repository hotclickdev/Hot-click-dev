package com.hotclick.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests de integración para flujo de autenticación:
 * login, refresh, logout, y validación de tokens.
 */
@DisplayName("Auth — integration tests")
class AuthIntegrationTest extends BaseIntegrationTest {

    @Autowired private ObjectMapper mapper;

    // ── Login ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/login → credenciales válidas retorna access + refresh token")
    void login_validCredentials_returnsTokens() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    "testuser@hotclick.cr",
                    "contrasena", "Test1234!"
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.refreshToken").isNotEmpty())
            .andExpect(jsonPath("$.rol").value(Constants.ROL_USUARIO_FINAL))
            .andExpect(jsonPath("$.correo").value("testuser@hotclick.cr"));
    }

    @Test
    @DisplayName("POST /api/auth/login → contraseña incorrecta retorna 401")
    void login_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    "testuser@hotclick.cr",
                    "contrasena", "WRONG_PASS"
                ))))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/auth/login → correo inexistente retorna 401 (no user enumeration)")
    void login_unknownEmail_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    "nobody@hotclick.cr",
                    "contrasena", "anything"
                ))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/login → cuenta inactiva retorna 403")
    void login_inactiveAccount_returns403() throws Exception {
        testUser.setEstado(Constants.ESTADO_INACTIVO);
        usuarioRepository.saveAndFlush(testUser);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    "testuser@hotclick.cr",
                    "contrasena", "Test1234!"
                ))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/auth/login → cuenta suspendida retorna 403")
    void login_suspendedAccount_returns403() throws Exception {
        testUser.setEstado(Constants.ESTADO_SUSPENDIDO);
        usuarioRepository.saveAndFlush(testUser);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    "testuser@hotclick.cr",
                    "contrasena", "Test1234!"
                ))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/auth/login → admin sin 2FA configurado → 200 (2FA opcional)")
    void login_adminUser_returnsAdminRole() throws Exception {
        // Admin sin twoFactorEnabled=true puede entrar con solo contraseña
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    "adminit@hotclick.cr",
                    "contrasena", "Test1234!"
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    // ── H-03: Origin en /refresh (fail-closed) ───────────────────────────────

    @Test
    @DisplayName("POST /api/auth/refresh sin Origin → 403 genérico")
    void refresh_sinOrigin_403() throws Exception {
        String rt = mapper.readTree(doLogin("testuser@hotclick.cr", "Test1234!")).path("refreshToken").asText();
        mockMvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", rt))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/auth/refresh con otro puerto o barra final en Origin → 403 (solo coincidencia exacta)")
    void refresh_originPuertoOBarra_403() throws Exception {
        String rt = mapper.readTree(doLogin("testuser@hotclick.cr", "Test1234!")).path("refreshToken").asText();
        for (String o : new String[]{"http://localhost:3001", "http://localhost", "http://localhost:3000/", "http://localhost:3000//"}) {
            mockMvc.perform(post("/api/auth/refresh").header("Origin", o).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of("refreshToken", rt))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.accessToken").doesNotExist());
        }
    }

    @Test
    @DisplayName("POST /api/auth/refresh con Origin ajeno → 403 genérico y no rota el token")
    void refresh_originAjeno_403() throws Exception {
        String rt = mapper.readTree(doLogin("testuser@hotclick.cr", "Test1234!")).path("refreshToken").asText();
        for (String o : new String[]{"https://evil.example.com", "http://localhost:3000.evil.example.com", "null"}) {
            mockMvc.perform(post("/api/auth/refresh").header("Origin", o).contentType(MediaType.APPLICATION_JSON)
                    .content(mapper.writeValueAsString(Map.of("refreshToken", rt))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.accessToken").doesNotExist());
        }
        // el token sigue siendo válido desde el origen permitido
        mockMvc.perform(post("/api/auth/refresh").header("Origin", "http://localhost:3000").contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", rt))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    // ── Refresh token ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/refresh → refresh token válido retorna nuevo access token")
    void refresh_validToken_returnsNewAccessToken() throws Exception {
        String loginBody = doLogin("testuser@hotclick.cr", "Test1234!");
        String refreshToken = mapper.readTree(loginBody).path("refreshToken").asText();

        mockMvc.perform(post("/api/auth/refresh").header("Origin", "http://localhost:3000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/auth/refresh → token inventado retorna 401")
    void refresh_invalidToken_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh").header("Origin", "http://localhost:3000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "refreshToken", "not-a-real-token-uuid"
                ))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/refresh → sin body retorna 400")
    void refresh_missingBody_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/refresh").header("Origin", "http://localhost:3000")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/logout → revoca refresh token (no se puede reusar)")
    void logout_revokesRefreshToken() throws Exception {
        String loginBody = doLogin("testuser@hotclick.cr", "Test1234!");
        String refreshToken = mapper.readTree(loginBody).path("refreshToken").asText();

        // Logout
        mockMvc.perform(post("/api/auth/logout")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(status().isOk());

        // Mismo token ya no puede refrescar
        mockMvc.perform(post("/api/auth/refresh").header("Origin", "http://localhost:3000")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(status().isUnauthorized());
    }

    // ── JWT con endpoint protegido ────────────────────────────────────────────

    @Test
    @DisplayName("Token JWT válido → endpoint protegido retorna 200")
    void validJwt_protectedEndpoint_returns200() throws Exception {
        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", userToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("JWT malformado → retorna 401")
    void malformedJwt_returns401() throws Exception {
        mockMvc.perform(get("/api/pedidos/usuario/1")
                .header("Authorization", "Bearer this.is.not.valid.jwt"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Token temp (2FA pending) → no puede acceder endpoints protegidos")
    void tempToken_blockedFromProtectedEndpoints() throws Exception {
        String tempToken = "Bearer " + jwtUtil.generateTempToken(
            testUser.getCorreo(), testUser.getId());

        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", tempToken))
            .andExpect(status().isUnauthorized());
    }

    // ── helper ────────────────────────────────────────────────────────────────

    private String doLogin(String correo, String pass) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("correo", correo, "contrasena", pass))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
    }
    // ── Anti-enumeración ────────────────────────────────────────────────────

    private String loginRaw(String correo, String clave) throws Exception {
        return mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("correo", correo, "contrasena", clave))))
            .andExpect(status().isUnauthorized())
            .andReturn().getResponse().getContentAsString();
    }

    private com.fasterxml.jackson.databind.JsonNode sinTimestamp(String json) throws Exception {
        var n = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(json);
        n.remove("timestamp");
        return n;
    }

    @Test
    @DisplayName("Cuenta bloqueada, clave incorrecta y usuario desconocido → mismo 401 y mismo JSON (salvo timestamp)")
    void login_bloqueada_igualQueCredencialesInvalidas() throws Exception {
        String claveMala = loginRaw("testuser@hotclick.cr", "WRONG_PASS");
        String desconocido = loginRaw("nobody@example.com", "anything");

        testUser = usuarioRepository.findByCorreo("testuser@hotclick.cr").orElseThrow();
        testUser.setBloqueadoHasta(java.time.LocalDateTime.now(Constants.ZONA_CR).plusMinutes(30));
        usuarioRepository.saveAndFlush(testUser);
        // Con la clave CORRECTA: aun así no se distingue de una clave incorrecta.
        String bloqueada = loginRaw("testuser@hotclick.cr", "Test1234!");

        org.junit.jupiter.api.Assertions.assertEquals(sinTimestamp(claveMala), sinTimestamp(bloqueada));
        org.junit.jupiter.api.Assertions.assertEquals(sinTimestamp(desconocido), sinTimestamp(bloqueada));
    }

    private com.fasterxml.jackson.databind.JsonNode webauthnStart(String email) throws Exception {
        String body = mockMvc.perform(post("/api/auth/webauthn/login/start")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("email", email))))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        return mapper.readTree(mapper.readTree(body).get("options").asText());
    }

    private static java.util.List<String> forma(com.fasterxml.jackson.databind.JsonNode n, String prefijo) {
        var out = new java.util.ArrayList<String>();
        n.fieldNames().forEachRemaining(k -> {
            var v = n.get(k);
            out.add(prefijo + k + ":" + v.getNodeType());
            if (v.isObject()) out.addAll(forma(v, prefijo + k + "."));
            if (v.isArray()) for (int i = 0; i < v.size(); i++) {
                out.add(prefijo + k + "[" + i + "]");
                if (v.get(i).isObject()) out.addAll(forma(v.get(i), prefijo + k + "[]."));
            }
        });
        java.util.Collections.sort(out);
        return out;
    }

    @Test
    @DisplayName("WebAuthn login/start → misma forma para usuario existente y desconocido; id sintético determinista")
    void webauthnStart_mismaFormaExistaONo() throws Exception {
        var existente = webauthnStart("testuser@hotclick.cr");
        var desconocido = webauthnStart("nobody@example.com");
        var desconocido2 = webauthnStart("nobody@example.com");

        org.junit.jupiter.api.Assertions.assertEquals(forma(existente, ""), forma(desconocido, ""));
        var allowDesc = desconocido.at("/publicKey/allowCredentials");
        org.junit.jupiter.api.Assertions.assertEquals(4 /* WebAuthnService.CANTIDAD_ALLOW_CREDENTIALS */, allowDesc.size());
        org.junit.jupiter.api.Assertions.assertEquals(allowDesc.size(), existente.at("/publicKey/allowCredentials").size());
        org.junit.jupiter.api.Assertions.assertEquals(
            allowDesc.get(0).get("id").asText().length(),
            existente.at("/publicKey/allowCredentials/0/id").asText().length());
        // Determinista por correo; el reto (challenge) sí cambia.
        org.junit.jupiter.api.Assertions.assertEquals(allowDesc, desconocido2.at("/publicKey/allowCredentials"));
        org.junit.jupiter.api.Assertions.assertNotEquals(
            desconocido.at("/publicKey/challenge"), desconocido2.at("/publicKey/challenge"));
    }
}
