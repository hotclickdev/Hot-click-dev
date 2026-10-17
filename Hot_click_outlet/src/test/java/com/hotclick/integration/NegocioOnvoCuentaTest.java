package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.NegocioOnvoCuenta;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.NegocioOnvoCuentaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("S3-06/S3-11/S3-15 — cuenta ONVO del negocio y frecuencia de liquidación")
class NegocioOnvoCuentaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private NegocioOnvoCuentaRepository cuentaRepository;

    private Empresa empresa;
    private String tokenDueno;
    private String tokenPersonal;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Onvo Cuenta Test");
        empresa.setSlug("onvo-cuenta-test");
        empresa.setCorreoEmpresa("onvo-cuenta@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario dueno = crearUsuario("onvo-dueno@test.cr", "Dueño", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        tokenDueno = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);

        Usuario personal = crearUsuario("onvo-personal@test.cr", "Personal", rolEmp);
        personal.setEmpresa(empresa);
        personal = usuarioRepository.saveAndFlush(personal);
        MiembroEmpresa m = new MiembroEmpresa();
        m.setUsuario(personal);
        m.setEmpresa(empresa);
        m.setRolEnEmpresa("VENDEDOR");
        m.setEstado(1);
        m.setFechaIngreso(LocalDateTime.now());
        miembroEmpresaRepository.saveAndFlush(m);
        tokenPersonal = tokenPara(personal, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void tearDown() {
        cuentaRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private org.springframework.test.web.servlet.ResultActions cambiar(String token, String json) throws Exception {
        return mockMvc.perform(put("/api/negocio/onvo/frecuencia").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(json));
    }

    @Test
    void sinCuenta_estadoSinCuentaYFrecuenciaNula() throws Exception {
        mockMvc.perform(get("/api/negocio/onvo/estado").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estado").value("SIN_CUENTA"))
            .andExpect(jsonPath("$.data.frecuencia").doesNotExist());
        mockMvc.perform(get("/api/negocio/onvo/frecuencia").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.actual").doesNotExist())
            .andExpect(jsonPath("$.data.pendiente").doesNotExist());
    }

    @Test
    void sinCuentaOnvo_laEleccionQuedaVigente() throws Exception {
        cambiar(tokenDueno, "{\"frecuencia\":\"mensual\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.actual").value("MENSUAL"))
            .andExpect(jsonPath("$.data.pendiente").doesNotExist());
        NegocioOnvoCuenta c = cuentaRepository.findAll().get(0);
        assertThat(c.getPctComision()).isNull();
        assertThat(c.getTarifaSemanalCrc()).isNull();
        assertThat(c.getModo()).isEqualTo("TEST");
    }

    @Test
    void conCuentaOnvo_elCambioQuedaPendienteParaElAdmin() throws Exception {
        cambiar(tokenDueno, "{\"frecuencia\":\"QUINCENAL\"}").andExpect(status().isOk());
        NegocioOnvoCuenta c = cuentaRepository.findAll().get(0);
        c.setOnvoAccountId("acc_test_1");
        cuentaRepository.saveAndFlush(c);

        cambiar(tokenDueno, "{\"frecuencia\":\"MENSUAL\"}")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.actual").value("QUINCENAL"))
            .andExpect(jsonPath("$.data.pendiente").value("MENSUAL"));
        cambiar(tokenDueno, "{\"frecuencia\":\"QUINCENAL\"}")
            .andExpect(jsonPath("$.data.pendiente").doesNotExist());
    }

    @Test
    void cobrosPausadosPorHotClick_estadoPausada() throws Exception {
        empresa.setCobrosPausados(true);
        empresaRepository.saveAndFlush(empresa);
        mockMvc.perform(get("/api/negocio/onvo/estado").header("Authorization", tokenDueno))
            .andExpect(jsonPath("$.data.estado").value("PAUSADA"));
    }

    @Test
    void pausadaEl_timestamptz_seDevuelveEnHoraDeCostaRica() throws Exception {
        empresa.setCobrosPausados(true);
        empresa.setCobrosPausadosEl(java.time.OffsetDateTime.parse("2026-10-17T02:10:00Z"));
        empresaRepository.saveAndFlush(empresa);
        mockMvc.perform(get("/api/negocio/onvo/estado").header("Authorization", tokenDueno))
            .andExpect(jsonPath("$.data.pausadaEl").value("2026-10-16T20:10-06:00"));
        assertThat(empresaRepository.findById(empresa.getId()).orElseThrow().getCobrosPausadosEl().toInstant())
            .isEqualTo(java.time.Instant.parse("2026-10-17T02:10:00Z"));
    }

    @Test
    void frecuenciaInvalida_400() throws Exception {
        cambiar(tokenDueno, "{\"frecuencia\":\"SEMANAL\"}").andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("FRECUENCIA_INVALIDA"));
        cambiar(tokenDueno, "{}").andExpect(status().isBadRequest());
    }

    @Test
    void frecuenciaObligatoria_sinDefault_400() throws Exception {
        for (String body : new String[]{"{}", "{\"frecuencia\":null}", "{\"frecuencia\":\"\"}",
                "{\"frecuencia\":\"  \"}", "{\"frecuencia\":1}", "{\"frecuencia\":[\"MENSUAL\"]}"}) {
            cambiar(tokenDueno, body).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.code").value("FRECUENCIA_INVALIDA"));
        }
        mockMvc.perform(put("/api/negocio/onvo/frecuencia").header("Authorization", tokenDueno))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("FRECUENCIA_INVALIDA"));
        // Nada se guardó: sin elección la frecuencia sigue en null (no hay valor por defecto).
        mockMvc.perform(get("/api/negocio/onvo/frecuencia").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.actual").doesNotExist())
            .andExpect(jsonPath("$.data.pendiente").doesNotExist());
        org.junit.jupiter.api.Assertions.assertTrue(
            cuentaRepository.count() == 0, "una frecuencia inválida no debe crear la cuenta");
    }

    @Test
    void exigirFrecuencia_normaliza() {
        org.junit.jupiter.api.Assertions.assertEquals("MENSUAL",
            com.hotclick.service.onvo.CuentaOnvoNegocioService.exigirFrecuencia(" mensual "));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
            () -> com.hotclick.service.onvo.CuentaOnvoNegocioService.exigirFrecuencia(null));
    }

    @Test
    void personalDelNegocio_403() throws Exception {
        mockMvc.perform(get("/api/negocio/onvo/estado").header("Authorization", tokenPersonal))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("SOLO_PROPIETARIO"));
        mockMvc.perform(get("/api/empresa/onvo/frecuencia").header("Authorization", tokenPersonal))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("SOLO_PROPIETARIO"));
        cambiar(tokenPersonal, "{\"frecuencia\":\"MENSUAL\"}").andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("SOLO_PROPIETARIO"));
    }

    @Test
    void comprador_403() throws Exception {
        mockMvc.perform(get("/api/negocio/onvo/frecuencia").header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void respuestaSinIbanNiOnboarding() throws Exception {
        String r = mockMvc.perform(get("/api/negocio/onvo/estado").header("Authorization", tokenDueno))
            .andReturn().getResponse().getContentAsString();
        assertThat(r.toLowerCase()).doesNotContain("iban").doesNotContain("onboarding").doesNotContain("acc_");
    }

    @Test
    void adminPausaConMotivo_elNegocioLoVe() throws Exception {
        mockMvc.perform(put("/api/admin/empresas/" + empresa.getId() + "/cobros-pausados").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cobrosPausados\":true,\"motivo\":\"Revisión de documentos\"}"))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/negocio/onvo/estado").header("Authorization", tokenDueno))
            .andExpect(jsonPath("$.data.estado").value("PAUSADA"))
            .andExpect(jsonPath("$.data.motivoPausa").value("Revisión de documentos"))
            .andExpect(jsonPath("$.data.pausadaEl").isString());
    }

    @Test
    void motivoMuyCorto_400_yVendedorNoPuedePausar_403() throws Exception {
        mockMvc.perform(put("/api/admin/empresas/" + empresa.getId() + "/cobros-pausados").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cobrosPausados\":true,\"motivo\":\"x\"}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(put("/api/admin/empresas/" + empresa.getId() + "/cobros-pausados").header("Authorization", tokenDueno)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cobrosPausados\":false}"))
            .andExpect(status().isForbidden());
    }

    @Test
    void rutaUnificadaEmpresa_mismoContrato() throws Exception {
        mockMvc.perform(get("/api/empresa/onvo/estado").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estado").value("SIN_CUENTA"));
        mockMvc.perform(get("/api/empresa/onvo/estado").header("Authorization", tokenPersonal))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Alta sin frecuencia de pago: queda en null, nunca QUINCENAL silencioso")
    void altaSinFrecuencia_noQuedaEnQuincenal() {
        Empresa recargada = empresaRepository.findById(empresa.getId()).orElseThrow();
        assertThat(recargada.getFrecuenciaPayout()).isNull();
    }
}
