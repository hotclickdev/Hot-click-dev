package com.hotclick.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.CarritoAbandonado;
import com.hotclick.repository.CarritoAbandonadoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * OWASP A01 / API1 — Broken Object Level Authorization (IDOR).
 *
 * Verifica que el endpoint DELETE /api/cart/abandoned/{id}:
 *  - Requiere sessionId que coincida con el carrito (o userId autenticado).
 *  - Rechaza borrar un carrito ajeno con sessionId falso → 403.
 *  - Rechaza borrar un carrito ajeno sin sessionId → 403.
 *  - Permite borrar el propio carrito con sessionId correcto → 200.
 *  - Permite borrar cuando el userId autenticado es el dueño → 200.
 *  - Devuelve 404 para IDs inexistentes (no 403, no info leak).
 *  - Recuperación pública de carrito (GET) sigue funcionando sin auth.
 */
@DisplayName("[OWASP A01/API1] Carrito abandonado — IDOR protection")
class CartAbandonadoSecurityTest extends BaseIntegrationTest {

    @Autowired private CarritoAbandonadoRepository carritoRepo;
    @Autowired private ObjectMapper mapper;

    private static final String SESSION_A = "session-owner-aaaa-1111";
    private static final String SESSION_B = "session-attacker-bbbb-2222";

    private CarritoAbandonado carritoA; // owned by SESSION_A / testUser

    @BeforeEach
    void setUpCart() {
        carritoRepo.deleteAll();

        carritoA = new CarritoAbandonado();
        carritoA.setSessionId(SESSION_A);
        carritoA.setUserId(testUser.getId());
        carritoA.setStatus("PENDIENTE");
        carritoA.setItems("[{\"productoId\":1,\"cantidad\":1}]");
        carritoA = carritoRepo.saveAndFlush(carritoA);
    }

    @AfterEach
    void tearDownCart() {
        carritoRepo.deleteAll();
    }

    // ── IDOR: wrong sessionId → 403 ──────────────────────────────────────────

    @Test
    @DisplayName("DELETE carrito ajeno con sessionId incorrecto → 403 (IDOR blocked)")
    void delete_wrongSessionId_returns403() throws Exception {
        mockMvc.perform(delete("/api/cart/abandoned/" + carritoA.getId())
                .param("sessionId", SESSION_B))  // attacker's session
            .andExpect(status().isForbidden());

        // Cart must still exist
        assertThat(carritoRepo.existsById(carritoA.getId())).isTrue();
    }

    @Test
    @DisplayName("DELETE carrito sin sessionId ni auth → 403")
    void delete_noSessionNoAuth_returns403() throws Exception {
        mockMvc.perform(delete("/api/cart/abandoned/" + carritoA.getId()))
            .andExpect(status().isForbidden());

        assertThat(carritoRepo.existsById(carritoA.getId())).isTrue();
    }

    // ── Legitimate delete — sessionId owner ──────────────────────────────────

    @Test
    @DisplayName("DELETE propio carrito con sessionId correcto → 200")
    void delete_correctSessionId_returns200() throws Exception {
        mockMvc.perform(delete("/api/cart/abandoned/" + carritoA.getId())
                .param("sessionId", SESSION_A))
            .andExpect(status().isOk());

        assertThat(carritoRepo.existsById(carritoA.getId())).isFalse();
    }

    // ── Legitimate delete — authenticated owner ───────────────────────────────

    @Test
    @DisplayName("DELETE propio carrito autenticado (userId coincide) → 200")
    void delete_authenticatedOwner_returns200() throws Exception {
        // testUser is authenticated and owns the cart (userId set in setUp)
        mockMvc.perform(delete("/api/cart/abandoned/" + carritoA.getId())
                .header("Authorization", userToken))
            .andExpect(status().isOk());

        assertThat(carritoRepo.existsById(carritoA.getId())).isFalse();
    }

    @Test
    @DisplayName("DELETE carrito ajeno autenticado con userId distinto → 403")
    void delete_authenticatedNonOwner_returns403() throws Exception {
        // adminUser is authenticated but does NOT own the cart (different userId)
        mockMvc.perform(delete("/api/cart/abandoned/" + carritoA.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isForbidden());

        assertThat(carritoRepo.existsById(carritoA.getId())).isTrue();
    }

    // ── Non-existent cart ─────────────────────────────────────────────────────

    @Test
    @DisplayName("DELETE ID inexistente → 404 (no info leak)")
    void delete_nonExistentId_returns404() throws Exception {
        mockMvc.perform(delete("/api/cart/abandoned/999999")
                .param("sessionId", SESSION_A))
            .andExpect(status().isNotFound());
    }

    // ── Public recovery endpoints still work ─────────────────────────────────

    @Test
    @DisplayName("GET recover/{id} sigue siendo público (sin auth) → 200")
    void recover_public_noAuthNeeded() throws Exception {
        mockMvc.perform(get("/api/cart/abandoned/recover/" + carritoA.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.items").isArray());
    }

    @Test
    @DisplayName("GET session/{sessionId} sigue siendo público → 200")
    void session_public_noAuthNeeded() throws Exception {
        mockMvc.perform(get("/api/cart/abandoned/session/" + SESSION_A))
            .andExpect(status().isOk());
    }

    // ── POST save — público para anónimos ────────────────────────────────────

    @Test
    @DisplayName("POST /api/cart/abandoned sin auth → 200 (soporta anónimos)")
    void save_anonymous_returns200() throws Exception {
        var payload = Map.of(
            "sessionId", "new-anon-session-xyz",
            "items", List.of(Map.of(
                "productoId", 1,
                "cantidad",   1,
                "precio",     5000,
                "nombre",     "Test",
                "imagenUrl",  ""
            ))
        );
        mockMvc.perform(post("/api/cart/abandoned")
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(payload)))
            .andExpect(status().isOk());
    }
}
