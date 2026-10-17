package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("S6-18 — tablero de comisión por plan (solo admin)")
class AdminComisionPorPlanTest extends BaseIntegrationTest {

    private static final String URL = "/api/admin/finanzas/comision-por-plan";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private WalletTransaccionRepository walletTransaccionRepository;

    private Empresa empresa;
    private String tokenEmp;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Comision Plan Test");
        empresa.setSlug("comision-plan-test");
        empresa.setCorreoEmpresa("comision-plan@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario emp = crearUsuario("empr-comision@test.cr", "Empr Comision", rolEmp);
        emp.setEmpresa(empresa);
        emp = usuarioRepository.saveAndFlush(emp);
        tokenEmp = tokenPara(emp, Constants.ROL_EMPRENDEDOR);

        // Lunes 5-oct-2026 y miércoles 7-oct-2026: misma semana. Otro tipo no cuenta.
        venta(LocalDateTime.of(2026, 10, 5, 10, 0), 10000L, 500L, 300L, WalletTransaccion.CREDITO_VENTA);
        venta(LocalDateTime.of(2026, 10, 7, 18, 0), 4000L, 200L, 120L, WalletTransaccion.CREDITO_VENTA);
        venta(LocalDateTime.of(2026, 10, 7, 19, 0), 9999L, 999L, 999L, WalletTransaccion.AJUSTE_MANUAL);
    }

    @AfterEach
    void tearDown() {
        walletTransaccionRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private void venta(LocalDateTime fecha, long bruto, long saas, long gw, String tipo) {
        WalletTransaccion t = new WalletTransaccion();
        t.setEmpresaId(empresa.getId());
        t.setTipo(tipo);
        t.setMonto(bruto - saas - gw);
        t.setTotalBruto(bruto);
        t.setComisionSaas(saas);
        t.setComisionGw(gw);
        t.setFechaCreacion(fecha);
        walletTransaccionRepository.saveAndFlush(t);
    }

    @Test
    void admin_agrupaPorSemanaYPlan() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2026-10-01").param("hasta", "2026-10-10")
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.filas.length()").value(1))
            .andExpect(jsonPath("$.data.filas[0].semana").value("2026-10-05"))
            .andExpect(jsonPath("$.data.filas[0].plan").value("GRATUITO"))
            .andExpect(jsonPath("$.data.filas[0].ventas").value(2))
            .andExpect(jsonPath("$.data.filas[0].totalBruto").value(14000))
            .andExpect(jsonPath("$.data.filas[0].comisionSaas").value(700))
            .andExpect(jsonPath("$.data.filas[0].comisionPasarela").value(420));
    }

    @Test
    void admin_fueraDeRango_sinFilas() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2026-09-01").param("hasta", "2026-09-30")
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.filas.length()").value(0));
    }

    @Test
    void emprendedor_403() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", tokenEmp)).andExpect(status().isForbidden());
    }

    @Test
    void cliente_403() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", userToken)).andExpect(status().isForbidden());
    }

    @Test
    void anonimo_noAutorizado() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().is4xxClientError());
    }

    @Test
    void rangoInvertido_400() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2026-10-10").param("hasta", "2026-10-01")
                .header("Authorization", adminToken))
            .andExpect(status().isBadRequest());
    }

    @Test
    void rangoMayorA366Dias_400() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2024-01-01").param("hasta", "2026-10-01")
                .header("Authorization", adminToken))
            .andExpect(status().isBadRequest());
    }

    @Test
    void fechaMalFormada_400() throws Exception {
        mockMvc.perform(get(URL).param("desde", "ayer").header("Authorization", adminToken))
            .andExpect(status().isBadRequest());
    }
}
