package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests de seguridad: endpoints públicos, autenticados y admin-only.
 * Verifica el modelo de autorización completo sin usar mocks de servicios.
 */
@DisplayName("Security — endpoint authorization tests")
class SecurityEndpointsTest extends BaseIntegrationTest {

    // ── Endpoints públicos — sin auth requerida ───────────────────────────────

    @Test
    @DisplayName("GET /api/health → público, sin token")
    void healthCheck_public_noAuth() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/productos → público, sin token")
    void productos_public_noAuth() throws Exception {
        mockMvc.perform(get("/api/productos"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/marcas/publicas → público, sin token")
    void marcasPublicas_public_noAuth() throws Exception {
        mockMvc.perform(get("/api/marcas/publicas"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/categorias → público, sin token")
    void categorias_public_noAuth() throws Exception {
        mockMvc.perform(get("/api/categorias"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/auth/login → público, sin token")
    void authLogin_public_noAuth() throws Exception {
        // Solo verificamos que no retorna 401/403 por auth
        // (contraseña >= 6 chars para pasar la validación @Size y llegar al chequeo de credenciales)
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"x@x.com\",\"contrasena\":\"wrongpassword\"}"))
            .andExpect(status().isUnauthorized()); // 401 por credenciales, no por auth filter
    }

    // ── Endpoints autenticados — requieren JWT válido ─────────────────────────

    @Test
    @DisplayName("GET /api/pedidos/usuario/{id} sin token → 401")
    void pedidosUsuario_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/pedidos/usuario/1"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/pedidos/usuario/{id} con token válido → 200")
    void pedidosUsuario_withToken_returns200() throws Exception {
        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", userToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/payments/checkout sin token → 401")
    void checkoutSinToken_returns401() throws Exception {
        mockMvc.perform(post("/api/payments/checkout")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isUnauthorized());
    }

    // ── Endpoints admin-only (ADMIN_IT) ───────────────────────────────────────

    @Test
    @DisplayName("GET /api/pedidos (list all) sin token → 401")
    void listarPedidos_noToken_returns401() throws Exception {
        mockMvc.perform(get("/api/pedidos"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/pedidos (list all) con token user → 403")
    void listarPedidos_userToken_returns403() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/pedidos (list all) con token admin → 200")
    void listarPedidos_adminToken_returns200() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", adminToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/pedidos/manual con token user → 403")
    void crearPedidoManual_userToken_returns403() throws Exception {
        mockMvc.perform(post("/api/pedidos/manual")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/pedidos/pendientes con token user → 403")
    void pedidosPendientes_userToken_returns403() throws Exception {
        mockMvc.perform(get("/api/pedidos/pendientes")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/pedidos/pendientes con token admin → 200")
    void pedidosPendientes_adminToken_returns200() throws Exception {
        mockMvc.perform(get("/api/pedidos/pendientes")
                .header("Authorization", adminToken))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/admin/** con token user → 403")
    void adminDashboard_userToken_returns403() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard/kpis")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── Cross-user access ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Usuario no puede ver pedidos de otro usuario")
    void user_cannotSeeOtherUserPedidos() throws Exception {
        // testUser intenta acceder a pedidos de adminUser
        mockMvc.perform(get("/api/pedidos/usuario/" + adminUser.getId())
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── Webhooks — públicos (sin auth) ────────────────────────────────────────

    @Test
    @DisplayName("POST /api/webhooks/payxpert → 410 Gone (PayXpert archivado 2026-05-21)")
    void webhookPayxpert_public_noAuthRequired() throws Exception {
        mockMvc.perform(post("/api/webhooks/payxpert")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"OrderID\":\"TEST\",\"ErrorCode\":\"000\",\"Status\":\"Authorised\"}"))
            .andExpect(status().isGone());
    }

    // ── Inputs malformados ────────────────────────────────────────────────────

    @Test
    @DisplayName("JSON malformado → 400 Bad Request")
    void malformedJson_returns400() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ this is : not json }"))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Token JWT con firma alterada → 401")
    void tamperedJwt_returns401() throws Exception {
        String validToken = userToken.replace("Bearer ", "");
        // Alterar los últimos 5 caracteres de la firma
        String tampered = "Bearer " + validToken.substring(0, validToken.length() - 5) + "XXXXX";

        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", tampered))
            .andExpect(status().isUnauthorized());
    }
}
