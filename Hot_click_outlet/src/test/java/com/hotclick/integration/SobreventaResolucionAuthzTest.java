package com.hotclick.integration;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Seguimiento MED-2: salir de REVISION_SOBREVENTA es solo de ADMIN; cualquier otro rol recibe 403. */
@DisplayName("Sobreventa — resolver la revisión solo ADMIN")
class SobreventaResolucionAuthzTest extends BaseIntegrationTest {

    private static final String RUTA = "/api/admin/sobreventa/pedidos/999999/resolver";
    private static final String BODY = "{\"accion\":\"CANCELAR\",\"motivo\":\"sin stock\"}";

    private void esperar(String token, int status) throws Exception {
        mockMvc.perform(post(RUTA).header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().is(status));
    }

    private String tokenDeRol(String rol, int nivel) {
        Rol r = obtenerOCrearRol(rol, nivel);
        Usuario u = crearUsuario(rol.toLowerCase() + "-sobreventa@test.cr", "Rol " + rol, r);
        return tokenPara(u, rol);
    }

    @Test
    @DisplayName("usuario final → 403")
    void usuarioFinal_403() throws Exception { esperar(userToken, 403); }

    @Test
    @DisplayName("emprendedor → 403")
    void emprendedor_403() throws Exception { esperar(tokenDeRol(Constants.ROL_EMPRENDEDOR, 5), 403); }

    @Test
    @DisplayName("staff FINANCE (global.metrics) → 403: no basta con ver pagos")
    void finance_403() throws Exception { esperar(tokenDeRol(Constants.ROL_FINANCE, 2), 403); }

    @Test
    @DisplayName("ADMIN pasa la autorización (pedido inexistente → 404)")
    void admin_pasaAutorizacion() throws Exception { esperar(adminToken, 404); }
}
