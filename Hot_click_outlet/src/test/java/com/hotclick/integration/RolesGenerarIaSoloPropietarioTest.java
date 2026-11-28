package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

/**
 * Seguridad #376 (MEDIO): EDITOR podía usar la ficha con IA (costo de IA del negocio). La ruta es del PROPIETARIO
 * del negocio o del ADMIN de plataforma; EDITOR y LECTOR (rol Spring EMPRENDEDOR) reciben 403 con el mensaje de
 * propietario. Antes esta prueba también cubría las gift cards (ya retiradas); se conserva la parte de generar-ia.
 */
@DisplayName("[MEDIO] generar-ia: solo PROPIETARIO o ADMIN")
class RolesGenerarIaSoloPropietarioTest extends BaseIntegrationTest {

    private static final String IA = "/api/admin/productos/generar-ia";

    @Autowired private EmpresaRepository empresaRepository;

    private String tokenDueno;
    private String tokenEditor;
    private String tokenLector;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("Roles IA");
        e.setSlug("roles-generar-ia");
        e.setCorreoEmpresa("roles-generar-ia@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        tokenDueno = tokenEmpresa(miembro("ia-dueno@test.cr", rolEmp, e, "PROPIETARIO"), e);
        tokenEditor = tokenEmpresa(miembro("ia-editor@test.cr", rolEmp, e, "EDITOR"), e);
        tokenLector = tokenEmpresa(miembro("ia-lector@test.cr", rolEmp, e, "LECTOR"), e);
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Usuario miembro(String correo, Rol rol, Empresa e, String rolEnEmpresa) {
        Usuario u = crearUsuario(correo, rolEnEmpresa, rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.save(new MiembroEmpresa(u, e, rolEnEmpresa));
        return u;
    }

    private String tokenEmpresa(Usuario u, Empresa e) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    private MvcResult generarIa(String token) throws Exception {
        var b = multipart(IA)
            .file(new MockMultipartFile("imagen", "p.png", "image/png", new byte[]{1, 2, 3}))
            .header("Authorization", token);
        return mockMvc.perform(b).andReturn();
    }

    @Test
    @DisplayName("EDITOR → 403 (propietario) en generar-ia")
    void editor403() throws Exception {
        var res = generarIa(tokenEditor).getResponse();
        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(res.getContentAsString()).contains(PropietarioGuard.MSG);
    }

    @Test
    @DisplayName("LECTOR → 403 en generar-ia")
    void lector403() throws Exception {
        var res = generarIa(tokenLector).getResponse();
        assertThat(res.getStatus()).isEqualTo(403);
        assertThat(res.getContentAsString()).containsAnyOf(PropietarioGuard.MSG, "Lector");
    }

    @Test
    @DisplayName("PROPIETARIO → no lo frena la guarda (generar-ia no responde 403 de propietario)")
    void propietarioPasa() throws Exception {
        var ia = generarIa(tokenDueno).getResponse();
        assertThat(ia.getContentAsString()).doesNotContain(PropietarioGuard.MSG);
        assertThat(ia.getStatus()).isNotEqualTo(401);
        assertThat(ia.getStatus()).as("la guarda no lo frena").isNotEqualTo(403);
    }

    @Test
    @DisplayName("ADMIN de plataforma pasa la guarda en generar-ia")
    void adminPasa() throws Exception {
        var res = generarIa(adminToken).getResponse();
        assertThat(res.getContentAsString()).doesNotContain(PropietarioGuard.MSG);
    }
}
