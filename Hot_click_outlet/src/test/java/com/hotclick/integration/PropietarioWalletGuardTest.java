package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("P9-04 / P10-02 | reset-datos y retiros solo del PROPIETARIO")
class PropietarioWalletGuardTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    private Empresa emp;
    private String tokenDueno, tokenLector, tokenEditor;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("P904"); e.setNombreComercial("P904"); e.setSlug("p904");
        e.setCorreoEmpresa("p904@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(e);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenDueno = miembro("p904-dueno@test.cr", "PROPIETARIO", rolEmp);
        tokenLector = miembro("p904-lector@test.cr", "LECTOR", rolEmp);
        tokenEditor = miembro("p904-editor@test.cr", "EDITOR", rolEmp);
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private String miembro(String correo, String rolEquipo, Rol rol) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    @Test
    void lectorYEditorNoBorranNiRetiran() throws Exception {
        String payout = "{\"monto\":1000,\"metodo\":\"SINPE\",\"destinoSinpe\":\"88888888\",\"nombreTitular\":\"X\"}";
        for (String t : new String[]{tokenLector, tokenEditor}) {
            mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", t)).andExpect(status().isForbidden());
            mockMvc.perform(post("/api/wallet/payout").header("Authorization", t)
                .contentType(MediaType.APPLICATION_JSON).content(payout)).andExpect(status().isForbidden());
        }
        int st = mockMvc.perform(post("/api/wallet/payout").header("Authorization", tokenDueno)
            .contentType(MediaType.APPLICATION_JSON).content(payout)).andReturn().getResponse().getStatus();
        assertThat(st).as("el propietario pasa el guard").isNotEqualTo(403);
        // En H2 falta alguna tabla del borrado (BadSqlGrammar); acá solo importa que el guard deja pasar.
        int reset = mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", tokenDueno))
            .andReturn().getResponse().getStatus();
        assertThat(reset).isNotEqualTo(403);
    }
}
