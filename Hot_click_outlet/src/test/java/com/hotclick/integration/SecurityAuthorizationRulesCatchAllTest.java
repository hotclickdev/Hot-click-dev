package com.hotclick.integration;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Golpea el filtro de seguridad real (no una copia del array esperado) contra
 * una ruta bajo /api/admin/** que ningún controller mapea. Sin @PreAuthorize
 * de por medio, el status distingue exactamente lo que decide el matcher
 * catch-all de SecurityAuthorizationRules: 403/401 = negado antes de llegar
 * al dispatcher, 404 = autorizado pero sin ruta (o sea, el rol pasó el filtro).
 */
@DisplayName("SecurityAuthorizationRules — catch-all /api/admin/** (filtro real)")
class SecurityAuthorizationRulesCatchAllTest extends BaseIntegrationTest {

    private static final String RUTA_PROBE = "/api/admin/__security_test_probe__";

    @Test
    @DisplayName("sin token: denegado")
    void sinToken_denegado() throws Exception {
        mockMvc.perform(get(RUTA_PROBE))
            .andExpect(status().is4xxClientError())
            .andExpect(result -> org.junit.jupiter.api.Assertions.assertNotEquals(
                404, result.getResponse().getStatus(), "debe ser 401/403, no 404 (no probaría el filtro)"));
    }

    @Test
    @DisplayName("USUARIO_FINAL: denegado por el catch-all")
    void usuarioFinal_denegado() throws Exception {
        mockMvc.perform(get(RUTA_PROBE).header("Authorization", userToken))
            .andExpect(status().is4xxClientError())
            .andExpect(result -> org.junit.jupiter.api.Assertions.assertNotEquals(
                404, result.getResponse().getStatus(), "USUARIO_FINAL no está en el catch-all, debe dar 403"));
    }

    @Test
    @DisplayName("ADMIN: pasa el catch-all (404 por ruta inexistente, no 403)")
    void admin_pasaElFiltro() throws Exception {
        mockMvc.perform(get(RUTA_PROBE).header("Authorization", adminToken))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("SUPPORT: pasa el catch-all")
    void support_pasaElFiltro() throws Exception {
        assertPasaElFiltro(Constants.ROL_SUPPORT, "supportstaff@hotclick.cr");
    }

    @Test
    @DisplayName("FINANCE: pasa el catch-all")
    void finance_pasaElFiltro() throws Exception {
        assertPasaElFiltro(Constants.ROL_FINANCE, "financestaff@hotclick.cr");
    }

    @Test
    @DisplayName("TRUST: pasa el catch-all")
    void trust_pasaElFiltro() throws Exception {
        assertPasaElFiltro(Constants.ROL_TRUST, "truststaff@hotclick.cr");
    }

    private void assertPasaElFiltro(String rolNombre, String correo) throws Exception {
        Rol rol = obtenerOCrearRol(rolNombre, 5);
        Usuario staff = crearUsuario(correo, "Staff " + rolNombre, rol);
        String token = tokenPara(staff, rolNombre);
        mockMvc.perform(get(RUTA_PROBE).header("Authorization", token))
            .andExpect(status().isNotFound());
    }
}
