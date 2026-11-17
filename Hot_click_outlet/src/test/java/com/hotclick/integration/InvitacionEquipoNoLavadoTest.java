package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.InvitacionEquipoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguridad PR 583 (bloqueos): la salida del equipo no "lava" la decisión de un admin, la eliminación desde admin
 * fija motivo ADMIN, y la reactivación legítima deja la cuenta solo como EMPRENDEDOR.
 * Todo por los endpoints reales (admin: /api/admin/usuarios, dueño: /api/empresa/equipo, público: aceptar-cuenta-nueva).
 */
@DisplayName("Reinvitar: la salida del equipo no lava el estado/motivo del admin; reactivación solo EMPRENDEDOR")
class InvitacionEquipoNoLavadoTest extends BaseIntegrationTest {

    private static final String NUEVA = "Nueva12345";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private InvitacionEquipoRepository invitaciones;
    @Autowired private TelegramVinculacionRepository telegramRepository;

    private Empresa emp;
    private Rol rolEmprendedor;
    private String tDueno;

    @BeforeEach
    void setUp() {
        rolEmprendedor = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("lavado-a"); e.setNombreComercial("lavado-a"); e.setSlug("lavado-a");
        e.setCorreoEmpresa("lavado-a@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Usuario dueno = crearUsuario("lavado-dueno@test.cr", "Dueno", rolEmprendedor);
        dueno.setEmpresa(emp);
        dueno = usuarioRepository.saveAndFlush(dueno);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, emp, "PROPIETARIO"));
        tDueno = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void limpiar() {
        telegramRepository.deleteAll();
        refreshTokenRepository.deleteAll();
        invitaciones.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Usuario miembro(String correo) {
        Usuario u = crearUsuario(correo, "Persona", rolEmprendedor);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, "LECTOR"));
        return u;
    }

    private Usuario recargar(Usuario u) { return usuarioRepository.findById(u.getId()).orElseThrow(); }

    private void adminHace(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req) throws Exception {
        mockMvc.perform(req.header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)).andExpect(status().isOk());
    }

    private void duenoLoSaca(Usuario u) throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + u.getId()).header("Authorization", tDueno)).andExpect(status().isOk());
    }

    private void reinvitar(String correo) throws Exception {
        mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno).contentType(MediaType.APPLICATION_JSON)
            .content("{\"nombre\":\"Invitada Prueba\",\"correo\":\"" + correo + "\",\"telefono\":\"00000000\",\"rolEnEmpresa\":\"EDITOR\"}"))
            .andExpect(status().isOk());
    }

    private int aceptarNueva(String token) throws Exception {
        return mockMvc.perform(post("/api/auth/equipo-invitacion/aceptar-cuenta-nueva").contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\":\"" + token + "\",\"contrasena\":\"" + NUEVA + "\"}")).andReturn().getResponse().getStatus();
    }

    /** Reinvita y, con un token plantado (por si invitar no emite), intenta aceptar: debe ser 410. */
    private void reinvitarYAceptarDa410(Usuario u) throws Exception {
        reinvitar(u.getCorreo());
        String plantado = "plantado-lavado-" + u.getId();
        jdbcTemplate.update("INSERT INTO hot_click_invitacion_equipo_tb (fk_id_empresa, correo, nombre, rol_en_empresa, token_hash, "
                + "fecha_creacion, vence_en) VALUES (?,?,?,?,?,?,?)",
            emp.getId(), u.getCorreo(), "Plantado Prueba", "EDITOR", InvitacionEquipoService.hashToken(plantado),
            LocalDateTime.now(Constants.ZONA_CR), LocalDateTime.now(Constants.ZONA_CR).plusDays(1));
        assertThat(aceptarNueva(plantado)).isEqualTo(410);
        invitaciones.deleteAll();
    }

    private void conservaEstadoYMotivo(Usuario u, int estado, String motivo) {
        Usuario r = recargar(u);
        assertThat(r.getEstado()).isEqualTo(estado);
        assertThat(r.getMotivoEliminacion()).isEqualTo(motivo);
        assertThat(passwordEncoder.matches(NUEVA, r.getContrasenaHash())).isFalse();
        assertThat(miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), emp.getId(), 1))
            .as("la membresía sí se quitó").isFalse();
    }

    @Test
    @DisplayName("M19: eliminar desde admin fija motivo ADMIN; reinvitar + aceptar = 410")
    void eliminarDesdeAdminFijaMotivoAdmin() throws Exception {
        Usuario u = miembro("lavado-admin-elim@test.cr");
        adminHace(delete("/api/admin/usuarios/" + u.getId()));
        Usuario r = recargar(u);
        assertThat(r.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertThat(r.getMotivoEliminacion()).isEqualTo(Constants.MOTIVO_ELIMINACION_ADMIN);
        reinvitarYAceptarDa410(u);
        assertThat(recargar(u).getMotivoEliminacion()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("lavado: eliminado por admin y luego sacado del equipo: sigue ELIMINADO/ADMIN y no se reactiva")
    void eliminadoPorAdminYSacadoNoSeLava() throws Exception {
        Usuario u = miembro("lavado-elim@test.cr");
        adminHace(delete("/api/admin/usuarios/" + u.getId()));
        duenoLoSaca(u);
        conservaEstadoYMotivo(u, Constants.ESTADO_ELIMINADO, Constants.MOTIVO_ELIMINACION_ADMIN);
        reinvitarYAceptarDa410(u);
        conservaEstadoYMotivo(u, Constants.ESTADO_ELIMINADO, Constants.MOTIVO_ELIMINACION_ADMIN);
    }

    @Test
    @DisplayName("lavado: bloqueado (SUSPENDIDO) por admin y luego sacado del equipo: sigue SUSPENDIDO sin motivo y no se reactiva")
    void bloqueadoPorAdminYSacadoNoSeLava() throws Exception {
        Usuario u = miembro("lavado-bloq@test.cr");
        adminHace(put("/api/admin/usuarios/" + u.getId() + "/bloquear"));
        assertThat(recargar(u).getEstado()).isEqualTo(Constants.ESTADO_SUSPENDIDO);
        duenoLoSaca(u);
        conservaEstadoYMotivo(u, Constants.ESTADO_SUSPENDIDO, null);
        reinvitarYAceptarDa410(u);
        conservaEstadoYMotivo(u, Constants.ESTADO_SUSPENDIDO, null);
    }

    @Test
    @DisplayName("lavado: INACTIVO por admin y luego sacado del equipo: sigue INACTIVO y no se reactiva")
    void inactivoPorAdminYSacadoNoSeLava() throws Exception {
        Usuario u = miembro("lavado-inact@test.cr");
        mockMvc.perform(put("/api/admin/usuarios/" + u.getId() + "/estado").header("Authorization", adminToken)
            .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":2}")).andExpect(status().isOk());
        assertThat(recargar(u).getEstado()).isEqualTo(Constants.ESTADO_INACTIVO);
        duenoLoSaca(u);
        conservaEstadoYMotivo(u, Constants.ESTADO_INACTIVO, null);
        reinvitarYAceptarDa410(u);
        conservaEstadoYMotivo(u, Constants.ESTADO_INACTIVO, null);
    }

    @Test
    @DisplayName("lavado: cualquier motivo ya puesto (aunque esté ACTIVO) no se pisa al sacarlo del equipo")
    void motivoPrevioNoSePisa() throws Exception {
        Usuario u = miembro("lavado-motivo@test.cr");
        u.setMotivoEliminacion("BORRADO_DATOS");
        usuarioRepository.saveAndFlush(u);
        duenoLoSaca(u);
        conservaEstadoYMotivo(u, Constants.ESTADO_ACTIVO, "BORRADO_DATOS");
    }

    @Test
    @DisplayName("roles: un ADMIN (y otros) que sale del equipo y se reactiva queda SOLO con EMPRENDEDOR; Clerk y Telegram se desligan")
    void reactivacionDejaSoloEmprendedor() throws Exception {
        Usuario u = miembro("lavado-roles@test.cr");
        Rol admin = obtenerOCrearRol(Constants.ROL_ADMIN, 10);
        Rol final_ = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario conRoles = usuarioRepository.findByIdWithRoles(u.getId()).orElseThrow();
        conRoles.getRoles().add(admin);
        conRoles.getRoles().add(final_);
        conRoles.setClerkUserId("user_clerk_prueba");
        usuarioRepository.saveAndFlush(conRoles);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(123456789L);
        v.setEstado(TelegramVinculacion.ACTIVA);
        telegramRepository.saveAndFlush(v);

        duenoLoSaca(u);
        assertThat(recargar(u).getMotivoEliminacion()).isEqualTo("SALIDA_EQUIPO");
        reinvitar(u.getCorreo());
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()))).isEqualTo(200);

        Usuario r = usuarioRepository.findByIdWithRoles(u.getId()).orElseThrow();
        Set<String> roles = r.getRoles().stream().map(Rol::getNombreRol).collect(Collectors.toSet());
        assertThat(roles).containsExactlyInAnyOrder(Constants.ROL_EMPRENDEDOR);
        assertThat(r.getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
        assertThat(r.getClerkUserId()).isNull();
        TelegramVinculacion t = telegramRepository.findByUsuarioId(u.getId()).orElseThrow();
        assertThat(t.getEstado()).isEqualTo(TelegramVinculacion.REVOCADA);
        assertThat(t.getChatId()).isNull();
    }
}
