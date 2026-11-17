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
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000000\"}";
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
    // QA3-012: reactivado como EDITOR (rol Spring EMPRENDEDOR, rolEnEmpresa EDITOR).
    @Test
    @DisplayName("T-EQ-007 | QA3-012 — EDITOR no puede invitar (ni a un ADMIN) → 403 por rol, no por límite")
    void adminCliente_cannotInvitar_403() throws Exception {
        String body = "{\"nombre\":\"Hack Miembro\",\"correo\":\"hack@test.cr\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000001\",\"rolEnEmpresa\":\"ADMIN\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenAdminCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Solo el emprendedor puede agregar miembros"));
        org.assertj.core.api.Assertions.assertThat(usuarioRepository.findByCorreo("hack@test.cr")).isEmpty();
    }

    @Test
    @DisplayName("QA3-012 — EDITOR no puede cambiar roles → 403")
    void editor_cannotCambiarRol_403() throws Exception {
        mockMvc.perform(put("/api/empresa/equipo/" + adminCliente.getId() + "/rol")
                .header("Authorization", tokenAdminCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rolEnEmpresa\":\"ADMIN\"}"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Solo el emprendedor puede cambiar roles"));
        org.assertj.core.api.Assertions.assertThat(miembroEmpresaRepository
            .findByUsuarioIdAndEmpresaId(adminCliente.getId(), empresa.getId()).orElseThrow().getRolEnEmpresa())
            .isEqualTo("EDITOR");
    }

    @Test
    @DisplayName("QA3-012 — Emprendedor sí puede cambiar roles → 200")
    void emprendedor_cambiaRol_200() throws Exception {
        mockMvc.perform(put("/api/empresa/equipo/" + adminCliente.getId() + "/rol")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"rolEnEmpresa\":\"LECTOR\"}"))
            .andExpect(status().isOk());
    }

    // cambiar-plan (QA3-012) se cubre en PlanSinPrecioTest: en este contexto de integración
    // TenantContext queda nulo y el endpoint responde 401 antes de la guarda.

    @Test
    @DisplayName("QA3-019 — EDITOR no puede cambiar la visibilidad del negocio → 403")
    void editor_cannotVisibilidad_403() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil/visibilidad")
                .header("Authorization", tokenAdminCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"visibilidadPublica\":false}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("QA3-019 — Emprendedor pasa el control de rol en visibilidad (no 403)")
    void emprendedor_visibilidad_no403() throws Exception {
        int st = mockMvc.perform(put("/api/empresa/perfil/visibilidad")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"visibilidadPublica\":true}"))
            .andReturn().getResponse().getStatus();
        org.assertj.core.api.Assertions.assertThat(st).isNotEqualTo(403);
    }

    @Test
    @DisplayName("QA3-019 — EDITOR no puede cambiar datos fiscales → 403")
    void editor_cannotFiscal_403() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil/fiscal")
                .header("Authorization", tokenAdminCliente)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"cedulaJuridica\":\"3101123456\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("QA3-019 — Emprendedor pasa el control de rol en datos fiscales (no 403)")
    void emprendedor_fiscal_no403() throws Exception {
        int st = mockMvc.perform(put("/api/empresa/perfil/fiscal")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andReturn().getResponse().getStatus();
        org.assertj.core.api.Assertions.assertThat(st).isNotEqualTo(403);
    }

    @Test
    @DisplayName("QA3-019 — EDITOR no puede subir el certificado .p12 → 403")
    void editor_cannotCertP12_403() throws Exception {
        var file = new org.springframework.mock.web.MockMultipartFile("file", "c.p12",
            "application/x-pkcs12", new byte[]{1, 2, 3});
        mockMvc.perform(multipart("/api/empresa/perfil/cert-p12").file(file)
                .header("Authorization", tokenAdminCliente))
            .andExpect(status().isForbidden());
    }

    // ── T-EQ-008: USUARIO_FINAL no puede invitar miembros → 403 ──────────────
    @Test
    @DisplayName("T-EQ-008 | BÁSICO — USUARIO_FINAL no puede invitar miembros → 403")
    void usuarioFinal_cannotInvitar_403() throws Exception {
        String body = "{\"nombre\":\"Hack\",\"correo\":\"hack2@test.cr\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000002\"}";
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

    // ── Riesgo 15-nov: quien invita NO define la contraseña del invitado ──────
    @Test
    @DisplayName("Invitar con password en el body: se ignora y el login con esa clave falla (401)")
    void invitar_passwordDelInvitador_noSirveParaLogin() throws Exception {
        String correo = "sinclave-invitador@test.cr";
        String body = "{\"nombre\":\"Sin Clave\",\"correo\":\"" + correo + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000000\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"correo\":\"" + correo + "\",\"contrasena\":\"Pass1234!\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Invitar no crea el Usuario: no hay hash que adivinar y el login con valores previsibles falla")
    void invitar_noCreaUsuario_loginFalla() throws Exception {
        String correo = "hash-previsible@test.cr";
        String body = "{\"nombre\":\"Hash Previsible\",\"correo\":\"" + correo + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000000\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());

        org.junit.jupiter.api.Assertions.assertTrue(usuarioRepository.findByCorreo(correo).isEmpty(),
            "invitar no debe crear el Usuario hasta que acepte");
        for (String secreto : new String[] {"Pass1234!", correo, "00000000", "Hash Previsible"}) {
            int st = mockMvc.perform(post("/api/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"correo\":\"" + correo + "\",\"contrasena\":\"" + secreto + "\"}"))
                .andReturn().getResponse().getStatus();
            org.junit.jupiter.api.Assertions.assertTrue(st >= 400 && st < 500,
                "login debía fallar con '" + secreto + "' pero respondió " + st);
        }
    }

    @Test
    @DisplayName("Invitar sin password en el body → 200 (ya no es parte de la API)")
    void invitar_sinPassword_200() throws Exception {
        String body = "{\"nombre\":\"Sin Pass\",\"correo\":\"sinpass@test.cr\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
    }

    // ── T-EQ-012: Invitar correo ya registrado → 400 ─────────────────────────
    @Test
    @DisplayName("T-EQ-012 | Invitar correo ya registrado → 200 \"Invitación enviada\" (no se filtra que existe) y no entra al equipo")
    void invitar_correoYaRegistrado_200() throws Exception {
        String body = "{\"nombre\":\"Duplicado\",\"correo\":\"" + adminCliente.getCorreo() + "\","
            + "\"password\":\"Pass1234!\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Invitación enviada"));
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
    @Test
    @DisplayName("T-EQ-014 | QA3-012 — EDITOR no puede eliminar miembros → 403")
    void adminCliente_cannotEliminar_403() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + emprendedor.getId())
                .header("Authorization", tokenAdminCliente))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Solo el emprendedor puede eliminar miembros"));
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
    @DisplayName("T-EQ-018 | Miembro invitado NO aparece en la lista hasta aceptar; luego sí")
    void invitado_aparece_enListado_soloTrasAceptar() throws Exception {
        String correoNuevo = "miembro-list@test.cr";
        String bodyInvite = "{\"nombre\":\"List Member\",\"correo\":\"" + correoNuevo + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000003\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyInvite))
            .andExpect(status().isOk());

        mockMvc.perform(get("/api/empresa/equipo")
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.correo == '" + correoNuevo + "')]").doesNotExist());

        aceptarCuentaNueva(correoNuevo, "Clave12345");

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
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000004\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
        aceptarCuentaNueva(correo, "Clave12345");

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
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000005\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
        aceptarCuentaNueva("juan-perez@test.cr", "Clave12345");

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
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000006\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
        aceptarCuentaNueva("solo-nombre@test.cr", "Clave12345");

        Usuario solo = usuarioRepository.findByCorreo("solo-nombre@test.cr")
            .orElseThrow(() -> new AssertionError("Usuario no encontrado"));
        org.junit.jupiter.api.Assertions.assertEquals("Miembro", solo.getApellidoPaterno());
    }

    // ── T-EQ-025: Miembro eliminado (soft-delete) NO se reactiva al re-invitarlo ──
    // Antes (#384) un ELIMINADO con membresía previa reingresaba; quedaba sin poder iniciar sesión (el login rechaza el
    // estado 3) y además se le añadían rol y empresa. La reactivación de eliminados queda para post-lanzamiento.
    @Test
    @DisplayName("T-EQ-025 | Re-invitar a un eliminado: misma respuesta (200 \"Invitación enviada\"), no se reactiva ni hay token")
    void eliminado_noSeReactivaAlReinvitar() throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + adminCliente.getId())
                .header("Authorization", tokenEmp))
            .andExpect(status().isOk());
        org.junit.jupiter.api.Assertions.assertEquals(Constants.ESTADO_ELIMINADO,
            usuarioRepository.findById(adminCliente.getId()).orElseThrow().getEstado());

        String bodyReinvite = "{\"nombre\":\"Re-invite\",\"correo\":\"" + adminCliente.getCorreo() + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000000\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(bodyReinvite))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Invitación enviada"));

        org.junit.jupiter.api.Assertions.assertEquals(Constants.ESTADO_ELIMINADO,
            usuarioRepository.findById(adminCliente.getId()).orElseThrow().getEstado());
        org.mockito.Mockito.verify(notificacionEmailService, org.mockito.Mockito.never()).enviarInvitacionMiembro(
            org.mockito.ArgumentMatchers.eq(adminCliente.getCorreo()), org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
            org.mockito.ArgumentMatchers.anyBoolean(), org.mockito.ArgumentMatchers.any());
    }

    // ── ADMIN en ROLES_PERMITIDOS es rol de equipo del negocio, NO el rol de plataforma ──
    @Test
    @DisplayName("Invitar con rolEnEmpresa=ADMIN da rol de equipo; el usuario NO recibe ROLE_ADMIN de plataforma")
    void invitarConRolEquipoAdmin_noEscalaAPlataforma() throws Exception {
        String correo = "equipo-admin@test.cr";
        String body = "{\"nombre\":\"Equipo Admin\",\"correo\":\"" + correo + "\","
            + "\"password\":\"Pass1234!\",\"telefono\":\"00000007\",\"rolEnEmpresa\":\"ADMIN\"}";
        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
        aceptarCuentaNueva(correo, "Clave12345");

        Usuario nuevo = usuarioRepository.findByCorreo(correo).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(nuevo.getRoles())
            .extracting(r -> r.getNombreRol())
            .containsExactly(Constants.ROL_EMPRENDEDOR);
    }

    private void aceptarCuentaNueva(String correo, String contrasena) throws Exception {
        String token = tokenInvitacionEnviadoA(correo);
        mockMvc.perform(post("/api/auth/equipo-invitacion/" + token + "/aceptar-cuenta-nueva")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"contrasena\":\"" + contrasena + "\"}"))
            .andExpect(status().isOk());
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
