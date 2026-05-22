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

    // ── Refresh token ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /api/auth/refresh → refresh token válido retorna nuevo access token")
    void refresh_validToken_returnsNewAccessToken() throws Exception {
        String loginBody = doLogin("testuser@hotclick.cr", "Test1234!");
        String refreshToken = mapper.readTree(loginBody).path("refreshToken").asText();

        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of("refreshToken", refreshToken))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/auth/refresh → token inventado retorna 401")
    void refresh_invalidToken_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "refreshToken", "not-a-real-token-uuid"
                ))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/refresh → sin body retorna 400")
    void refresh_missingBody_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
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
        mockMvc.perform(post("/api/auth/refresh")
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
}
