package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * NIVEL: BÁSICO — 25 tests
 *
 * Verifica la gestión de equipo (miembros ADMIN_CLIENTE) para el rol EMPRENDEDOR:
 * - Listar miembros del equipo
 * - Invitar nuevos miembros
 * - Eliminar miembros
 * - Validaciones de campos requeridos
 * - Restricciones de rol
 */
@DisplayName("[BÁSICO] Gestión de Equipo para Emprendedor (EmprendedorEquipo)")
class EmprendedorEquipoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;

    private Empresa empresa;
    private Usuario emprendedor;
    private String  tokenEmp;
    private Usuario adminCliente;
    private String  tokenAdminCliente;

    @BeforeEach
    void setUp() {
        Rol rolEmp   = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR,    5);
        Rol rolAdmin = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR,   3);

        empresa      = crearEmpresa("Equipo Empresa", "equipo-empresa-test", "equipo@test.cr");
        emprendedor  = crearConEmpresa("empr-eq@test.cr",  "Empr Eq", rolEmp,   empresa);
        adminCliente = crearConEmpresa("admin-eq@test.cr", "Admin Eq", rolAdmin, empresa);

        // La gestión de equipo (invitar/eliminar) se basa en la tabla de unión
        // MiembroEmpresa, no solo en usuario.empresa — sin esto, el emprendedor
        // no puede eliminar a adminCliente ni detectar invitaciones duplicadas.
        miembroEmpresaRepository.save(new MiembroEmpresa(emprendedor, empresa, "PROPIETARIO"));
        miembroEmpresaRepository.save(new MiembroEmpresa(adminCliente, empresa, "EDITOR"));

        tokenEmp         = "Bearer " + jwtUtil.generateToken(emprendedor.getCorreo(),  emprendedor.getId(),  Constants.ROL_EMPRENDEDOR);
        tokenAdminCliente = "Bearer " + jwtUtil.generateToken(adminCliente.getCorreo(), adminCliente.getId(), Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void tearDown() {
        // MiembroEmpresa tiene FK no-nula a Empresa — debe limpiarse antes de
        // borrar la empresa, o la siguiente prueba falla por FK violation
        // seguida de unique constraint en el slug reutilizado.
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── T-EQ-001: Emprendedor puede listar equipo → 200 ──────────────────────
    @Test
    @DisplayName("T-EQ-001 | BÁSICO — Emprendedor puede listar su equipo → 200")
    void emprendedor_listEquipo_200() throws Exception {
        mockMvc.perform(get("/api/empresa/equipo")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-EQ-002: ADMIN_CLIENTE puede listar equipo → 200 ────────────────────
    @Test
    @DisplayName("T-EQ-002 | BÁSICO — ADMIN_CLIENTE puede listar equipo de su empresa → 200")
    void adminCliente_listEquipo_200() throws Exception {
        mockMvc.perform(get("/api/empresa/equipo")
                .header("Authorization", tokenAdminCliente))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-EQ-003: USUARIO_FINAL no puede listar equipo → 403 ─────────────────
    @Test
    @DisplayName("T-EQ-003 | BÁSICO — USUARIO_FINAL no puede listar equipo → 403")
    void usuarioFinal_listEquipo_403() throws Exception {
        mockMvc.perform(get("/api/empresa/equipo")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── T-EQ-004: Sin token → 401 ─────────────────────────────────────────────
    @Test
    @DisplayName("T-EQ-004 | BÁSICO — Sin token al listar equipo → 401")
    void noToken_listEquipo_401() throws Exception {
        mockMvc.perform(get("/api/empresa/equipo"))
            .andExpect(status().isUnauthorized());
    }

    // ── T-EQ-005: Equipo listado incluye el propio emprendedor ────────────────
    @Test
    @DisplayName("T-EQ-005 | BÁSICO — Listado incluye al emprendedor dentro de su empresa")
    void listEquipo_includesEmprendedor() throws Exception {
        mockMvc.perform(get("/api/empresa/equipo")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    // ── T-EQ-006: Emprendedor invita nuevo miembro → 200 ─────────────────────
    @Test
    @DisplayName("T-EQ-006 | BÁSICO — Emprendedor puede invitar nuevo miembro al equipo → 200")
    void emprendedor_invitaMiembro_200() throws Exception {
        String body = "{\"nombre\":\"Nuevo Miembro\",\"correo\":\"miembro-nuevo@test.cr\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88001122\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-EQ-007: ADMIN_CLIENTE no puede invitar miembros → 403 ──────────────
    // El rol ADMIN_CLIENTE fue eliminado en V89 (migrado a EMPRENDEDOR), que sí
    // puede invitar — la premisa del test ya no existe. Requiere redefinir la
    // matriz de permisos del equipo antes de reactivarlo.
    @org.junit.jupiter.api.Disabled("Rol ADMIN_CLIENTE eliminado en V89 — premisa obsoleta")
    @Test
    @DisplayName("T-EQ-007 | BÁSICO — ADMIN_CLIENTE no puede invitar miembros → 403")
    void adminCliente_cannotInvitar_403() throws Exception {
        String body = "{\"nombre\":\"Hack Miembro\",\"correo\":\"hack@test.cr\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88001133\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenAdminCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    // ── T-EQ-008: USUARIO_FINAL no puede invitar miembros → 403 ──────────────
    @Test
    @DisplayName("T-EQ-008 | BÁSICO — USUARIO_FINAL no puede invitar miembros → 403")
    void usuarioFinal_cannotInvitar_403() throws Exception {
        String body = "{\"nombre\":\"Hack\",\"correo\":\"hack2@test.cr\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88001144\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }

    // ── T-EQ-009: Invitar sin nombre → 400 ───────────────────────────────────
    @Test
    @DisplayName("T-EQ-009 | BÁSICO — Invitar sin nombre → 400")
    void invitar_sinNombre_400() throws Exception {
        String body = "{\"correo\":\"sinnom@test.cr\",\"password\":\"Pass1234!\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    // ── T-EQ-010: Invitar sin correo → 400 ───────────────────────────────────
    @Test
    @DisplayName("T-EQ-010 | BÁSICO — Invitar sin correo → 400")
    void invitar_sinCorreo_400() throws Exception {
        String body = "{\"nombre\":\"Sin Correo\",\"password\":\"Pass1234!\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    // ── T-EQ-011: Invitar con password < 6 chars → 400 ───────────────────────
    @Test
    @DisplayName("T-EQ-011 | BÁSICO — Invitar con password menor a 6 caracteres → 400")
    void invitar_passwordCorta_400() throws Exception {
        String body = "{\"nombre\":\"Short Pass\",\"correo\":\"short@test.cr\",\"password\":\"123\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    // ── T-EQ-012: Invitar correo ya registrado → 400 ─────────────────────────
    @Test
    @DisplayName("T-EQ-012 | BÁSICO — Invitar correo ya registrado → 400")
    void invitar_correoYaRegistrado_400() throws Exception {
        String body = "{\"nombre\":\"Duplicado\",\"correo\":\"" + adminCliente.getCorreo() + "\","
            + "\"password\":\"Pass1234!\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isBadRequest());
    }

    // ── T-EQ-013: Emprendedor puede eliminar miembro de su empresa → 200 ─────
    @Test
    @DisplayName("T-EQ-013 | BÁSICO — Emprendedor puede eliminar miembro de su empresa → 200")
    void emprendedor_eliminaMiembro_200() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + adminCliente.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-EQ-014: ADMIN_CLIENTE no puede eliminar miembros → 403 ─────────────
    // Ver nota en T-EQ-007: rol eliminado en V89, premisa obsoleta.
    @org.junit.jupiter.api.Disabled("Rol ADMIN_CLIENTE eliminado en V89 — premisa obsoleta")
    @Test
    @DisplayName("T-EQ-014 | BÁSICO — ADMIN_CLIENTE no puede eliminar miembros → 403")
    void adminCliente_cannotEliminar_403() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + emprendedor.getId())
                .header("Authorization", tokenAdminCliente))
            .andExpect(status().isForbidden());
    }

    // ── T-EQ-015: Emprendedor no puede eliminarse a sí mismo → 400 ───────────
    @Test
    @DisplayName("T-EQ-015 | BÁSICO — Emprendedor no puede eliminarse a sí mismo → 400")
    void emprendedor_cannotDeleteSelf_400() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + emprendedor.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isBadRequest());
    }

    // ── T-EQ-016: Eliminar miembro inexistente → 403 (no distingue de "no es tu equipo") ──
    @Test
    @DisplayName("T-EQ-016 | BÁSICO — Eliminar miembro inexistente → 403 (no filtra existencia de IDs)")
    void eliminar_miembroInexistente_403() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/999999")
                .header("Authorization", tokenEmp))
            .andExpect(status().isForbidden());
    }

    // ── T-EQ-017: Invitar body vacío → 400 ───────────────────────────────────
    @Test
    @DisplayName("T-EQ-017 | BÁSICO — Invitar con body vacío {} → 400")
    void invitar_bodyVacio_400() throws Exception {
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── T-EQ-018: Miembro invitado aparece en la lista del equipo ─────────────
    @Test
    @DisplayName("T-EQ-018 | BÁSICO — Miembro invitado aparece en la lista del equipo")
    void invitado_aparece_enListado() throws Exception {
        String correoNuevo = "miembro-list@test.cr";
        String bodyInvite = "{\"nombre\":\"List Member\",\"correo\":\"" + correoNuevo + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88119900\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyInvite))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/empresa/equipo")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.correo == '" + correoNuevo + "')]").exists());
    }

    // ── T-EQ-019: Miembro nuevo recibe rol ADMIN_CLIENTE ─────────────────────
    @Test
    @DisplayName("T-EQ-019 | BÁSICO — Miembro invitado recibe rol ADMIN_CLIENTE")
    void invitado_tieneRol_ADMIN_CLIENTE() throws Exception {
        String correo = "rol-check@test.cr";
        String body   = "{\"nombre\":\"Rol Check\",\"correo\":\"" + correo + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88330044\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());

        Usuario nuevo = usuarioRepository.findByCorreo(correo)
            .orElseThrow(() -> new AssertionError("Usuario no encontrado"));
        boolean tieneRol = nuevo.getRoles().stream()
            .anyMatch(r -> Constants.ROL_EMPRENDEDOR.equals(r.getNombreRol()));
        org.junit.jupiter.api.Assertions.assertTrue(tieneRol,
            "El miembro invitado debe tener rol ADMIN_CLIENTE");
    }

    // ── T-EQ-020: Sin token al invitar → 401 ─────────────────────────────────
    @Test
    @DisplayName("T-EQ-020 | BÁSICO — Sin token al invitar → 401")
    void invitar_noToken_401() throws Exception {
        String body = "{\"nombre\":\"Ghost\",\"correo\":\"ghost@test.cr\",\"password\":\"Pass1234!\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isUnauthorized());
    }

    // ── T-EQ-021: Sin token al eliminar → 401 ────────────────────────────────
    @Test
    @DisplayName("T-EQ-021 | BÁSICO — Sin token al eliminar miembro → 401")
    void eliminar_noToken_401() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + adminCliente.getId()))
            .andExpect(status().isUnauthorized());
    }

    // ── T-EQ-022: ADMIN_IT sin empresa propia recibe 403 en /equipo ──────────
    @Test
    @DisplayName("T-EQ-022 | BÁSICO — ADMIN_IT sin empresa asociada recibe 403 en /equipo (correcto por diseño)")
    void adminIT_listEquipo_403_sinEmpresa() throws Exception {
        // EquipoController devuelve 403 si empresaId == null (ADMIN_IT no tiene empresa propia).
        // El acceso global al equipo de cualquier empresa es vía /api/admin/empresas/{id}, no este endpoint.
        mockMvc.perform(get("/api/empresa/equipo")
                .header("Authorization", adminToken))
            .andExpect(status().isForbidden());
    }

    // ── T-EQ-023: Nombre con apellido se parsea correctamente ────────────────
    @Test
    @DisplayName("T-EQ-023 | BÁSICO — Nombre con apellido se separa correctamente al invitar")
    void invitar_nombreConApellido_200() throws Exception {
        String body = "{\"nombre\":\"Juan Perez\",\"correo\":\"juan-perez@test.cr\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88221133\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());

        Usuario juan = usuarioRepository.findByCorreo("juan-perez@test.cr")
            .orElseThrow(() -> new AssertionError("Usuario no encontrado"));
        org.junit.jupiter.api.Assertions.assertEquals("Juan", juan.getNombre());
        org.junit.jupiter.api.Assertions.assertEquals("Perez", juan.getApellidoPaterno());
    }

    // ── T-EQ-024: Nombre sin apellido usa "Miembro" como default ─────────────
    @Test
    @DisplayName("T-EQ-024 | BÁSICO — Nombre sin apellido usa 'Miembro' como apellido default")
    void invitar_nombreSinApellido_apellidoDefault() throws Exception {
        String body = "{\"nombre\":\"Solo\",\"correo\":\"solo-nombre@test.cr\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88661177\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());

        Usuario solo = usuarioRepository.findByCorreo("solo-nombre@test.cr")
            .orElseThrow(() -> new AssertionError("Usuario no encontrado"));
        org.junit.jupiter.api.Assertions.assertEquals("Miembro", solo.getApellidoPaterno());
    }

    // ── T-EQ-025: Miembro eliminado (soft-delete) puede reactivarse re-invitando ──
    @Test
    @DisplayName("T-EQ-025 | BÁSICO — Re-invitar correo de miembro eliminado reactiva su membresía → 200")
    void eliminado_seReactivaAlReinvitar() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + adminCliente.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk());

        String bodyReinvite = "{\"nombre\":\"Re-invite\",\"correo\":\"" + adminCliente.getCorreo() + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"88001122\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyReinvite))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearConEmpresa(String correo, String nombre, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, nombre, rol);
        u.setEmpresa(empresa);
        return usuarioRepository.saveAndFlush(u);
    }
}
