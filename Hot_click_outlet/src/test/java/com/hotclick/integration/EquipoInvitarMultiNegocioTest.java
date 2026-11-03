package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguridad (multi-negocio): el controller bloqueaba y contaba el cupo con la empresa del token
 * (getCurrentEmpresaIdOrOwn) pero daba de alta al miembro en usuario.empresa. Un dueño con dos negocios que
 * cambiaba a B e invitaba metía al miembro en A, con el límite evaluado contra B. Ahora la empresa destino se
 * resuelve una sola vez y se usa para el permiso, el lock, el conteo y el alta.
 */
@DisplayName("Equipo — invitar con dos negocios: el miembro entra en la empresa del token y el cupo se evalúa ahí")
class EquipoInvitarMultiNegocioTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PlanRepository planRepository;

    private final List<Long> planes = new ArrayList<>();

    @AfterEach
    void limpiar() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        planes.forEach(planRepository::deleteById);
    }

    private Empresa empresa(String slug, int maxUsuarios) {
        Plan p = new Plan();
        p.setNombre("MN_" + slug + "_" + System.nanoTime());
        p.setMaxUsuarios(maxUsuarios);
        p = planRepository.saveAndFlush(p);
        planes.add(p.getId());
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        e.setPlan(p);
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario emprendedor(String correo, Empresa propia) {
        Rol rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario u = crearUsuario(correo, "Dueno", rol);
        u.setEmpresa(propia);
        return usuarioRepository.saveAndFlush(u);
    }

    private String tokenEn(Usuario u, Empresa e) {
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, e.getId(), e.getSlug());
    }

    private static final String BODY = "{\"nombre\":\"Nueva Persona Prueba\",\"correo\":\"mn-nuevo@test.cr\","
        + "\"password\":\"Pass1234!\",\"telefono\":\"88001122\",\"rolEnEmpresa\":\"LECTOR\"}";

    @Test
    @DisplayName("dueño de A y B con el token en B: el miembro entra en B (con cupo) y no en A (llena)")
    void miembroEntraEnLaEmpresaDelToken() throws Exception {
        Empresa a = empresa("mn-a", 1);   // A ya está llena con su dueño (1/1)
        Empresa b = empresa("mn-b", 5);
        Usuario dueno = emprendedor("mn-dueno@test.cr", a);   // su empresa "propia" (usuario.empresa) es A
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, a, "PROPIETARIO"));
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, b, "PROPIETARIO"));

        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEn(dueno, b))
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
            .andExpect(status().isOk());

        Usuario nuevo = usuarioRepository.findByCorreo("mn-nuevo@test.cr").orElseThrow();
        assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(nuevo.getId(), b.getId())).isPresent();
        assertThat(miembroEmpresaRepository.findByUsuarioIdAndEmpresaId(nuevo.getId(), a.getId())).isEmpty();
        assertThat(nuevo.getEmpresa().getId()).isEqualTo(b.getId());
    }

    @Test
    @DisplayName("con el token en B llena (1/1) se rechaza por límite aunque A tenga cupo, y no se crea nada")
    void limiteSeEvaluaContraLaEmpresaDelToken() throws Exception {
        Empresa a = empresa("mn-a2", 5);
        Empresa b = empresa("mn-b2", 1);   // B llena con su dueño
        Usuario dueno = emprendedor("mn-dueno2@test.cr", a);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, a, "PROPIETARIO"));
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, b, "PROPIETARIO"));

        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEn(dueno, b))
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
            .andExpect(status().is4xxClientError());

        assertThat(usuarioRepository.findByCorreo("mn-nuevo@test.cr")).isEmpty();
    }

    @Test
    @DisplayName("token con la empresa B donde el usuario es solo EDITOR: 403 y no se crea nada")
    void sinPermisoSobreLaEmpresaDelToken() throws Exception {
        Empresa a = empresa("mn-a3", 5);
        Empresa b = empresa("mn-b3", 5);
        Usuario dueno = emprendedor("mn-dueno3@test.cr", a);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, a, "PROPIETARIO"));
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(dueno, b, "EDITOR"));

        mockMvc.perform(post("/api/empresa/equipo")
                .header("Authorization", tokenEn(dueno, b))
                .contentType(MediaType.APPLICATION_JSON)
                .content(BODY))
            .andExpect(status().isForbidden());

        assertThat(usuarioRepository.findByCorreo("mn-nuevo@test.cr")).isEmpty();
    }
}
