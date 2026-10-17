package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.NegocioOnvoCuenta;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.NegocioOnvoCuentaRepository;
import com.hotclick.service.onvo.OnvoMarketplaceClient;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** S3-07 / S3-08 con el cliente ONVO simulado en el test (el real necesita las llaves sandbox, S2-01). */
@DisplayName("S3-07/S3-08 — activar cuenta ONVO, enlace y reenvío (cliente mockeado)")
class OnvoOnboardingNegocioTest extends BaseIntegrationTest {

    @MockitoBean private OnvoMarketplaceClient onvo;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private NegocioOnvoCuentaRepository cuentaRepository;

    private Empresa empresa;
    private String tokenDueno;
    private String tokenPersonal;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Onboarding SA");
        empresa.setNombreComercial("Onboarding");
        empresa.setSlug("onvo-onboarding");
        empresa.setCorreoEmpresa("onvo-onboarding@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario dueno = crearUsuario("onb-dueno@test.cr", "Dueño", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        tokenDueno = tokenPara(dueno, Constants.ROL_EMPRENDEDOR);
        Usuario personal = crearUsuario("onb-personal@test.cr", "Personal", rolEmp);
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
        when(onvo.configurado()).thenReturn(true);
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

    @Test
    void activar_creaCuentaYDevuelveUrl_luego409() throws Exception {
        when(onvo.crearCuenta(anyLong(), anyString(), anyString()))
            .thenReturn(new OnvoMarketplaceClient.CuentaCreada("acct_123", "https://onboarding.onvopay.com/x"));
        mockMvc.perform(post("/api/negocio/onvo/activar").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.url", is("https://onboarding.onvopay.com/x")));
        NegocioOnvoCuenta c = cuentaRepository.findByEmpresaIdAndProveedorAndModo(empresa.getId(), "ONVO", "TEST").orElseThrow();
        assertThat(c.getOnvoAccountId()).isEqualTo("acct_123");
        assertThat(c.getEstado()).isEqualTo("ONBOARDING_PENDIENTE");

        mockMvc.perform(post("/api/empresa/onvo/activar").header("Authorization", tokenDueno))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("CUENTA_YA_EXISTE")));
    }

    @Test
    void enlaceYReenvio_conCuenta() throws Exception {
        cuenta("acct_9");
        when(onvo.enlaceOnboarding("acct_9")).thenReturn("https://onboarding.onvopay.com/y");
        mockMvc.perform(post("/api/negocio/onvo/enlace").header("Authorization", tokenDueno))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.url", is("https://onboarding.onvopay.com/y")));
        mockMvc.perform(post("/api/negocio/onvo/reenviar-enlace").header("Authorization", tokenDueno))
            .andExpect(status().isNoContent());
        verify(onvo).reenviarEnlace("acct_9");
    }

    @Test
    void enlaceSinCuenta_409() throws Exception {
        mockMvc.perform(post("/api/negocio/onvo/enlace").header("Authorization", tokenDueno))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SIN_CUENTA_ONVO")));
        mockMvc.perform(post("/api/negocio/onvo/reenviar-enlace").header("Authorization", tokenDueno))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code", is("SIN_CUENTA_ONVO")));
    }

    @Test
    void urlNoHttps_503_yNoGuardaCuenta() throws Exception {
        when(onvo.crearCuenta(anyLong(), anyString(), anyString()))
            .thenReturn(new OnvoMarketplaceClient.CuentaCreada("acct_x", "http://inseguro"));
        mockMvc.perform(post("/api/negocio/onvo/activar").header("Authorization", tokenDueno))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.code", is("ONVO_NO_CONFIGURADO")));
        assertThat(cuentaRepository.findByEmpresaIdAndProveedorAndModo(empresa.getId(), "ONVO", "TEST")).isEmpty();
    }

    @Test
    void noConfigurado_503() throws Exception {
        when(onvo.configurado()).thenReturn(false);
        mockMvc.perform(post("/api/negocio/onvo/activar").header("Authorization", tokenDueno))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.code", is("ONVO_NO_CONFIGURADO")));
        verify(onvo, never()).crearCuenta(anyLong(), any(), any());
    }

    @Test
    void personal_403_soloPropietario() throws Exception {
        for (String ruta : new String[]{"/activar", "/enlace", "/reenviar-enlace"}) {
            mockMvc.perform(post("/api/negocio/onvo" + ruta).header("Authorization", tokenPersonal))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("SOLO_PROPIETARIO")));
        }
        mockMvc.perform(post("/api/negocio/onvo/activar").header("Authorization", userToken))
            .andExpect(status().isForbidden());
        verify(onvo, never()).crearCuenta(anyLong(), any(), any());
    }

    private void cuenta(String accountId) {
        NegocioOnvoCuenta c = new NegocioOnvoCuenta();
        c.setEmpresaId(empresa.getId());
        c.setModo("TEST");
        c.setEstado("ONBOARDING_PENDIENTE");
        c.setOnvoAccountId(accountId);
        cuentaRepository.saveAndFlush(c);
    }
}
