package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MetodoCobro;
import com.hotclick.model.NegocioOnvoCuenta;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MetodoCobroRepository;
import com.hotclick.repository.NegocioOnvoCuentaRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("S2-29/S3-22 — admin de cuentas ONVO: lista y ficha (IBAN solo enmascarado)")
class AdminOnvoNegociosTest extends BaseIntegrationTest {

    private static final String IBAN = "CR05015202001026284066";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private NegocioOnvoCuentaRepository cuentaRepository;
    @Autowired private MetodoCobroRepository metodoCobroRepository;

    private Empresa conCuenta;
    private Empresa sinCuenta;
    private Empresa pausada;
    private String tokenNegocio;

    @BeforeEach
    void setUp() {
        conCuenta = empresa("Con Cuenta", "aonvo-con");
        sinCuenta = empresa("Sin Cuenta", "aonvo-sin");
        pausada = empresa("Pausada", "aonvo-pausa");
        pausada.setCobrosPausados(true);
        pausada = empresaRepository.saveAndFlush(pausada);

        NegocioOnvoCuenta c = new NegocioOnvoCuenta();
        c.setEmpresaId(conCuenta.getId());
        c.setModo("TEST");
        c.setEstado("EN_REVISION");
        c.setOnvoAccountId("acct_test_123");
        c.setPctComision(new BigDecimal("4.25"));
        c.setFrecuenciaLiquidacion("MENSUAL");
        c.setFrecuenciaPendiente("QUINCENAL");
        cuentaRepository.saveAndFlush(c);

        MetodoCobro iban = new MetodoCobro();
        iban.setEmpresa(conCuenta);
        iban.setTipo(MetodoCobro.TIPO_IBAN);
        iban.setDestino(IBAN);
        iban.setMascara("CR05 **** 4066");
        iban.setPredeterminado(true);
        metodoCobroRepository.saveAndFlush(iban);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario dueno = crearUsuario("aonvo-dueno@test.cr", "Dueño", rolEmp);
        dueno.setEmpresa(conCuenta);
        dueno = usuarioRepository.saveAndFlush(dueno);
        tokenNegocio = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);
    }

    @AfterEach
    void tearDown() {
        metodoCobroRepository.deleteAll();
        cuentaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    void lista_estadosEfectivosYSinIban() throws Exception {
        String r = mockMvc.perform(get("/api/admin/onvo/negocios").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.conciliadoEl").value(nullValue()))
            .andExpect(jsonPath("$.data.negocios[?(@.id == " + conCuenta.getId() + ")].estado", contains("EN_REVISION")))
            .andExpect(jsonPath("$.data.negocios[?(@.id == " + conCuenta.getId() + ")].porcentajeOnvo", contains(4.25)))
            .andExpect(jsonPath("$.data.negocios[?(@.id == " + conCuenta.getId() + ")].conciliacion", contains("SIN_DATOS")))
            .andExpect(jsonPath("$.data.negocios[?(@.id == " + sinCuenta.getId() + ")].estado", contains("SIN_CUENTA")))
            .andExpect(jsonPath("$.data.negocios[?(@.id == " + sinCuenta.getId() + ")].porcentajeOnvo", contains(nullValue())))
            .andExpect(jsonPath("$.data.negocios[?(@.id == " + pausada.getId() + ")].estado", contains("PAUSADA")))
            .andReturn().getResponse().getContentAsString();
        org.assertj.core.api.Assertions.assertThat(r).doesNotContain("4066").doesNotContain("CR05").doesNotContain("acct_test");
    }

    @Test
    void lista_filtroPorEstado() throws Exception {
        mockMvc.perform(get("/api/admin/onvo/negocios").param("estado", "pausada").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.negocios[*].id", contains(pausada.getId().intValue())));
        mockMvc.perform(get("/api/admin/onvo/negocios").param("estado", "SIN_CUENTA").header("Authorization", adminToken))
            .andExpect(jsonPath("$.data.negocios[*].id", hasItem(sinCuenta.getId().intValue())))
            .andExpect(jsonPath("$.data.negocios[*].id", not(hasItem(pausada.getId().intValue()))))
            .andExpect(jsonPath("$.data.negocios[*].id", not(hasItem(conCuenta.getId().intValue()))));
    }

    @Test
    void ficha_ibanSoloEnmascarado() throws Exception {
        String r = mockMvc.perform(get("/api/admin/onvo/negocios/" + conCuenta.getId()).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estado", is("EN_REVISION")))
            .andExpect(jsonPath("$.data.correo", is("aonvo-con@test.cr")))
            .andExpect(jsonPath("$.data.cuentaOnvo", is("acct_test_123")))
            .andExpect(jsonPath("$.data.ibanEnmascarado", is("•••• 4066")))
            .andExpect(jsonPath("$.data.frecuencia", is("MENSUAL")))
            .andExpect(jsonPath("$.data.frecuenciaPendiente", is("QUINCENAL")))
            .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        org.assertj.core.api.Assertions.assertThat(r).doesNotContain(IBAN).doesNotContain("CR05");
        mockMvc.perform(get("/api/admin/onvo/negocios/" + sinCuenta.getId()).header("Authorization", adminToken))
            .andExpect(jsonPath("$.data.ibanEnmascarado").value(nullValue()))
            .andExpect(jsonPath("$.data.frecuencia").value(nullValue()));
    }

    @Test
    void estadoInvalido_400() throws Exception {
        mockMvc.perform(get("/api/admin/onvo/negocios").param("estado", "BORRADO").header("Authorization", adminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code", is("ESTADO_INVALIDO")));
    }

    @Test
    void negocioYComprador_403() throws Exception {
        mockMvc.perform(get("/api/admin/onvo/negocios").header("Authorization", tokenNegocio))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/onvo/negocios/" + conCuenta.getId()).header("Authorization", tokenNegocio))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/onvo/negocios").header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    void inexistente_404() throws Exception {
        mockMvc.perform(get("/api/admin/onvo/negocios/987654321").header("Authorization", adminToken))
            .andExpect(status().isNotFound());
    }

    private Empresa empresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }
}
