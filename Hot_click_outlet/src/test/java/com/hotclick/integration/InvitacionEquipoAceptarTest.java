package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Invitación de equipo — aceptar con token de un solo uso, atado a un correo y a un negocio")
class InvitacionEquipoAceptarTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private InvitacionEquipoRepository invitaciones;
    @Autowired private PlanRepository planRepository;

    private Empresa emp;
    private Empresa otra;
    private Usuario dueno;
    private String tDueno;
    private Plan plan;

    @BeforeEach
    void setUp() {
        Rol rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        emp = empresa("inv-acc-a");
        otra = empresa("inv-acc-b");
        dueno = miembro("inv-acc-dueno@test.cr", "PROPIETARIO", rol, emp);
        tDueno = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(), Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void limpiar() {
        invitaciones.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        if (plan != null) planRepository.deleteById(plan.getId());
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario miembro(String correo, String rolEquipo, Rol rol, Empresa e) {
        Usuario u = crearUsuario(correo, "Persona", rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, e, rolEquipo));
        return u;
    }

    private void invitar(String correo) throws Exception {
        mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Invitada Prueba\",\"correo\":\"" + correo + "\",\"telefono\":\"00000000\",\"rolEnEmpresa\":\"EDITOR\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Invitación enviada"));
    }

    private int aceptarNueva(String token, String contrasena) throws Exception {
        return mockMvc.perform(post("/api/auth/equipo-invitacion/" + token + "/aceptar-cuenta-nueva")
                .contentType(MediaType.APPLICATION_JSON).content("{\"contrasena\":\"" + contrasena + "\"}"))
            .andReturn().getResponse().getStatus();
    }

    private int aceptarExistente(String token, Usuario como) throws Exception {
        return mockMvc.perform(post("/api/equipo-invitaciones/" + token + "/aceptar")
                .header("Authorization", tokenPara(como, Constants.ROL_EMPRENDEDOR)))
            .andReturn().getResponse().getStatus();
    }

    private boolean esMiembro(Usuario u, Empresa e) {
        return miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), e.getId(), 1);
    }

    @Test
    @DisplayName("cuenta nueva: el token la crea y agrega UNA vez; el mismo token no sirve la segunda vez")
    void cuentaNuevaTokenDeUnSoloUso() throws Exception {
        String correo = "inv-acc-nueva@test.cr";
        invitar(correo);
        String token = tokenInvitacionEnviadoA(correo);
        assertThat(usuarioRepository.findByCorreo(correo)).isEmpty();

        assertThat(aceptarNueva(token, "Clave12345")).isEqualTo(200);
        Usuario u = usuarioRepository.findByCorreo(correo).orElseThrow();
        assertThat(esMiembro(u, emp)).isTrue();
        assertThat(passwordEncoder.matches("Clave12345", u.getContrasenaHash())).isTrue();
        mockMvc.perform(get("/api/empresa/equipo").header("Authorization", tDueno))
            .andExpect(jsonPath("$.data[?(@.correo == '" + correo + "')]").exists());

        assertThat(aceptarNueva(token, "OtraClave123")).isEqualTo(410);
        assertThat(passwordEncoder.matches("Clave12345", usuarioRepository.findByCorreo(correo).orElseThrow().getContrasenaHash())).isTrue();
    }

    @Test
    @DisplayName("cuenta nueva: contraseña débil se rechaza y el token sigue sin consumirse")
    void contrasenaDebilNoConsume() throws Exception {
        String correo = "inv-acc-debil@test.cr";
        invitar(correo);
        String token = tokenInvitacionEnviadoA(correo);
        assertThat(aceptarNueva(token, "abc")).isEqualTo(400);
        assertThat(usuarioRepository.findByCorreo(correo)).isEmpty();
        assertThat(aceptarNueva(token, "Clave12345")).isEqualTo(200);
    }

    @Test
    @DisplayName("cuenta existente: aceptar autenticado como ese correo la agrega; el mismo token no sirve otra vez")
    void cuentaExistenteAceptaUnaVez() throws Exception {
        Usuario ajena = miembro("inv-acc-ajena@test.cr", "PROPIETARIO", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5), otra);
        invitar(ajena.getCorreo());
        assertThat(esMiembro(ajena, emp)).isFalse();
        String token = tokenInvitacionEnviadoA(ajena.getCorreo());

        assertThat(aceptarExistente(token, ajena)).isEqualTo(200);
        assertThat(esMiembro(ajena, emp)).isTrue();
        assertThat(aceptarExistente(token, ajena)).isEqualTo(410);
    }

    @Test
    @DisplayName("el token está atado a un solo correo: otro usuario (existente o no) no lo acepta y el token sigue vivo")
    void tokenAtadoAUnCorreo() throws Exception {
        Rol rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario ajena = miembro("inv-acc-ajena2@test.cr", "PROPIETARIO", rol, otra);
        Usuario intruso = miembro("inv-acc-intruso@test.cr", "PROPIETARIO", rol, otra);
        invitar(ajena.getCorreo());
        String token = tokenInvitacionEnviadoA(ajena.getCorreo());

        assertThat(aceptarExistente(token, intruso)).isEqualTo(410);
        assertThat(esMiembro(intruso, emp)).isFalse();
        // el endpoint de cuenta nueva tampoco sirve para un correo que ya tiene cuenta
        assertThat(aceptarNueva(token, "Clave12345")).isEqualTo(409);
        assertThat(esMiembro(ajena, emp)).isFalse();
        // y el dueño legítimo sí puede
        assertThat(aceptarExistente(token, ajena)).isEqualTo(200);
    }

    @Test
    @DisplayName("sin sesión no se acepta como cuenta existente (401)")
    void aceptarExistenteSinSesion() throws Exception {
        mockMvc.perform(post("/api/equipo-invitaciones/cualquiera/aceptar")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("eliminado del equipo: la invitación ya usada no sirve; una invitación NUEVA sí")
    void eliminadoRequiereInvitacionNueva() throws Exception {
        Usuario ajena = miembro("inv-acc-baja@test.cr", "PROPIETARIO", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5), otra);
        invitar(ajena.getCorreo());
        String viejo = tokenInvitacionEnviadoA(ajena.getCorreo());
        assertThat(aceptarExistente(viejo, ajena)).isEqualTo(200);

        mockMvc.perform(delete("/api/empresa/equipo/" + ajena.getId()).header("Authorization", tDueno)).andExpect(status().isOk());
        assertThat(esMiembro(ajena, emp)).isFalse();

        assertThat(aceptarExistente(viejo, ajena)).isEqualTo(410);
        assertThat(esMiembro(ajena, emp)).isFalse();

        invitar(ajena.getCorreo());
        String nuevo = tokenInvitacionEnviadoA(ajena.getCorreo());
        assertThat(nuevo).isNotEqualTo(viejo);
        assertThat(aceptarExistente(nuevo, ajena)).isEqualTo(200);
        assertThat(esMiembro(ajena, emp)).isTrue();
    }

    @Test
    @DisplayName("re-invitar al mismo correo invalida la invitación pendiente anterior (un solo uso vigente)")
    void reinvitarInvalidaLaAnterior() throws Exception {
        String correo = "inv-acc-reinv@test.cr";
        invitar(correo);
        String primero = tokenInvitacionEnviadoA(correo);
        invitar(correo);
        org.mockito.Mockito.verify(notificacionEmailService, org.mockito.Mockito.times(2)).enviarInvitacionMiembro(
            eq(correo), any(), any(), any(), anyBoolean(), any());
        String segundo = tokenInvitacionEnviadoA(correo);
        assertThat(segundo).isNotEqualTo(primero);

        assertThat(aceptarNueva(primero, "Clave12345")).isEqualTo(410);
        assertThat(aceptarNueva(segundo, "Clave12345")).isEqualTo(200);
    }

    @Test
    @DisplayName("invitación vencida (7 días) o revocada: error genérico 410")
    void vencidaNoSirve() throws Exception {
        String correo = "inv-acc-vence@test.cr";
        invitar(correo);
        String token = tokenInvitacionEnviadoA(correo);
        jdbcTemplate.update("UPDATE hot_click_invitacion_equipo_tb SET vence_en = ?", LocalDateTime.now().minusMinutes(1));
        assertThat(aceptarNueva(token, "Clave12345")).isEqualTo(410);
        assertThat(usuarioRepository.findByCorreo(correo)).isEmpty();
    }

    @Test
    @DisplayName("la invitación dura 7 días y en la base solo queda el hash del token")
    void vigenciaYHash() throws Exception {
        String correo = "inv-acc-hash@test.cr";
        invitar(correo);
        String token = tokenInvitacionEnviadoA(correo);
        var inv = invitaciones.findAll().get(0);
        assertThat(inv.getTokenHash()).isNotEqualTo(token).hasSize(64);
        assertThat(inv.getVenceEn()).isAfter(LocalDateTime.now().plusDays(6)).isBefore(LocalDateTime.now().plusDays(8));
    }

    @Test
    @DisplayName("ya es miembro activo: misma respuesta, sigue un solo miembro y no hay token que lo 'vuelva a agregar'")
    void yaMiembroNoGeneraToken() throws Exception {
        Usuario ya = miembro("inv-acc-ya@test.cr", "EDITOR", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5), emp);
        invitar(ya.getCorreo());
        assertThat(invitaciones.count()).isZero();
        verify(notificacionEmailService, never()).enviarInvitacionMiembro(eq(ya.getCorreo()), any(), any(), any(), anyBoolean(), any());
        assertThat(miembroEmpresaRepository.findByEmpresaIdAndEstado(emp.getId(), 1)).hasSize(2); // dueño + él
    }

    @Test
    @DisplayName("cuenta existente no activa: misma respuesta, no entra, no se reactiva y no hay token")
    void inactivaNoEntra() throws Exception {
        Usuario susp = miembro("inv-acc-susp@test.cr", "PROPIETARIO", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5), otra);
        susp.setEstado(Constants.ESTADO_SUSPENDIDO);
        usuarioRepository.saveAndFlush(susp);
        invitar(susp.getCorreo());
        assertThat(invitaciones.count()).isZero();
        assertThat(esMiembro(susp, emp)).isFalse();
        assertThat(usuarioRepository.findById(susp.getId()).orElseThrow().getEstado()).isEqualTo(Constants.ESTADO_SUSPENDIDO);
    }

    @Test
    @DisplayName("consulta pública: muestra negocio y rol con el token; token inválido = 410 genérico")
    void consultaPublica() throws Exception {
        String correo = "inv-acc-consulta@test.cr";
        invitar(correo);
        String token = tokenInvitacionEnviadoA(correo);
        mockMvc.perform(get("/api/auth/equipo-invitacion/" + token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.rolEnEmpresa").value("EDITOR"))
            .andExpect(jsonPath("$.data.cuentaExiste").value(false));
        mockMvc.perform(get("/api/auth/equipo-invitacion/no-existe-123")).andExpect(status().isGone());
    }

    @Test
    @DisplayName("el cupo del plan cuenta las invitaciones pendientes: con 2 lugares, dueño + 1 pendiente llenan el cupo")
    void cupoContemplaPendientes() throws Exception {
        Plan p = new Plan();
        p.setNombre("INVACC_" + System.nanoTime());
        p.setMaxUsuarios(2);
        plan = planRepository.saveAndFlush(p);
        emp.setPlan(plan);
        empresaRepository.saveAndFlush(emp);

        invitar("inv-acc-cupo1@test.cr");
        mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Cupo Dos\",\"correo\":\"inv-acc-cupo2@test.cr\",\"rolEnEmpresa\":\"EDITOR\"}"))
            .andExpect(status().is4xxClientError());
        // re-invitar al mismo correo pendiente no cuenta doble
        invitar("inv-acc-cupo1@test.cr");
    }

    @Test
    @DisplayName("al aceptar se re-verifica el cupo: si se llenó mientras estaba pendiente, no entra")
    void aceptarReverificaCupo() throws Exception {
        Plan p = new Plan();
        p.setNombre("INVACC2_" + System.nanoTime());
        p.setMaxUsuarios(2);
        plan = planRepository.saveAndFlush(p);
        emp.setPlan(plan);
        empresaRepository.saveAndFlush(emp);

        String correo = "inv-acc-lleno@test.cr";
        invitar(correo);
        String token = tokenInvitacionEnviadoA(correo);
        miembro("inv-acc-cuela@test.cr", "EDITOR", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5), emp); // llena 2/2
        assertThat(aceptarNueva(token, "Clave12345")).isGreaterThanOrEqualTo(400);
        assertThat(usuarioRepository.findByCorreo(correo)).isEmpty();
    }
}
