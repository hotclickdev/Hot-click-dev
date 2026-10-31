package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@DisplayName("[MEDIO] CAJERO como rol de equipo asignable: solo PROPIETARIO/ADMIN lo asignan y solo opera el POS")
class CajeroRolEquipoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    private Empresa empA, empB;
    private Usuario editorA, miembroB, adminA2, duenoA, adminA, lectorA;
    private String tDuenoA, tAdminA, tEditorA, tLectorA, tCajeroA;

    @BeforeEach
    void setUp() {
        empA = empresa("cre-a");
        empB = empresa("cre-b");
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        duenoA = miembro("cre-dueno@test.cr", "PROPIETARIO", rolEmp, empA);
        tDuenoA = token(duenoA, empA);
        adminA = miembro("cre-admin@test.cr", "ADMIN", rolEmp, empA);
        tAdminA = token(adminA, empA);
        editorA = miembro("cre-editor@test.cr", "EDITOR", rolEmp, empA);
        tEditorA = token(editorA, empA);
        lectorA = miembro("cre-lector@test.cr", "LECTOR", rolEmp, empA);
        tLectorA = token(lectorA, empA);
        tCajeroA = token(miembro("cre-cajero@test.cr", "CAJERO", rolEmp, empA), empA);
        adminA2 = miembro("cre-admin2@test.cr", "ADMIN", rolEmp, empA);
        miembro("cre-dueno-b@test.cr", "PROPIETARIO", rolEmp, empB);
        miembroB = miembro("cre-editor-b@test.cr", "EDITOR", rolEmp, empB);
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

    private Usuario miembro(String correo, String rolEquipo, Rol rol, Empresa emp) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return u;
    }

    private String token(Usuario u, Empresa emp) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private int st(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse().getStatus();
    }

    private static MockHttpServletRequestBuilder aCajero(Long id) {
        return put("/api/empresa/equipo/" + id + "/rol").contentType(MediaType.APPLICATION_JSON)
            .content("{\"rolEnEmpresa\":\"CAJERO\"}");
    }

    private static MockHttpServletRequestBuilder invitarCajero(String correo) {
        return post("/api/empresa/equipo").contentType(MediaType.APPLICATION_JSON).content(
            "{\"nombre\":\"Caja\",\"correo\":\"" + correo + "\",\"password\":\"Temporal123!\",\"rolEnEmpresa\":\"CAJERO\"}");
    }

    private String rol(Usuario u, Empresa e) {
        return miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), e.getId()).orElseThrow().getRolEnEmpresa();
    }

    @Test
    void propietarioYAdminAsignanCajero() throws Exception {
        assertThat(st(aCajero(editorA.getId()), tDuenoA)).isEqualTo(200);
        assertThat(rol(editorA, empA)).isEqualTo("CAJERO");
        assertThat(st(invitarCajero("cre-nuevo1@test.cr"), tDuenoA)).isNotEqualTo(403);
        assertThat(st(invitarCajero("cre-nuevo2@test.cr"), tAdminA)).isNotEqualTo(403);
    }

    @Test
    void editorLectorYCajeroReciben403AlAsignar() throws Exception {
        for (String t : List.of(tEditorA, tLectorA, tCajeroA)) {
            assertThat(st(aCajero(editorA.getId()), t)).isEqualTo(403);
            assertThat(st(invitarCajero("cre-x@test.cr"), t)).isEqualTo(403);
        }
        assertThat(rol(editorA, empA)).isEqualTo("EDITOR");
    }

    @Test
    void lowAdminDeEquipoNoConvierteMiembrosExistentesNiSeAutoasigna() throws Exception {
        assertThat(st(aCajero(editorA.getId()), tAdminA)).isEqualTo(403);
        assertThat(st(aCajero(lectorA.getId()), tAdminA)).isEqualTo(403);
        assertThat(st(aCajero(adminA.getId()), tAdminA)).isEqualTo(403);
        assertThat(rol(editorA, empA)).isEqualTo("EDITOR");
        assertThat(rol(lectorA, empA)).isEqualTo("LECTOR");
        assertThat(rol(adminA, empA)).isEqualTo("ADMIN");
        // el propietario tampoco se pasa a sí mismo a CAJERO
        assertThat(st(aCajero(duenoA.getId()), tDuenoA)).isEqualTo(403);
        assertThat(rol(duenoA, empA)).isEqualTo("PROPIETARIO");
        // el propietario sí convierte a un LECTOR existente
        assertThat(st(aCajero(lectorA.getId()), tDuenoA)).isEqualTo(200);
    }

    @Test
    void lowCajeroLeeBusquedaDeClientesPeroNoCreaNiListaClientes() throws Exception {
        assertThat(st(get("/api/crm/clientes/buscar").param("q", "ana"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(post("/api/crm/clientes").contentType(MediaType.APPLICATION_JSON).content("{}"), tCajeroA))
            .isEqualTo(403);
        assertThat(st(get("/api/crm/clientes/1"), tCajeroA)).isEqualTo(403);
    }

    @Test
    void adminDeEquipoNoDegradaAOtroAdmin() throws Exception {
        assertThat(st(aCajero(adminA2.getId()), tAdminA)).isEqualTo(403);
        assertThat(rol(adminA2, empA)).isEqualTo("ADMIN");
    }

    @Test
    void cajeroRecibe403FueraDelPos() throws Exception {
        for (String ruta : List.of("/api/pedidos", "/api/crm/clientes", "/api/empresa/equipo", "/api/gastos",
                "/api/cupones", "/api/facturas", "/api/empresa/perfil")) {
            assertThat(st(get(ruta), tCajeroA)).as(ruta).isEqualTo(403);
        }
        assertThat(st(post("/api/bodegas").contentType(MediaType.APPLICATION_JSON).content("{}"), tCajeroA)).isEqualTo(403);
        assertThat(st(get("/api/pos/caja/activo"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(get("/api/pos/historial"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(get("/api/productos/pos/categorias"), tCajeroA)).isNotEqualTo(403);
        assertThat(st(get("/api/pedidos"), tEditorA)).isNotEqualTo(403);
    }

    @Test
    void crossTenant() throws Exception {
        // ADMIN de A no toca a un miembro de B.
        assertThat(st(aCajero(miembroB.getId()), tAdminA)).isIn(403, 404);
        assertThat(rol(miembroB, empB)).isEqualTo("EDITOR");
        // CAJERO de A pidiendo datos de B fuera del POS: 403.
        assertThat(st(get("/api/pedidos").param("empresaId", String.valueOf(empB.getId())), tCajeroA)).isEqualTo(403);
    }
}
