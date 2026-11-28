package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@DisplayName("[MEDIO] rolEquipo aditivo: el token del cajero sigue EMPRENDEDOR y el POS no da 403")
class CajeroPosJwtEmprendedorTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    private Empresa emp;
    private Usuario cajero;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("cpj"); e.setNombreComercial("cpj"); e.setSlug("cpj");
        e.setCorreoEmpresa("cpj@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        cajero = crearUsuario("cpj-cajero@test.cr", "CAJERO", rolEmp);
        cajero.setEmpresa(emp);
        cajero = usuarioRepository.saveAndFlush(cajero);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(cajero, emp, "CAJERO"));
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    void cajeroConJwtEmprendedor_operaElPosSin403() throws Exception {
        String jwt = jwtUtil.generateToken(cajero.getCorreo(), cajero.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
        int st = mockMvc.perform(get("/api/pos/historial").header("Authorization", "Bearer " + jwt))
            .andReturn().getResponse().getStatus();
        assertThat(st).isNotEqualTo(403).isNotEqualTo(401);
        // y fuera del POS sigue acotado por el interceptor, no por el claim
        int fuera = mockMvc.perform(get("/api/gastos").header("Authorization", "Bearer " + jwt))
            .andReturn().getResponse().getStatus();
        assertThat(fuera).isEqualTo(403);
    }
}
