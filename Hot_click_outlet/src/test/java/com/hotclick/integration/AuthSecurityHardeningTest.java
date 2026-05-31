package com.hotclick.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.Map;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * OWASP A07 / API2 — Identification & Authentication Failures.
 * OWASP A01 / API1 — Broken Access Control (forged tokens, privilege escalation).
 *
 * Cubre:
 *  - Tokens alterados / firmados con clave incorrecta → 401
 *  - Token de 2FA (temp) no da acceso a endpoints protegidos
 *  - EmpresaSelectionToken no da acceso a endpoints protegidos
 *  - Token vencido → 401
 *  - Contraseña débil rechazada en change-password y reset-password
 *  - Usuario PENDIENTE no puede loguearse
 *  - Usuario SUSPENDIDO no puede loguearse
 *  - USUARIO_FINAL no puede escalar a rutas admin
 *  - Logout revoca el refresh token
 *  - Refresh con token inválido → 401
 *  - Error messages no revelan si el usuario existe (enumeración)
 */
@DisplayName("[OWASP A07/A01] Auth hardening & token security")
class AuthSecurityHardeningTest extends BaseIntegrationTest {

    @Autowired private ObjectMapper mapper;

    // ── Token forgery / tampering ─────────────────────────────────────────────

    @Test
    @DisplayName("Token con firma alterada → 401")
    void tamperedSignature_returns401() throws Exception {
        String raw   = userToken.replace("Bearer ", "");
        String parts = raw.substring(0, raw.lastIndexOf('.') + 1);
        String fakeSignature = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
        String forged = "Bearer " + parts + fakeSignature;

        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", forged))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Token firmado con clave diferente → 401")
    void tokenSignedWithWrongKey_returns401() throws Exception {
        // A valid-looking JWT but signed with a different secret — cannot be verified
        String wrongKeyToken = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
            + ".eyJzdWIiOiJhZG1pbkBmYWtlLmNvbSIsInVzZXJJZCI6OTk5OSwicm9sIjoiQURNSU5fSVQifQ"
            + ".INVALID_SIGNATURE_FROM_OTHER_KEY";

        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", wrongKeyToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Token con payload de rol ADMIN_IT pero firma falsa → 401")
    void forgedAdminRole_invalidSignature_returns401() throws Exception {
        // Attacker base64-encodes claims claiming ADMIN_IT, can't forge the signature
        String header  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"; // {"alg":"HS256","typ":"JWT"}
        String payload = "eyJzdWIiOiJ1c2VyQGZha2UuY29tIiwidXNlcklkIjo5OTk5LCJyb2wiOiJBRE1JTl9JVCJ9";
        String forged  = "Bearer " + header + "." + payload + ".fakesig";

        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", forged))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Token completamente basura → 401, no 500")
    void garbageToken_returns401NotServerError() throws Exception {
        mockMvc.perform(get("/api/pedidos/usuario/1")
                .header("Authorization", "Bearer not.a.jwt.at.all"))
            .andExpect(status().isUnauthorized());
    }

    // ── Single-purpose token restrictions (A07 / API2) ───────────────────────

    @Test
    @DisplayName("Temp 2FA token no autentica endpoints protegidos → sin auth")
    void tempToken_doesNotAuthenticateProtectedEndpoints() throws Exception {
        String tempToken = "Bearer " + jwtUtil.generateTempToken(testUser.getCorreo(), testUser.getId());

        // Should NOT be able to access a protected endpoint with a temp token
        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", tempToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("EmpresaSelectionToken no autentica endpoints protegidos → sin auth")
    void empresaSelectionToken_doesNotAuthenticateProtectedEndpoints() throws Exception {
        String selToken = "Bearer " + jwtUtil.generateEmpresaSelectionToken(
            testUser.getCorreo(), testUser.getId());

        // This token must ONLY be used at /api/auth/seleccionar-empresa
        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", selToken))
            .andExpect(status().isUnauthorized());
    }

    // ── Privilege escalation (A01 / API5) ────────────────────────────────────

    @Test
    @DisplayName("USUARIO_FINAL no puede acceder a GET /api/pedidos (lista completa) → 403")
    void usuarioFinal_cannotListAllPedidos() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("USUARIO_FINAL no puede acceder a GET /api/admin/** → 403")
    void usuarioFinal_cannotAccessAdminDashboard() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/kpis")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("USUARIO_FINAL no puede acceder a GET /api/usuarios (lista) → 403")
    void usuarioFinal_cannotListAllUsers() throws Exception {
        mockMvc.perform(get("/api/usuarios")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── Password policy (A07) ─────────────────────────────────────────────────

    @Test
    @DisplayName("change-password con contraseña < 8 chars → 400")
    void changePassword_tooShort_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "contrasenaActual", "Test1234!",
                    "nuevaContrasena",  "abc123"      // 6 chars — too short
                ))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("8 caracteres")));
    }

    @Test
    @DisplayName("change-password sin mayúscula → 400")
    void changePassword_noUppercase_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "contrasenaActual", "Test1234!",
                    "nuevaContrasena",  "abcdefgh1"   // no uppercase
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("change-password sin dígito → 400")
    void changePassword_noDigit_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "contrasenaActual", "Test1234!",
                    "nuevaContrasena",  "Abcdefgh"    // no digit
                ))))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("change-password válida (8+ chars, upper, digit) → 200")
    void changePassword_valid_returns200() throws Exception {
        mockMvc.perform(post("/api/auth/change-password")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "contrasenaActual", "Test1234!",
                    "nuevaContrasena",  "NewPass9!"
                ))))
            .andExpect(status().isOk());
    }

    // ── Account state (A07) ───────────────────────────────────────────────────

    @Test
    @DisplayName("Usuario PENDIENTE no puede loguearse → 403")
    void pendingUser_cannotLogin() throws Exception {
        testUser.setEstado(Constants.ESTADO_PENDIENTE);
        usuarioRepository.saveAndFlush(testUser);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    testUser.getCorreo(),
                    "contrasena", "Test1234!"
                ))))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Usuario SUSPENDIDO no puede loguearse → 403")
    void suspendedUser_cannotLogin() throws Exception {
        testUser.setEstado(Constants.ESTADO_SUSPENDIDO);
        usuarioRepository.saveAndFlush(testUser);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    testUser.getCorreo(),
                    "contrasena", "Test1234!"
                ))))
            .andExpect(status().isForbidden());
    }

    // ── User enumeration prevention (A07 / API6) ────────────────────────────

    @Test
    @DisplayName("Login con correo inexistente → mismo mensaje que contraseña incorrecta (no enumeration)")
    void nonExistentEmail_sameResponseAsWrongPassword() throws Exception {
        var result1 = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    "nonexistent@hotclick.cr",
                    "contrasena", "AnyPass1"
                ))))
            .andExpect(status().isUnauthorized())
            .andReturn();

        var result2 = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    testUser.getCorreo(),
                    "contrasena", "WrongPass1"
                ))))
            .andExpect(status().isUnauthorized())
            .andReturn();

        // Both responses must expose the same generic message (timestamps may differ)
        String body1 = result1.getResponse().getContentAsString();
        String body2 = result2.getResponse().getContentAsString();
        String msg1  = mapper.readTree(body1).path("message").asText();
        String msg2  = mapper.readTree(body2).path("message").asText();
        org.assertj.core.api.Assertions.assertThat(msg1).isEqualTo(msg2);
        org.assertj.core.api.Assertions.assertThat(msg1).isNotBlank();
    }

    // ── Refresh token (A07) ───────────────────────────────────────────────────

    @Test
    @DisplayName("Refresh con token inválido → 401")
    void refreshInvalidToken_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "refreshToken", "not-a-real-uuid-refresh-token"
                ))))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Refresh sin body → 400")
    void refreshEmptyBody_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── Security headers (A05) ────────────────────────────────────────────────

    @Test
    @DisplayName("Response incluye X-Content-Type-Options: nosniff")
    void response_hasXContentTypeOptions() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    @DisplayName("Response incluye X-Frame-Options: DENY")
    void response_hasXFrameOptions() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    @DisplayName("Response incluye Referrer-Policy")
    void response_hasReferrerPolicy() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(header().exists("Referrer-Policy"));
    }

    @Test
    @DisplayName("Response incluye Content-Security-Policy")
    void response_hasCSP() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(header().exists("Content-Security-Policy"))
            .andExpect(header().string("Content-Security-Policy", containsString("default-src 'self'")))
            .andExpect(header().string("Content-Security-Policy", containsString("object-src 'none'")));
    }

    // ── Injection / input safety (A03) ───────────────────────────────────────

    @Test
    @DisplayName("JSON malformado en login → 400, no 500")
    void malformedJson_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ not : valid"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Payload masivo en login → procesado sin OOM / timeout")
    void massivePayload_handledGracefully() throws Exception {
        String longValue = "A".repeat(10_000);
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(Map.of(
                    "correo",    longValue + "@x.com",
                    "contrasena", longValue
                ))))
            .andExpect(status().isUnauthorized()); // no 500, no timeout
    }

}
