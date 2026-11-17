package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Decisión 16-nov-2026: invitar (exista o no la cuenta) solo crea una invitación PENDIENTE y responde SIEMPRE
 * igual, para que quien invita no pueda enumerar correos mirando la respuesta ni el listado del equipo.
 * Solo usa HTTP (sin helpers nuevos) para poder correrse también contra el código anterior.
 */
@DisplayName("Invitación de equipo — misma respuesta exista o no la cuenta; nadie entra al listado hasta aceptar")
class InvitacionEquipoEnumeracionTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;

    private Empresa emp;
    private Empresa otra;
    private Usuario dueno;
    private Usuario miembroActivo;
    private String tDueno;

    @BeforeEach
    void setUp() {
        Rol rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        emp = empresa("inv-enum-a");
        otra = empresa("inv-enum-b");
        dueno = miembro("inv-enum-dueno@test.cr", "PROPIETARIO", rol, emp);
        miembroActivo = miembro("inv-enum-miembro@test.cr", "EDITOR", rol, emp);
        tDueno = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(), Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void limpiar() {
        try { jdbcTemplate.update("DELETE FROM hot_click_invitacion_equipo_tb"); } catch (Exception ignorado) { /* tabla ausente en el código anterior */ }
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

    private Usuario miembro(String correo, String rolEquipo, Rol rol, Empresa e) {
        Usuario u = crearUsuario(correo, "Persona", rol);
        u.setEmpresa(e);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, e, rolEquipo));
        return u;
    }

    private Usuario cuentaConEstado(String correo, int estado) {
        Usuario u = crearUsuario(correo, "Ajena", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setEstado(estado);
        u.setEmpresa(otra);
        return usuarioRepository.saveAndFlush(u);
    }

    /** Headers que no cambian entre llamadas iguales (se excluyen Date y Set-Cookie/sesión, que sí varían). */
    private static final Set<String> HEADERS_VARIABLES = Set.of("date", "set-cookie", "expires", "x-request-id", "traceparent");

    /**
     * Status + HEADERS estables (nombre y valores, ordenados) + cuerpo crudo sin el timestamp (lo único que cambia
     * entre llamadas). Indistinguible también por headers: ni un Content-Length distinto ni un header extra delata
     * si la cuenta existe.
     */
    private String respuesta(String correo, String rolEnEmpresa) throws Exception {
        // 6 invitaciones seguidas desde la misma IP superan el tope de POST /api/empresa/equipo (5/60s): se limpia el cupo.
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
        MockHttpServletResponse r = mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tDueno).contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"Invitada Prueba\",\"correo\":\"" + correo + "\",\"telefono\":\"00000000\",\"rolEnEmpresa\":\""
                    + rolEnEmpresa + "\"}"))
            .andReturn().getResponse();
        r.setCharacterEncoding("UTF-8");
        Map<String, List<String>> headers = new TreeMap<>();
        for (String nombre : r.getHeaderNames()) {
            if (HEADERS_VARIABLES.contains(nombre.toLowerCase(java.util.Locale.ROOT))) continue;
            headers.put(nombre.toLowerCase(java.util.Locale.ROOT), r.getHeaders(nombre));
        }
        return r.getStatus() + "|" + headers + "|" + r.getContentAsString().replaceAll("\"timestamp\"\\s*:\\s*\"[^\"]*\"", "\"timestamp\":\"-\"");
    }

    @Test
    @DisplayName("la respuesta es idéntica (status, headers y cuerpo) para: correo inexistente, cuenta activa ajena, ya miembro, eliminada, suspendida, inactiva")
    void respuestaIdenticaExistaONoLaCuenta() throws Exception {
        cuentaConEstado("inv-enum-activa@test.cr", Constants.ESTADO_ACTIVO);
        cuentaConEstado("inv-enum-eliminada@test.cr", Constants.ESTADO_ELIMINADO);
        cuentaConEstado("inv-enum-suspendida@test.cr", Constants.ESTADO_SUSPENDIDO);
        cuentaConEstado("inv-enum-inactiva@test.cr", Constants.ESTADO_INACTIVO);

        Map<String, String> r = new LinkedHashMap<>();
        r.put("inexistente", respuesta("inv-enum-no-existe@test.cr", "EDITOR"));
        r.put("activa", respuesta("inv-enum-activa@test.cr", "EDITOR"));
        r.put("yaMiembro", respuesta(miembroActivo.getCorreo(), "EDITOR"));
        r.put("eliminada", respuesta("inv-enum-eliminada@test.cr", "EDITOR"));
        r.put("suspendida", respuesta("inv-enum-suspendida@test.cr", "EDITOR"));
        r.put("inactiva", respuesta("inv-enum-inactiva@test.cr", "EDITOR"));

        String esperada = r.get("inexistente");
        assertThat(esperada).startsWith("200|").contains("Invitación enviada").contains("content-type");
        r.forEach((caso, cuerpo) -> assertThat(cuerpo).as("respuesta del caso " + caso).isEqualTo(esperada));
    }

    @Test
    @DisplayName("también idéntica al invitar un CAJERO (otro camino del controller)")
    void respuestaIdenticaCajero() throws Exception {
        cuentaConEstado("inv-enum-activa-c@test.cr", Constants.ESTADO_ACTIVO);
        String a = respuesta("inv-enum-no-existe-c@test.cr", "CAJERO");
        String b = respuesta("inv-enum-activa-c@test.cr", "CAJERO");
        assertThat(a).startsWith("200|").contains("Invitación enviada");
        assertThat(b).isEqualTo(a);
    }

    @Test
    @DisplayName("tras invitar (cuenta nueva o existente) el GET del equipo NO incluye al invitado")
    void listadoNoIncluyeInvitados() throws Exception {
        cuentaConEstado("inv-enum-activa2@test.cr", Constants.ESTADO_ACTIVO);
        respuesta("inv-enum-nueva2@test.cr", "LECTOR");
        respuesta("inv-enum-activa2@test.cr", "LECTOR");

        mockMvc.perform(get("/api/empresa/equipo").header("Authorization", tDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.correo == 'inv-enum-nueva2@test.cr')]").doesNotExist())
            .andExpect(jsonPath("$.data[?(@.correo == 'inv-enum-activa2@test.cr')]").doesNotExist())
            .andExpect(jsonPath("$.data[?(@.correo == 'inv-enum-miembro@test.cr')]").exists());
        // y la cuenta nueva ni siquiera existe todavía (si no, el registro público filtraría "correo ya existe")
        assertThat(usuarioRepository.findByCorreo("inv-enum-nueva2@test.cr")).isEmpty();
    }

    @Test
    @DisplayName("los errores de formulario siguen siendo 400")
    void validacionSigue400() throws Exception {
        mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"X\"}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/empresa/equipo").header("Authorization", tDueno)
                .contentType(MediaType.APPLICATION_JSON).content("{\"nombre\":\"X\",\"correo\":\"a@b.cr\",\"rolEnEmpresa\":\"NOPE\"}"))
            .andExpect(status().isBadRequest());
    }
}
