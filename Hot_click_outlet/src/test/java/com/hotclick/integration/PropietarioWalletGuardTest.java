package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("P9-04 / P10-02 | reset-datos y retiros solo del PROPIETARIO")
class PropietarioWalletGuardTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;
    @Autowired private CodigoOtpRepository codigoOtpRepository;
    @Autowired private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

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
        codigoOtpRepository.deleteAll();
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
        // (c) sin contraseña o con contraseña mala no borra
        mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", tokenDueno))
            .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", tokenDueno)
                .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"mala\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.data.codigo").value("PASSWORD_INCORRECTA"));
        int reset = mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", tokenDueno)
                .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"Test1234!\"}"))
            .andReturn().getResponse().getStatus();
        assertThat(reset).isNotEqualTo(403).isNotEqualTo(400);
    }

    @Test
    void cuentaSsoConfirmaConCodigoDelCorreo() throws Exception {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario u = crearUsuario("p904-sso@test.cr", "SSO", rolEmp);
        u.setEmpresa(emp);
        u.setClerkUserId("user_sso904");
        u.setCorreoVerificado(true);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, "PROPIETARIO"));
        String token = "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());

        mockMvc.perform(get("/api/admin/reset-confirmacion").header("Authorization", token))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.metodo").value("CODIGO"));
        mockMvc.perform(get("/api/admin/reset-confirmacion").header("Authorization", tokenDueno))
            .andExpect(jsonPath("$.data.metodo").value("PASSWORD"));
        // Base dev vacía con baseline posterior a V171_1: el tipo RESET_DATOS no existe y se crea solo.
        jdbcTemplate.update("DELETE FROM hot_click_codigo_otp_tb WHERE fk_id_tipo_otp IN "
            + "(SELECT id_tipo_otp FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_DATOS')");
        jdbcTemplate.update("DELETE FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_DATOS'");
        mockMvc.perform(post("/api/admin/reset-codigo").header("Authorization", token)).andExpect(status().isOk());
        assertThat(jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hot_click_tipo_otp_tb WHERE nombre = 'RESET_DATOS'", Integer.class)).isEqualTo(1);

        // El código llega por correo (hasheado en BD): para el test se fija uno conocido.
        Long uid = u.getId();
        CodigoOtp otp = codigoOtpRepository.findAll().stream()
            .filter(o -> uid.equals(o.getUsuario().getId())).reduce((a, b) -> b).orElseThrow();
        otp.setCodigoHash(passwordEncoder.encode("123456"));
        codigoOtpRepository.saveAndFlush(otp);

        mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"codigo\":\"000000\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.data.codigo").value("CODIGO_INCORRECTO"));
        int reset = mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"codigo\":\"123456\"}"))
            .andReturn().getResponse().getStatus();
        assertThat(reset).isNotEqualTo(403).isNotEqualTo(400);
        // un solo uso
        mockMvc.perform(post("/api/admin/reset-datos").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"codigo\":\"123456\"}"))
            .andExpect(status().isBadRequest());
    }
}
