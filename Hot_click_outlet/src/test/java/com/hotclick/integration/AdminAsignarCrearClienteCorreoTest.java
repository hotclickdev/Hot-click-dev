package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Re-auditoría área 2 (MED-5): «crear cliente» del vendedor guardaba el correo tal como lo escribió. Con mayúsculas
 * quedaba una cuenta que el login normalizado (trim + minúsculas) no encuentra, y el mismo correo en minúsculas
 * creaba otra cuenta distinta. Datos ficticios.
 */
@DisplayName("[MEDIO] AdminAsignar crear-cliente normaliza el correo")
class AdminAsignarCrearClienteCorreoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    private String tokenDueno;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("Asignar Correo");
        e.setSlug("asignar-correo");
        e.setCorreoEmpresa("asignar-correo@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        Usuario u = crearUsuario("ac-dueno@test.cr", "PROPIETARIO", rolEmp);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.save(new MiembroEmpresa(u, e, "PROPIETARIO"));
        tokenDueno = "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    @AfterEach
    void tearDown() {
        usuarioRepository.deleteAll(usuarioRepository.findAllByCorreoIgnoreCase("ac-cliente.mixto@test.cr"));
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private int crear(String correo) throws Exception {
        return mockMvc.perform(post("/api/admin/asignar/crear-cliente").header("Authorization", tokenDueno)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nombre\":\"Cliente Fict\",\"correo\":\"" + correo + "\"}")).andReturn().getResponse().getStatus();
    }

    @Test
    @DisplayName("Correo con mayúsculas y espacios se guarda en minúsculas; repetirlo en otra capitalización → 409")
    void correoNormalizado() throws Exception {
        assertThat(crear(" AC-Cliente.Mixto@Test.CR ")).isEqualTo(200);
        assertThat(usuarioRepository.findByCorreo("ac-cliente.mixto@test.cr")).as("cuenta con correo normalizado").isPresent();
        assertThat(usuarioRepository.findByCorreo(" AC-Cliente.Mixto@Test.CR ")).as("sin cuenta con mayúsculas").isEmpty();
        assertThat(crear("ac-cliente.mixto@test.cr")).as("mismo correo en minúsculas").isEqualTo(409);
        assertThat(crear("AC-CLIENTE.MIXTO@TEST.CR")).as("mismo correo en mayúsculas").isEqualTo(409);
        assertThat(usuarioRepository.findAllByCorreoIgnoreCase("ac-cliente.mixto@test.cr")).hasSize(1);
    }
}
