package com.hotclick.integration;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.service.ClerkTokenService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** P1-01: toma de cuenta vía /api/auth/clerk-sync. La identidad sale solo del token verificado. */
@DisplayName("[CRÍTICO] P1-01 clerk-sync: sin takeover por body ni re-vinculación")
class ClerkSyncTakeoverTest extends BaseIntegrationTest {

    @MockitoBean private ClerkTokenService clerkTokenService;

    private Usuario victima;

    @BeforeEach
    void setUp() {
        when(clerkTokenService.isConfigured()).thenReturn(true);
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        victima = crearUsuario("victima@test.cr", "Victima", rolUser);
        victima.setClerkUserId("user_victima");
        victima = usuarioRepository.saveAndFlush(victima);
    }

    private void token(String raw, String sub, String email, Object verificado) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", sub);
        if (email != null) claims.put("email", email);
        if (verificado != null) claims.put("email_verified", verificado);
        Jwt jwt = new Jwt(raw, Instant.now(), Instant.now().plusSeconds(60), Map.of("alg", "RS256"), claims);
        when(clerkTokenService.verify(eq(raw))).thenReturn(jwt);
    }

    private org.springframework.test.web.servlet.ResultActions sync(String raw, String body) throws Exception {
        return mockMvc.perform(post("/api/auth/clerk-sync").header("Authorization", "Bearer " + raw)
            .contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private void victimaIntacta() {
        Usuario v = usuarioRepository.findById(victima.getId()).orElseThrow();
        assertThat(v.getClerkUserId()).isEqualTo("user_victima");
        assertThat(v.getCorreo()).isEqualTo("victima@test.cr");
    }

    @Test
    @DisplayName("token sin email + body con correo de la víctima → 401, víctima intacta")
    void emailDelBodyIgnorado() throws Exception {
        token("t1", "user_atacante", null, null);
        sync("t1", "{\"email\":\"victima@test.cr\",\"nombre\":\"x\",\"declaraMayoriaEdad\":\"true\"}")
            .andExpect(status().isUnauthorized());
        victimaIntacta();
        assertThat(usuarioRepository.findByClerkUserId("user_atacante")).isEmpty();
    }

    @Test
    @DisplayName("body con clerkUserId de la víctima → se ignora (se usa el sub del token)")
    void clerkUserIdDelBodyIgnorado() throws Exception {
        token("t2", "user_atacante", "atacante@test.cr", true);
        sync("t2", "{\"clerkUserId\":\"user_victima\",\"email\":\"victima@test.cr\",\"declaraMayoriaEdad\":\"true\"}")
            .andExpect(status().isOk());
        victimaIntacta();
        Usuario creado = usuarioRepository.findByClerkUserId("user_atacante").orElseThrow();
        assertThat(creado.getCorreo()).isEqualTo("atacante@test.cr");
        assertThat(creado.getId()).isNotEqualTo(victima.getId());
    }

    @Test
    @DisplayName("correo de la víctima en el token pero sin verificar → 401")
    void emailNoVerificado() throws Exception {
        token("t3", "user_atacante", "victima@test.cr", false);
        sync("t3", "{}").andExpect(status().isUnauthorized());
        token("t3b", "user_atacante", "victima@test.cr", null);
        sync("t3b", "{}").andExpect(status().isUnauthorized());
        victimaIntacta();
    }

    @Test
    @DisplayName("cuenta existente ya vinculada a otro clerkUserId → 409, víctima intacta")
    void noReVincular() throws Exception {
        token("t4", "user_atacante", "victima@test.cr", true);
        sync("t4", "{}").andExpect(status().isConflict());
        victimaIntacta();
    }

    @Test
    @DisplayName("legítimo: primer sync vincula cuenta sin Clerk; repetir sync sigue funcionando")
    void primerYRepetido() throws Exception {
        Usuario sinClerk = crearUsuario("legit@test.cr", "Legit", obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        token("t5", "user_legit", "legit@test.cr", "true");
        sync("t5", "{}").andExpect(status().isOk()).andExpect(jsonPath("$.data.accessToken").exists());
        assertThat(usuarioRepository.findById(sinClerk.getId()).orElseThrow().getClerkUserId()).isEqualTo("user_legit");
        sync("t5", "{}").andExpect(status().isOk());
        token("t6", "user_victima", "victima@test.cr", true);
        sync("t6", "{}").andExpect(status().isOk());
        victimaIntacta();
    }
}
