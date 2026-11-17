package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.RefreshToken;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.repository.RefreshTokenRepository;
import com.hotclick.service.RefreshTokenService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

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

@DisplayName("Reinvitar a un usuario ELIMINADO (salió de su único negocio): reactiva con contraseña nueva")
class InvitacionEquipoReinvitarEliminadoTest extends BaseIntegrationTest {

    private static final String VIEJA = "Test1234!";
    private static final String NUEVA = "Nueva12345";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private InvitacionEquipoRepository invitaciones;
    @Autowired private RefreshTokenService refreshTokenService;
    @Autowired private RefreshTokenRepository refreshTokenRepository;

    private Empresa emp;
    private Empresa vieja;
    private Rol rol;
    private String tDueno;

    @BeforeEach
    void setUp() {
        rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        emp = empresa("reinv-a");
        vieja = empresa("reinv-b");
        Usuario dueno = crearUsuario("reinv-dueno@test.cr", "Dueno", rol);
        dueno.setEmpresa(emp);
        dueno = usuarioRepository.saveAndFlush(dueno);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, emp, "PROPIETARIO"));
        tDueno = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void limpiar() {
        refreshTokenRepository.deleteAll();
        invitaciones.deleteAll();
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

    private MvcResult invitar(String correo) throws Exception {
        return mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Invitada Prueba\",\"correo\":\"" + correo + "\",\"telefono\":\"00000000\",\"rolEnEmpresa\":\"EDITOR\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Invitación enviada"))
            .andReturn();
    }

    private int aceptarNueva(String token, String contrasena) throws Exception {
        return mockMvc.perform(post("/api/auth/equipo-invitacion/aceptar-cuenta-nueva")
                .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + token + "\",\"contrasena\":\"" + contrasena + "\"}"))
            .andReturn().getResponse().getStatus();
    }

    private boolean esMiembro(Usuario u, Empresa e) {
        return miembroEmpresaRepository.existsByUsuarioIdAndEmpresaIdAndEstado(u.getId(), e.getId(), 1);
    }

    private Usuario recargar(Usuario u) {
        return usuarioRepository.findById(u.getId()).orElseThrow();
    }

    /** Usuario miembro de emp, con una membresía vieja (estado 0) en otro negocio. */
    private Usuario miembroSoloDeEmp(String correo) {
        Usuario u = crearUsuario(correo, "Persona", rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, "LECTOR"));
        MiembroEmpresa antigua = new MiembroEmpresa(u, vieja, "ADMIN");
        antigua.setEstado(0);
        miembroEmpresaRepository.saveAndFlush(antigua);
        return u;
    }

    private void eliminar(Usuario u) throws Exception {
        mockMvc.perform(delete("/api/empresa/equipo/" + u.getId()).header("Authorization", tDueno)).andExpect(status().isOk());
    }

    @Test
    @DisplayName("flujo completo: único negocio -> eliminado -> reinvitar -> aceptar con contraseña nueva")
    void flujoCompleto() throws Exception {
        // Entra al equipo por una invitación (cuenta nueva, contraseña VIEJA); emp es su único negocio.
        String correo = "reinv-flujo@test.cr";
        invitar(correo);
        String previo = tokenInvitacionEnviadoA(correo);
        assertThat(aceptarNueva(previo, VIEJA)).isEqualTo(200);
        Usuario u = usuarioRepository.findByCorreo(correo).orElseThrow();
        assertThat(miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId())).isEqualTo(1);
        eliminar(u);
        assertThat(recargar(u).getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertThat(esMiembro(u, emp)).isFalse();

        MvcResult nuevoCorreo = invitar("reinv-inexistente@test.cr");
        MvcResult reinvitado = invitar(u.getCorreo());
        assertThat(reinvitado.getResponse().getStatus()).isEqualTo(nuevoCorreo.getResponse().getStatus());
        // mismo cuerpo salvo la marca de tiempo
        assertThat(reinvitado.getResponse().getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", ""))
            .isEqualTo(nuevoCorreo.getResponse().getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", ""));
        assertThat(recargar(u).getEstado()).as("invitar() no reactiva").isEqualTo(Constants.ESTADO_ELIMINADO);

        org.mockito.ArgumentCaptor<Boolean> cuentaNueva = org.mockito.ArgumentCaptor.forClass(Boolean.class);
        verify(notificacionEmailService, org.mockito.Mockito.times(2)).enviarInvitacionMiembro(
            eq(u.getCorreo()), any(), any(), any(), cuentaNueva.capture(), any());
        assertThat(cuentaNueva.getAllValues().get(0)).isTrue(); // cuenta que no existía
        assertThat(cuentaNueva.getAllValues().get(1)).isTrue(); // eliminada: define contraseña nueva
        String token = tokenInvitacionEnviadoA(u.getCorreo());
        assertThat(token).isNotEqualTo(previo);

        mockMvc.perform(post("/api/auth/equipo-invitacion/consultar").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + token + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.cuentaExiste").value(false));

        assertThat(aceptarNueva(token, NUEVA)).isEqualTo(200);
        Usuario r = recargar(u);
        assertThat(r.getId()).isEqualTo(u.getId());
        assertThat(usuarioRepository.findAll().stream().filter(x -> u.getCorreo().equals(x.getCorreo()))).hasSize(1);
        assertThat(r.getEstado()).isEqualTo(Constants.ESTADO_ACTIVO);
        assertThat(r.getCorreoVerificado()).isTrue();
        assertThat(passwordEncoder.matches(NUEVA, r.getContrasenaHash())).isTrue();
        assertThat(passwordEncoder.matches(VIEJA, r.getContrasenaHash())).isFalse();
        assertThat(esMiembro(u, emp)).isTrue();
        assertThat(miembroEmpresaRepository.countEmpresasByUsuarioId(u.getId())).isEqualTo(1);
        assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), emp.getId()).orElseThrow().getRolEnEmpresa())
            .isEqualTo("EDITOR");
        assertThat(jdbcTemplate.queryForList(
            "SELECT r.nombre_rol FROM hot_click_usuario_rol_tb ur JOIN hot_click_rol_tb r ON r.id_rol = ur.fk_id_rol WHERE ur.fk_id_usuario = ?",
            String.class, u.getId())).containsExactly(Constants.ROL_EMPRENDEDOR);
        assertThat(jdbcTemplate.queryForObject("SELECT fk_id_empresa FROM hot_click_usuario_tb WHERE id_usuario = ?",
            Long.class, u.getId())).isEqualTo(emp.getId());

        // tokens ya usados (el de antes de eliminar y el recién aceptado) no sirven
        assertThat(aceptarNueva(previo, "Otra123456")).isEqualTo(410);
        assertThat(aceptarNueva(token, "Otra123456")).isEqualTo(410);
        assertThat(passwordEncoder.matches(NUEVA, recargar(u).getContrasenaHash())).isTrue();
    }

    @Test
    @DisplayName("sesiones: el JWT y el refresh token anteriores quedan invalidados al reactivar")
    void sesionesViejasInvalidadas() throws Exception {
        Usuario u = miembroSoloDeEmp("reinv-ses@test.cr");
        eliminar(u);
        invitar(u.getCorreo());
        String token = tokenInvitacionEnviadoA(u.getCorreo());
        Thread.sleep(1100);
        String jwtViejo = tokenPara(u, Constants.ROL_EMPRENDEDOR);
        RefreshToken refresh = refreshTokenService.crear(recargar(u));
        Thread.sleep(1100);

        assertThat(aceptarNueva(token, NUEVA)).isEqualTo(200);

        assertThat(recargar(u).getSesionesInvalidadasEn()).isNotNull();
        assertThat(refreshTokenRepository.findById(refresh.getId()).orElseThrow().isRevoked()).isTrue();
        mockMvc.perform(get("/api/empresa/equipo").header("Authorization", jwtViejo)).andExpect(status().isUnauthorized());
        Thread.sleep(1100);
        mockMvc.perform(get("/api/empresa/equipo").header("Authorization", tokenPara(recargar(u), Constants.ROL_EMPRENDEDOR)))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("membresías: una membresía vieja (estado 0) de otro negocio NO se reactiva")
    void membresiaViejaSigueInactiva() throws Exception {
        Usuario u = miembroSoloDeEmp("reinv-mem@test.cr");
        eliminar(u);
        invitar(u.getCorreo());
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()), NUEVA)).isEqualTo(200);
        assertThat(esMiembro(u, vieja)).isFalse();
        assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), vieja.getId()).orElseThrow().getEstado()).isZero();
    }

    @Test
    @DisplayName("contraseña débil en la reactivación: 400, el token sigue vivo y la cuenta sigue ELIMINADA")
    void contrasenaDebil() throws Exception {
        Usuario u = miembroSoloDeEmp("reinv-debil@test.cr");
        eliminar(u);
        invitar(u.getCorreo());
        String token = tokenInvitacionEnviadoA(u.getCorreo());
        assertThat(aceptarNueva(token, "abc")).isEqualTo(400);
        Usuario r = recargar(u);
        assertThat(r.getEstado()).isEqualTo(Constants.ESTADO_ELIMINADO);
        assertThat(passwordEncoder.matches(VIEJA, r.getContrasenaHash())).isTrue();
        assertThat(aceptarNueva(token, NUEVA)).isEqualTo(200);
    }

    @Test
    @DisplayName("suspendido (bloqueo de admin) e inactivo: misma respuesta, sin token ni correo; un token plantado no los reactiva (410)")
    void suspendidoEInactivoNoSeReactivan() throws Exception {
        for (int estado : new int[] {Constants.ESTADO_SUSPENDIDO, Constants.ESTADO_INACTIVO}) {
            Usuario u = miembroSoloDeEmp("reinv-est" + estado + "@test.cr");
            u.setEstado(estado);
            usuarioRepository.saveAndFlush(u);
            invitar(u.getCorreo());
            assertThat(invitaciones.count()).isZero();
            verify(notificacionEmailService, never()).enviarInvitacionMiembro(eq(u.getCorreo()), any(), any(), any(), anyBoolean(), any());

            // defensa en profundidad: aunque existiera un token, no reactiva
            String plantado = "plantado-" + estado;
            jdbcTemplate.update("INSERT INTO hot_click_invitacion_equipo_tb (fk_id_empresa, correo, nombre, rol_en_empresa, token_hash, fecha_creacion, vence_en) VALUES (?,?,?,?,?,?,?)",
                emp.getId(), u.getCorreo(), "Plantado Prueba", "EDITOR",
                com.hotclick.service.InvitacionEquipoService.hashToken(plantado), LocalDateTime.now(), LocalDateTime.now().plusDays(1));
            assertThat(aceptarNueva(plantado, NUEVA)).isEqualTo(410);
            Usuario r = recargar(u);
            assertThat(r.getEstado()).isEqualTo(estado);
            assertThat(passwordEncoder.matches(VIEJA, r.getContrasenaHash())).isTrue();
            assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(u.getId(), emp.getId()).orElseThrow().getRolEnEmpresa())
                .isEqualTo("LECTOR");
            invitaciones.deleteAll();
        }
    }
}
