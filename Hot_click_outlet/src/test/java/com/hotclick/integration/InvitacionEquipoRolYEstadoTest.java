package com.hotclick.integration;

import com.hotclick.exception.EnlaceNoVigenteException;
import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.InvitacionEquipoRepository;
import com.hotclick.service.InvitacionEquipoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Mutaciones que sobrevivían (PR 583): (1) el miembro queda con el rol de la INVITACIÓN, nunca un ADMIN inventado;
 * (2) una cuenta no ACTIVA no entra aceptando con sesión; (3) findByCorreo ignora ELIMINADAS y la reactivación por
 * SALIDA_EQUIPO sigue encontrándolas.
 */
@DisplayName("Invitación de equipo: rol de la invitación, cuenta no activa y findByCorreo sin ELIMINADAS")
class InvitacionEquipoRolYEstadoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private InvitacionEquipoRepository invitaciones;
    @Autowired private InvitacionEquipoService invitacionService;

    private Empresa emp;
    private Rol rol;
    private String tDueno;

    @BeforeEach
    void setUp() {
        rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Empresa e = new Empresa();
        e.setNombreEmpresa("rolest-a"); e.setNombreComercial("rolest-a"); e.setSlug("rolest-a");
        e.setCorreoEmpresa("rolest-a@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Usuario dueno = crearUsuario("rolest-dueno@test.cr", "Dueno", rol);
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

    private void invitar(String correo, String rolEquipo) throws Exception {
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb"); // varias invitaciones por test: tope 5/60s por IP
        mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Invitada Prueba\",\"correo\":\"" + correo + "\",\"telefono\":\"00000000\",\"rolEnEmpresa\":\""
                    + rolEquipo + "\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Invitación enviada"));
    }

    private int aceptarNueva(String token, String contrasena) throws Exception {
        return mockMvc.perform(post("/api/auth/equipo-invitacion/aceptar-cuenta-nueva")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"contrasena\":\"" + contrasena + "\"}"))
            .andReturn().getResponse().getStatus();
    }

    private int aceptarExistente(String token, Usuario como) throws Exception {
        return mockMvc.perform(post("/api/equipo-invitaciones/aceptar")
                .header("Authorization", tokenPara(como, Constants.ROL_EMPRENDEDOR))
                .contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"" + token + "\"}"))
            .andReturn().getResponse().getStatus();
    }

    private String rolEnEquipo(Usuario u) {
        return miembroEmpresaRepository.findByUsuarioIdAndEmpresaIdAndEstado(u.getId(), emp.getId(), 1)
            .map(MiembroEmpresa::getRolEnEmpresa).orElse(null);
    }

    private Usuario cuentaAjena(String correo, int estado) {
        Usuario u = crearUsuario(correo, "Ajena", rol);
        u.setEstado(estado);
        return usuarioRepository.saveAndFlush(u);
    }

    /** ELIMINADA por salida del equipo; libera la identificación para poder crear otra cuenta con el mismo correo. */
    private Usuario eliminadaPorSalida(String correo) {
        Usuario u = cuentaAjena(correo, Constants.ESTADO_ELIMINADO);
        u.setMotivoEliminacion(Constants.MOTIVO_ELIMINACION_SALIDA_EQUIPO);
        u.setIdentificacion("ELIM-" + u.getId());
        return usuarioRepository.saveAndFlush(u);
    }

    /**
     * En PostgreSQL el índice único de correo es PARCIAL (excluye ELIMINADAS, V15) y admite una ELIMINADA y una viva
     * con el mismo correo; el H2 de test lo tiene global. Se quita en el test y se repone en {@link #reponerUnicoCorreo}.
     */
    private String unicoCorreoQuitado;

    private void permitirCorreoRepetido() {
        String nombre = jdbcTemplate.queryForObject("""
            SELECT tc.constraint_name FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage cu ON cu.constraint_name = tc.constraint_name
            WHERE upper(tc.table_name) = 'HOT_CLICK_USUARIO_TB' AND tc.constraint_type = 'UNIQUE'
              AND upper(cu.column_name) = 'CORREO'
            """, String.class);
        jdbcTemplate.execute("ALTER TABLE hot_click_usuario_tb DROP CONSTRAINT " + nombre);
        unicoCorreoQuitado = nombre;
    }

    @AfterEach
    void reponerUnicoCorreo() {
        if (unicoCorreoQuitado == null) return;
        jdbcTemplate.update("DELETE FROM hot_click_usuario_rol_tb WHERE fk_id_usuario IN "
            + "(SELECT id_usuario FROM hot_click_usuario_tb WHERE correo LIKE 'rolest-doble%')");
        jdbcTemplate.update("DELETE FROM hot_click_usuario_tb WHERE correo LIKE 'rolest-doble%'");
        jdbcTemplate.execute("ALTER TABLE hot_click_usuario_tb ADD CONSTRAINT uq_correo_rolest UNIQUE (correo)");
        unicoCorreoQuitado = null;
    }

    @Test
    @DisplayName("cuenta nueva: el miembro queda con el rol de la invitación (LECTOR/CAJERO/EDITOR), nunca ADMIN")
    void cuentaNuevaConservaElRolInvitado() throws Exception {
        for (String r : new String[] {"LECTOR", "CAJERO", "EDITOR"}) {
            String correo = "rolest-nueva-" + r.toLowerCase() + "@test.cr";
            invitar(correo, r);
            assertThat(aceptarNueva(tokenInvitacionEnviadoA(correo), "Clave12345")).isEqualTo(200);
            assertThat(rolEnEquipo(usuarioRepository.findByCorreo(correo).orElseThrow())).as("rol de " + correo).isEqualTo(r);
        }
    }

    @Test
    @DisplayName("cuenta existente (sesión): el miembro queda con el rol de la invitación, nunca ADMIN")
    void cuentaExistenteConservaElRolInvitado() throws Exception {
        for (String r : new String[] {"LECTOR", "CAJERO", "EDITOR"}) {
            Usuario u = cuentaAjena("rolest-existente-" + r.toLowerCase() + "@test.cr", Constants.ESTADO_ACTIVO);
            invitar(u.getCorreo(), r);
            assertThat(aceptarExistente(tokenInvitacionEnviadoA(u.getCorreo()), u)).isEqualTo(200);
            assertThat(rolEnEquipo(u)).as("rol de " + u.getCorreo()).isEqualTo(r);
        }
    }

    @Test
    @DisplayName("reactivación de ELIMINADO por SALIDA_EQUIPO: el miembro queda con el rol de la invitación, nunca ADMIN")
    void reactivacionConservaElRolInvitado() throws Exception {
        Usuario u = crearUsuario("rolest-baja@test.cr", "Baja", rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, "ADMIN")); // antes era ADMIN
        mockMvc.perform(delete("/api/empresa/equipo/" + u.getId()).header("Authorization", tDueno)).andExpect(status().isOk());
        assertThat(usuarioRepository.findById(u.getId()).orElseThrow().getMotivoEliminacion())
            .isEqualTo(Constants.MOTIVO_ELIMINACION_SALIDA_EQUIPO);

        invitar(u.getCorreo(), "LECTOR");
        assertThat(aceptarNueva(tokenInvitacionEnviadoA(u.getCorreo()), "Clave12345")).isEqualTo(200);
        assertThat(rolEnEquipo(u)).isEqualTo("LECTOR");
    }

    @Test
    @DisplayName("SUSPENDIDO o INACTIVO tras ser invitado: aceptar con sesión da 410 y NO entra al equipo")
    void cuentaNoActivaNoEntraAceptandoConSesion() throws Exception {
        for (int estado : new int[] {Constants.ESTADO_SUSPENDIDO, Constants.ESTADO_INACTIVO}) {
            Usuario u = cuentaAjena("rolest-noactiva-" + estado + "@test.cr", Constants.ESTADO_ACTIVO);
            invitar(u.getCorreo(), "EDITOR");
            String token = tokenInvitacionEnviadoA(u.getCorreo());
            u.setEstado(estado); // se suspende / inactiva DESPUÉS de recibir el enlace
            usuarioRepository.saveAndFlush(u);

            // 1) por el servicio (el JWT de una cuenta no activa ya lo corta el filtro; aquí se prueba la defensa del servicio)
            assertThatThrownBy(() -> invitacionService.aceptarCuentaExistente(token, usuarioRepository.findById(u.getId()).orElseThrow()))
                .isInstanceOfSatisfying(EnlaceNoVigenteException.class,
                    e -> assertThat(e.getStatus().value()).as("estado " + estado).isEqualTo(410));
            assertThat(rolEnEquipo(u)).as("no entró (estado " + estado + ")").isNull();
            // 2) por HTTP con un JWT plantado: nunca entra (410 si el filtro lo deja pasar, 401/403 si lo corta antes)
            int http = aceptarExistente(token, u);
            assertThat(http).as("HTTP estado " + estado).isIn(401, 403, 410);
            assertThat(rolEnEquipo(u)).isNull();
            // el token no se consumió por un intento fallido de una cuenta no activa
            assertThat(invitaciones.findAll().stream().filter(i -> i.getCorreo().equals(u.getCorreo()))
                .allMatch(i -> i.getUsadoEn() == null)).isTrue();
        }
    }

    @Test
    @DisplayName("findByCorreo ignora ELIMINADAS: con una ELIMINADA y una ACTIVA del mismo correo devuelve la activa, sin excepción")
    void findByCorreoIgnoraEliminadas() {
        permitirCorreoRepetido();
        String correo = "rolest-doble@test.cr";
        Usuario vieja = eliminadaPorSalida(correo);
        Usuario activa = cuentaAjena(correo, Constants.ESTADO_ACTIVO); // el índice único parcial lo permite

        assertThat(usuarioRepository.findByCorreo(correo)).get().extracting(Usuario::getId).isEqualTo(activa.getId());
        assertThat(usuarioRepository.findEliminadoByCorreo(correo)).get().extracting(Usuario::getId).isEqualTo(vieja.getId());

        // solo ELIMINADA: findByCorreo no la ve (login no la autentica), el camino de reactivación sí
        usuarioRepository.delete(activa);
        usuarioRepository.flush();
        assertThat(usuarioRepository.findByCorreo(correo)).isEmpty();
        assertThat(usuarioRepository.findEliminadoByCorreo(correo)).isPresent();
    }

    @Test
    @DisplayName("una ELIMINADA y una ACTIVA con el mismo correo: invitar responde igual (200) y consultar no da 500")
    void filaEliminadaMasActivaNoRompeLaRespuestaUniforme() throws Exception {
        permitirCorreoRepetido();
        String correo = "rolest-doble2@test.cr";
        Usuario vieja = eliminadaPorSalida(correo);
        cuentaAjena(correo, Constants.ESTADO_ACTIVO);

        invitar(correo, "EDITOR");
        String token = tokenInvitacionEnviadoA(correo);
        mockMvc.perform(post("/api/auth/equipo-invitacion/consultar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\"}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.cuentaExiste").value(true));
        // la cuenta ACTIVA define el camino: 409 «iniciá sesión», no una reactivación de la fila vieja
        assertThat(aceptarNueva(token, "Clave12345")).isEqualTo(409);
    }
}
