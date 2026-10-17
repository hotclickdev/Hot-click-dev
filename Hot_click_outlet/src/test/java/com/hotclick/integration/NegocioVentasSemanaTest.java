package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Usuario;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PlanRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("S4-23 — ventas de la semana del negocio")
class NegocioVentasSemanaTest extends BaseIntegrationTest {

    private static final String URL = "/api/negocio/ventas/semana";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private WalletTransaccionRepository ledger;

    private Empresa empresa;
    private Empresa otra;
    private String token;

    @BeforeEach
    void setUp() {
        Plan plan = new Plan();
        plan.setNombre("Plan Ventas Test");
        plan.setComisionPorcentaje(new BigDecimal("5.00"));
        plan.setComisionMinimaCrc(700);
        plan = planRepository.saveAndFlush(plan);
        empresa = empresa("ventas-a", plan);
        otra = empresa("ventas-b", null);
        Usuario u = crearUsuario("ventas-v@test.cr", "V", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setEmpresa(empresa);
        u = usuarioRepository.saveAndFlush(u);
        token = tokenPara(u, Constants.ROL_EMPRENDEDOR);

        venta(empresa, LocalDateTime.of(2026, 10, 12, 9, 0), 20000, 1000, 0);   // 5 % = 1000
        venta(empresa, LocalDateTime.of(2026, 10, 14, 9, 0), 4000, 700, 100);   // 5 % = 200 < 700 → mínimo
        venta(empresa, LocalDateTime.of(2026, 10, 19, 9, 0), 9999, 500, 0);     // otra semana
        venta(otra, LocalDateTime.of(2026, 10, 13, 9, 0), 50000, 2500, 0);      // otro negocio
    }

    @AfterEach
    void tearDown() {
        ledger.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
        planRepository.findAll().stream().filter(p -> "Plan Ventas Test".equals(p.getNombre())).forEach(planRepository::delete);
    }

    private Empresa empresa(String slug, Plan plan) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e.setPlan(plan);
        return empresaRepository.saveAndFlush(e);
    }

    private void venta(Empresa e, LocalDateTime fecha, long bruto, long saas, long gw) {
        WalletTransaccion t = new WalletTransaccion();
        t.setEmpresaId(e.getId());
        t.setTipo(WalletTransaccion.CREDITO_VENTA);
        t.setMonto(bruto - saas - gw);
        t.setTotalBruto(bruto);
        t.setComisionSaas(saas);
        t.setComisionGw(gw);
        t.setDescripcion("Venta");
        t.setFechaCreacion(fecha);
        ledger.saveAndFlush(t);
    }

    @Test
    void semanaDelNegocio_soloSusVentas() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2026-10-15").header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.desde").value("2026-10-12"))
            .andExpect(jsonPath("$.data.hasta").value("2026-10-18"))
            .andExpect(jsonPath("$.data.porcentaje").value(5.0))
            .andExpect(jsonPath("$.data.minimoComision").value(700))
            .andExpect(jsonPath("$.data.ventas.length()").value(2))
            .andExpect(jsonPath("$.data.ventas[1].minimoAplicado").value(true))
            .andExpect(jsonPath("$.data.ventas[1].comision").value(800))
            .andExpect(jsonPath("$.data.totales.bruto").value(24000))
            .andExpect(jsonPath("$.data.totales.comision").value(1800))
            .andExpect(jsonPath("$.data.totales.neto").value(22200))
            .andExpect(jsonPath("$.data.totales.conMinimo").value(1))
            .andExpect(jsonPath("$.data.totales.cantidad").value(2));
    }

    @Test
    void empresaIdAjenoEnQuery_seIgnora() throws Exception {
        mockMvc.perform(get(URL).param("desde", "2026-10-12").param("empresaId", otra.getId().toString())
                .header("Authorization", token))
            .andExpect(jsonPath("$.data.totales.bruto").value(24000));
    }

    @Test
    void comprador_403() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", userToken)).andExpect(status().isForbidden());
    }

    @Test
    void fechaMalFormada_400() throws Exception {
        mockMvc.perform(get(URL).param("desde", "lunes").header("Authorization", token)).andExpect(status().isBadRequest());
    }
}
