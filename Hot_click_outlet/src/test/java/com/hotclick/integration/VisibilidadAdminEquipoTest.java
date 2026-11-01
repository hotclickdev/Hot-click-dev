package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

@DisplayName("Visibilidad de la tienda: PROPIETARIO y ADMIN de equipo sí; EDITOR, LECTOR y CAJERO, 403")
class VisibilidadAdminEquipoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    private Empresa emp, otra;
    private Rol rolEmp;

    @BeforeEach
    void setUp() {
        emp = empresa("vae-a");
        otra = empresa("vae-b");
        rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    /** Miembro de {@code miembroDe}; el token apunta a {@code tokenDe}. */
    private String token(String rolEquipo, Empresa miembroDe, Empresa tokenDe) {
        Usuario u = crearUsuario("vae-" + rolEquipo.toLowerCase() + "-" + miembroDe.getSlug() + "-" + tokenDe.getSlug() + "@test.cr", rolEquipo, rolEmp);
        u.setEmpresa(miembroDe);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, miembroDe, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, tokenDe.getId(), tokenDe.getSlug());
    }

    private int cambiar(String token) throws Exception {
        return mockMvc.perform(put("/api/empresa/perfil/visibilidad").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"visibilidadPublica\":false}"))
            .andReturn().getResponse().getStatus();
    }

    @Test
    void adminDeEquipoCambiaVisibilidad() throws Exception {
        assertThat(cambiar(token("ADMIN", emp, emp))).isEqualTo(200);
    }

    @Test
    void propietarioSigueCambiandoVisibilidad() throws Exception {
        assertThat(cambiar(token("PROPIETARIO", emp, emp))).isEqualTo(200);
    }

    @Test
    void editorLectorYCajeroReciben403() throws Exception {
        for (String rol : new String[]{"EDITOR", "LECTOR", "CAJERO"}) {
            assertThat(cambiar(token(rol, emp, emp))).as(rol).isEqualTo(403);
        }
    }

    @Test
    void adminDeOtroNegocioNoCambiaLaVisibilidadAjena() throws Exception {
        assertThat(cambiar(token("ADMIN", otra, emp))).isEqualTo(403);
    }
}
