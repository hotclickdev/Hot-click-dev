package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@DisplayName("CAJERO de equipo no crea, edita, borra ni importa bodegas; PROPIETARIO y EDITOR sí")
class CajeroSinBodegasTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    private Empresa emp;
    private String tokenCajero, tokenDueno, tokenEditor;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("csb"); e.setNombreComercial("csb"); e.setSlug("csb-a");
        e.setCorreoEmpresa("csb@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenCajero = miembro("csb-cajero@test.cr", "CAJERO", rolEmp);
        tokenDueno = miembro("csb-dueno@test.cr", "PROPIETARIO", rolEmp);
        tokenEditor = miembro("csb-editor@test.cr", "EDITOR", rolEmp);
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private String miembro(String correo, String rolEquipo, Rol rol) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /** Ids inexistentes y cuerpos mínimos: sin guarda dan 200/400/404, nunca 403 por rol. */
    private Map<String, MockHttpServletRequestBuilder> escrituras() {
        Map<String, MockHttpServletRequestBuilder> m = new LinkedHashMap<>();
        m.put("POST /api/bodegas", json(post("/api/bodegas"), "{\"nombre\":\"B1\"}"));
        m.put("PUT /api/bodegas/{id}", json(put("/api/bodegas/999999"), "{\"nombre\":\"B2\"}"));
        m.put("DELETE /api/bodegas/{id}", delete("/api/bodegas/999999"));
        m.put("POST /api/bodegas/bulk", json(post("/api/bodegas/bulk"), "[]"));
        return m;
    }

    private int st(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse().getStatus();
    }

    @Test
    void cajeroRecibe403EnCrearEditarBorrarYBulk() throws Exception {
        List<String> abiertos = new ArrayList<>();
        for (var e : escrituras().entrySet()) {
            int s = st(e.getValue(), tokenCajero);
            if (s != 403) abiertos.add(e.getKey() + " -> " + s);
        }
        assertThat(abiertos).as("escrituras de bodegas que el CAJERO todavía puede hacer").isEmpty();
    }

    @Test
    void propietarioYEditorSiguenEscribiendoBodegas() throws Exception {
        for (String t : new String[]{tokenDueno, tokenEditor}) {
            for (var e : escrituras().entrySet()) {
                assertThat(st(e.getValue(), t)).as(e.getKey()).isNotEqualTo(403);
            }
        }
    }
}
