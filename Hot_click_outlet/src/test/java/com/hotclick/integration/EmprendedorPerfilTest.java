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
 * NIVEL: LEVE — 20 tests
 *
 * Verifica el perfil de empresa, dashboard KPIs y edge cases del rol EMPRENDEDOR:
 * - Leer y actualizar perfil propio
 * - Campos individuales (color, whatsapp, descripción)
 * - Dashboard accesible y filtrado
 * - Edge cases: body vacío, campos nulos, valores extremos
 */
@DisplayName("[LEVE] Perfil de Empresa y Edge Cases (EmprendedorPerfil)")
class EmprendedorPerfilTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;

    private Empresa empresa;
    private Usuario emprendedor;
    private Usuario adminCliente;
    private String  tokenEmp;
    private String  tokenAdminCliente;

    @BeforeEach
    void setUp() {
        Rol rolEmp   = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR,  5);
        Rol rolAdmin = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 3);

        empresa      = crearEmpresa("Perfil Empresa Test", "perfil-empresa-test", "perfil@test.cr");
        emprendedor  = crearConEmpresa("empr-pf@test.cr",  "Empr Pf",  rolEmp,   empresa);
        adminCliente = crearConEmpresa("admin-pf@test.cr", "Admin Pf", rolAdmin, empresa);

        tokenEmp         = "Bearer " + jwtUtil.generateToken(emprendedor.getCorreo(),  emprendedor.getId(),  Constants.ROL_EMPRENDEDOR);
        tokenAdminCliente = "Bearer " + jwtUtil.generateToken(adminCliente.getCorreo(), adminCliente.getId(), Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void tearDown() {
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── T-PF-001: Emprendedor puede leer su perfil → 200 ─────────────────────
    @Test
    @DisplayName("T-PF-001 | LEVE — Emprendedor puede leer su perfil de empresa → 200")
    void emprendedor_getPerfil_200() throws Exception {
        mockMvc.perform(get("/api/empresa/perfil")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.nombreEmpresa").value("Perfil Empresa Test"));
    }

    // ── T-PF-002: ADMIN_CLIENTE puede leer perfil de empresa → 200 ───────────
    @Test
    @DisplayName("T-PF-002 | LEVE — ADMIN_CLIENTE puede leer perfil de empresa → 200")
    void adminCliente_getPerfil_200() throws Exception {
        mockMvc.perform(get("/api/empresa/perfil")
                .header("Authorization", tokenAdminCliente))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.slug").value("perfil-empresa-test"));
    }

    // ── T-PF-003: USUARIO_FINAL no puede leer perfil → 403 ───────────────────
    @Test
    @DisplayName("T-PF-003 | LEVE — USUARIO_FINAL no puede leer perfil de empresa → 403")
    void usuarioFinal_getPerfil_403() throws Exception {
        mockMvc.perform(get("/api/empresa/perfil")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── T-PF-004: Sin token al leer perfil → 401 ─────────────────────────────
    @Test
    @DisplayName("T-PF-004 | LEVE — Sin token al leer perfil → 401")
    void noToken_getPerfil_401() throws Exception {
        mockMvc.perform(get("/api/empresa/perfil"))
            .andExpect(status().isUnauthorized());
    }

    // ── T-PF-005: Emprendedor actualiza nombreComercial → 200 ────────────────
    @Test
    @DisplayName("T-PF-005 | LEVE — Emprendedor actualiza nombreComercial → 200")
    void emprendedor_updateNombreComercial_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreComercial\":\"Marca Comercial Test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombreComercial").value("Marca Comercial Test"));
    }

    // ── T-PF-006: Emprendedor actualiza descripción → 200 ────────────────────
    @Test
    @DisplayName("T-PF-006 | LEVE — Emprendedor actualiza descripción de empresa → 200")
    void emprendedor_updateDescripcion_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"descripcion\":\"Somos una empresa de prueba\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.descripcion").value("Somos una empresa de prueba"));
    }

    // ── T-PF-007: Emprendedor actualiza colorPrimario → 200 ──────────────────
    @Test
    @DisplayName("T-PF-007 | LEVE — Emprendedor actualiza colorPrimario → 200")
    void emprendedor_updateColorPrimario_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"colorPrimario\":\"#FF0000\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.colorPrimario").value("#FF0000"));
    }

    // ── T-PF-008: Emprendedor actualiza numeroWhatsapp → 200 ─────────────────
    @Test
    @DisplayName("T-PF-008 | LEVE — Emprendedor actualiza numeroWhatsapp → 200")
    void emprendedor_updateWhatsapp_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroWhatsapp\":\"50688001122\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroWhatsapp").value("50688001122"));
    }

    // ── T-PF-009: ADMIN_CLIENTE no puede actualizar perfil → 403 ─────────────
    // El rol ADMIN_CLIENTE fue eliminado en V89 (migrado a EMPRENDEDOR), que sí
    // puede actualizar el perfil — la premisa del test ya no existe.
    @org.junit.jupiter.api.Disabled("Rol ADMIN_CLIENTE eliminado en V89 — premisa obsoleta")
    @Test
    @DisplayName("T-PF-009 | LEVE — ADMIN_CLIENTE no puede actualizar perfil de empresa → 403")
    void adminCliente_cannotUpdatePerfil_403() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenAdminCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"descripcion\":\"Hack\"}"))
            .andExpect(status().isForbidden());
    }

    // ── T-PF-010: Update con body vacío → 200 (no modifica nada) ─────────────
    @Test
    @DisplayName("T-PF-010 | LEVE — Update con body vacío {} → 200 sin cambios")
    void updatePerfil_emptyBody_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombreEmpresa").value("Perfil Empresa Test"));
    }

    // ── T-PF-011: Emprendedor accede a dashboard → 200 ───────────────────────
    @Test
    @DisplayName("T-PF-011 | LEVE — Emprendedor puede acceder al dashboard KPIs → 200")
    void emprendedor_getDashboard_200() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    // ── T-PF-012: ADMIN_CLIENTE accede a dashboard → 200 ────────────────────
    @Test
    @DisplayName("T-PF-012 | LEVE — ADMIN_CLIENTE puede acceder al dashboard → 200")
    void adminCliente_getDashboard_200() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                .header("Authorization", tokenAdminCliente))
            .andExpect(status().isOk());
    }

    // ── T-PF-013: USUARIO_FINAL no puede acceder a dashboard → 403 ───────────
    @Test
    @DisplayName("T-PF-013 | LEVE — USUARIO_FINAL no puede acceder a dashboard admin → 403")
    void usuarioFinal_cannotAccessDashboard_403() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── T-PF-014: ADMIN_IT accede a dashboard global → 200 ───────────────────
    @Test
    @DisplayName("T-PF-014 | LEVE — ADMIN_IT accede al dashboard global → 200")
    void adminIT_getDashboard_200() throws Exception {
        mockMvc.perform(get("/api/admin/dashboard")
                .header("Authorization", adminToken))
            .andExpect(status().isOk());
    }

    // ── T-PF-015: Perfil devuelve slug correcto ───────────────────────────────
    @Test
    @DisplayName("T-PF-015 | LEVE — Perfil devuelve el slug de la empresa correctamente")
    void getPerfil_returnSlug() throws Exception {
        mockMvc.perform(get("/api/empresa/perfil")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.slug").value("perfil-empresa-test"));
    }

    // ── T-PF-016: Múltiples campos actualizados en una sola llamada → 200 ─────
    @Test
    @DisplayName("T-PF-016 | LEVE — Actualizar múltiples campos en una llamada → 200")
    void updatePerfil_multipleFields_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreComercial\":\"Multi Update\",\"colorPrimario\":\"#00FF00\","
                    + "\"numeroWhatsapp\":\"50699887766\",\"descripcion\":\"Multi test\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombreComercial").value("Multi Update"))
            .andExpect(jsonPath("$.data.colorPrimario").value("#00FF00"))
            .andExpect(jsonPath("$.data.numeroWhatsapp").value("50699887766"));
    }

    // ── T-PF-017: Update persiste y se refleja en el GET siguiente ────────────
    @Test
    @DisplayName("T-PF-017 | LEVE — Cambio en perfil persiste y es visible al releer")
    void updatePerfil_persistsOnReread() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"descripcion\":\"Descripcion persistida\"}"))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/empresa/perfil")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.descripcion").value("Descripcion persistida"));
    }

    // ── T-PF-018: telefonoEmpresa actualizable → 200 ─────────────────────────
    @Test
    @DisplayName("T-PF-018 | LEVE — Emprendedor actualiza telefonoEmpresa → 200")
    void emprendedor_updateTelefono_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"telefonoEmpresa\":\"22334455\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.telefonoEmpresa").value("22334455"));
    }

    // ── T-PF-019: Sin token en update de perfil → 401 ────────────────────────
    @Test
    @DisplayName("T-PF-019 | LEVE — Sin token al actualizar perfil → 401")
    void noToken_updatePerfil_401() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"descripcion\":\"ghost\"}"))
            .andExpect(status().isUnauthorized());
    }

    // ── T-PF-020: colorSecundario actualizable → 200 ─────────────────────────
    @Test
    @DisplayName("T-PF-020 | LEVE — Emprendedor actualiza colorSecundario → 200")
    void emprendedor_updateColorSecundario_200() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"colorSecundario\":\"#1A1A2E\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.colorSecundario").value("#1A1A2E"));
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
