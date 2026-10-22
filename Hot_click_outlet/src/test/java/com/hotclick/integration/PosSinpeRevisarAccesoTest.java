package com.hotclick.integration;

import com.hotclick.controller.AdminPosSinpeController;
import com.hotclick.model.Empresa;
import com.hotclick.model.PosSinpeConfirmacion;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PosSinpeConfirmacionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** pos.sinpe.revisar: ADMIN y EMPRENDEDOR, cada uno solo su empresa; cajero/vendedor → 403. */
@DisplayName("[SEG] Revisión SINPE POS: acceso por rol y aislamiento por empresa")
class PosSinpeRevisarAccesoTest extends BaseIntegrationTest {

    private static final String RUTA = AdminPosSinpeController.RUTA;

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PosSinpeConfirmacionRepository confirmacionRepository;

    private Empresa propia;
    private Empresa otra;
    private int seq;

    @BeforeEach
    void setUp() {
        propia = empresa("propia");
        otra = empresa("otra");
        confirmacionRepository.saveAndFlush(new PosSinpeConfirmacion(propia.getId(), System.nanoTime(), null,
            "REFP" + System.nanoTime(), 1, 1L, 2L));
        confirmacionRepository.saveAndFlush(new PosSinpeConfirmacion(otra.getId(), System.nanoTime() + 1, null,
            "REFO" + System.nanoTime(), 1, 1L, 2L));
    }

    private Empresa empresa(String n) {
        Empresa e = new Empresa();
        String slug = n + "-rev-" + System.nanoTime();
        e.setNombreEmpresa(n); e.setSlug(slug); e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        return empresaRepository.saveAndFlush(e);
    }

    private String token(String rolNombre, Empresa e) {
        Rol rol = obtenerOCrearRol(rolNombre, 5);
        Usuario u = crearUsuario(rolNombre.toLowerCase() + "-rev-" + (seq++) + "-" + System.nanoTime() + "@test.cr",
            rolNombre, rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), rolNombre, e.getId(), e.getSlug());
    }

    @Test
    @DisplayName("EMPRENDEDOR ve solo las de su empresa")
    void emprendedorPropia() throws Exception {
        String t = token(Constants.ROL_EMPRENDEDOR, propia);
        mockMvc.perform(get(RUTA).header("Authorization", t))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1))
            .andExpect(jsonPath("$.data.items[0].empresaId").value(propia.getId()));
        mockMvc.perform(get(RUTA).param("empresaId", propia.getId().toString()).header("Authorization", t))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.total").value(1));
    }

    @Test
    @DisplayName("EMPRENDEDOR pidiendo otra empresa → 403")
    void emprendedorOtra403() throws Exception {
        mockMvc.perform(get(RUTA).param("empresaId", otra.getId().toString())
                .header("Authorization", token(Constants.ROL_EMPRENDEDOR, propia)))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("ADMIN accede a su empresa")
    void adminPropia() throws Exception {
        mockMvc.perform(get(RUTA).param("empresaId", propia.getId().toString())
                .header("Authorization", token(Constants.ROL_ADMIN, propia)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.total").value(1))
            .andExpect(jsonPath("$.data.items[0].empresaId").value(propia.getId()));
    }

    @Test
    @DisplayName("Cajero y vendedor (aunque tengan el permiso) → 403")
    void cajeroVendedor403() throws Exception {
        for (String rol : new String[]{"CAJERO", "VENDEDOR"}) {
            String t = token(rol, propia);
            jdbcTemplate.update("INSERT INTO hot_click_rol_permiso_tb (fk_id_rol, fk_id_permiso) "
                + "SELECT r.id_rol, p.id_permiso FROM hot_click_rol_tb r, hot_click_permiso_tb p "
                + "WHERE r.nombre_rol = ? AND p.nombre_permiso = ? AND NOT EXISTS (SELECT 1 FROM hot_click_rol_permiso_tb x "
                + "WHERE x.fk_id_rol = r.id_rol AND x.fk_id_permiso = p.id_permiso)", rol, AdminPosSinpeController.PERMISO);
            mockMvc.perform(get(RUTA).header("Authorization", t)).andExpect(status().isForbidden());
            mockMvc.perform(get(RUTA).param("empresaId", propia.getId().toString()).header("Authorization", t))
                .andExpect(status().isForbidden());
        }
    }

    @Test
    @DisplayName("V186 asigna pos.sinpe.revisar a ADMIN y EMPRENDEDOR, a nadie más")
    void permisoSoloAdminYEmprendedor() {
        Assertions.assertEquals(java.util.List.of(), jdbcTemplate.queryForList(
            "SELECT r.nombre_rol FROM hot_click_rol_permiso_tb rp JOIN hot_click_rol_tb r ON r.id_rol = rp.fk_id_rol "
          + "JOIN hot_click_permiso_tb p ON p.id_permiso = rp.fk_id_permiso WHERE p.nombre_permiso = ? "
          + "AND r.nombre_rol NOT IN ('ADMIN','EMPRENDEDOR','CAJERO','VENDEDOR')", String.class,
            AdminPosSinpeController.PERMISO));
    }
}
