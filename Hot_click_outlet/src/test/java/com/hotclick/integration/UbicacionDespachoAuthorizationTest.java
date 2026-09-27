package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * GET /api/bodegas/ubicacion-despacho: cada negocio ve solo el estado de su
 * propia ubicación; sin negocio en el scope no se avisa.
 */
@DisplayName("BodegaController — ubicación de despacho del negocio")
class UbicacionDespachoAuthorizationTest extends BaseIntegrationTest {

    private static final String URL = "/api/bodegas/ubicacion-despacho";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Empresa empresa;
    private Usuario emprendedor;
    private String tokenEmp;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresa = crearEmpresa();
        emprendedor = crearUsuario("empr-ubic@test.cr", "Empr Ubic", rolEmp);
        emprendedor.setEmpresa(empresa);
        emprendedor = usuarioRepository.saveAndFlush(emprendedor);
        tokenEmp = tokenPara(emprendedor, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void tearDown() {
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Negocio sin bodega → tieneUbicacion false")
    void emprendedor_sinBodega_noTieneUbicacion() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tieneUbicacion").value(false))
            .andExpect(jsonPath("$.data.obligatoria").isBoolean());
    }

    @Test
    @DisplayName("Negocio con provincia, cantón y dirección → tieneUbicacion true")
    void emprendedor_conBodegaCompleta_tieneUbicacion() throws Exception {
        crearBodega("San José", "Santa Ana");

        mockMvc.perform(get(URL).header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tieneUbicacion").value(true));
    }

    @Test
    @DisplayName("Bodega sin provincia ni cantón no cuenta como ubicación")
    void emprendedor_bodegaIncompleta_noTieneUbicacion() throws Exception {
        crearBodega(null, null);

        mockMvc.perform(get(URL).header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tieneUbicacion").value(false));
    }

    @Test
    @DisplayName("Admin de plataforma sin negocio → no se le avisa")
    void admin_sinEmpresa_noAvisa() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.tieneUbicacion").value(true));
    }

    @Test
    @DisplayName("Sin token → 401")
    void sinToken_401() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
    }

    private Empresa crearEmpresa() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Ubicacion Test");
        e.setSlug("ubicacion-test");
        e.setCorreoEmpresa("ubicacion@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private void crearBodega(String provincia, String canton) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Ubicación");
        b.setDireccionExacta("100 m norte del parque");
        b.setTelefono("88887777");
        b.setProvincia(provincia);
        b.setCanton(canton);
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(17, 0));
        b.setAdminCliente(emprendedor);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        bodegaRepository.saveAndFlush(b);
    }
}
