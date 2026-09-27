package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Revisar pagos SINPE es solo de plataforma: el dinero entra a la cuenta de HotClick y una compra
 * puede traer paquetes de varios negocios. Un vendedor no confirma, rechaza ni lista comprobantes.
 */
@DisplayName("SINPE — confirmar, rechazar y listar comprobantes solo plataforma")
class SinpeRevisionAuthorizationTest extends BaseIntegrationTest {

    private static final long ID_INEXISTENTE = 999_999L;

    @Autowired private EmpresaRepository empresaRepository;

    private String tokenEmp;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Sinpe Revision Test");
        empresa.setSlug("sinpe-revision-test");
        empresa.setCorreoEmpresa("sinpe-revision@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);
        Usuario emprendedor = crearUsuario("empr-sinpe@test.cr", "Empr Sinpe", rolEmp);
        emprendedor.setEmpresa(empresa);
        emprendedor = usuarioRepository.saveAndFlush(emprendedor);
        tokenEmp = tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void tearDown() {
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Vendedor no confirma un pago SINPE → 403")
    void emprendedor_noConfirmaPagoSinpe() throws Exception {
        mockMvc.perform(post("/api/admin/pagos/" + ID_INEXISTENTE + "/confirmar-sinpe").header("Authorization", tokenEmp))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Vendedor no rechaza un pago SINPE → 403")
    void emprendedor_noRechazaPagoSinpe() throws Exception {
        mockMvc.perform(post("/api/admin/pagos/" + ID_INEXISTENTE + "/rechazar-sinpe").header("Authorization", tokenEmp))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Vendedor no aprueba ni rechaza comprobantes → 403")
    void emprendedor_noResuelveComprobantes() throws Exception {
        mockMvc.perform(post("/api/sinpe/admin/comprobantes/" + ID_INEXISTENTE + "/aprobar").header("Authorization", tokenEmp))
            .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/sinpe/admin/comprobantes/" + ID_INEXISTENTE + "/rechazar").header("Authorization", tokenEmp))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Vendedor no lista comprobantes de toda la plataforma → 403")
    void emprendedor_noListaComprobantes() throws Exception {
        mockMvc.perform(get("/api/sinpe/admin/comprobantes").header("Authorization", tokenEmp))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Vendedor sigue viendo la lista de pagos de su negocio")
    void emprendedor_sigueListandoSusPagos() throws Exception {
        mockMvc.perform(get("/api/admin/pagos").header("Authorization", tokenEmp))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Admin de plataforma lista comprobantes")
    void admin_listaComprobantes() throws Exception {
        mockMvc.perform(get("/api/sinpe/admin/comprobantes").header("Authorization", adminToken))
            .andExpect(status().isOk());
    }
}
