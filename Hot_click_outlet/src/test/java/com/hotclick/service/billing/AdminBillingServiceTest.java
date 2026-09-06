package com.hotclick.service.billing;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.BillingLedgerRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaSaasRepository;
import com.hotclick.repository.SuscripcionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminBillingService — agregación de consola")
class AdminBillingServiceTest {

    @Mock EmpresaRepository empresaRepo;
    @Mock SuscripcionRepository suscripcionRepo;
    @Mock FacturaSaasRepository facturaRepo;
    @Mock BillingLedgerRepository ledgerRepo;

    @InjectMocks AdminBillingService service;

    @Test
    @DisplayName("Suma fallos de factura y ledger y no recorre empresas en N+1")
    void agregaFallosSinNPlusUno() {
        Empresa tienda = tenant(10L, "Café Luz", "cafe-luz");
        Empresa interna = tenant(1L, "HOTCLICK", "hotclick");
        when(empresaRepo.findAllWithPlanOrderByFechaRegistroDesc()).thenReturn(List.of(interna, tienda));

        Suscripcion sub = vigente(tienda, "ACTIVO", "sub_onvo_1", null);
        when(suscripcionRepo.findVigentesConPlanYEmpresa()).thenReturn(List.of(sub));
        when(facturaRepo.countPorEmpresaAndEstado("FALLIDO"))
            .thenReturn(Collections.singletonList(new Object[]{10L, 2L}));
        when(ledgerRepo.countPorEmpresaAndTipo(BillingLedger.TIPO_COBRO_FALLIDO))
            .thenReturn(Collections.singletonList(new Object[]{10L, 1L}));

        Map<String, Object> out = service.listarConsola(0, 100);

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> filas = (List<Map<String, Object>>) out.get("empresas");
        assertThat(filas).hasSize(1);
        assertThat(filas.get(0).get("empresaId")).isEqualTo(10L);
        assertThat(filas.get(0).get("plan")).isEqualTo("PYME");
        assertThat(filas.get(0).get("proveedor")).isEqualTo("ONVO");
        assertThat(filas.get(0).get("fallosCobro")).isEqualTo(3L);
        assertThat(filas.get(0).get("alertaCobro")).isEqualTo(true);
        assertThat((BigDecimal) filas.get(0).get("comisionPorcentaje")).isEqualByComparingTo("4.00");

        @SuppressWarnings("unchecked")
        Map<String, Object> kpis = (Map<String, Object>) out.get("kpis");
        assertThat(kpis.get("total")).isEqualTo(1);
        assertThat(kpis.get("conAlertaCobro")).isEqualTo(1L);
        assertThat(kpis.get("conOnvo")).isEqualTo(1L);

        verify(empresaRepo, times(1)).findAllWithPlanOrderByFechaRegistroDesc();
        verify(suscripcionRepo, times(1)).findVigentesConPlanYEmpresa();
        verify(facturaRepo, times(1)).countPorEmpresaAndEstado("FALLIDO");
        verify(ledgerRepo, times(1)).countPorEmpresaAndTipo(BillingLedger.TIPO_COBRO_FALLIDO);
        verify(facturaRepo, times(0)).countByEmpresaIdAndEstado(any(), any());
    }

    @Test
    @DisplayName("PAST_DUE sin fallos igual dispara alerta y KPI")
    void pastDueSinFallosAlerta() {
        Empresa tienda = tenant(22L, "Taller Norte", "taller-norte");
        tienda.setEstadoPlan("PAST_DUE");
        when(empresaRepo.findAllWithPlanOrderByFechaRegistroDesc()).thenReturn(List.of(tienda));
        when(suscripcionRepo.findVigentesConPlanYEmpresa())
            .thenReturn(List.of(vigente(tienda, "PAST_DUE", null, "sub_live_1")));
        when(facturaRepo.countPorEmpresaAndEstado("FALLIDO")).thenReturn(List.of());
        when(ledgerRepo.countPorEmpresaAndTipo(BillingLedger.TIPO_COBRO_FALLIDO)).thenReturn(List.of());

        Map<String, Object> out = service.listarConsola(0, 100);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> filas = (List<Map<String, Object>>) out.get("empresas");
        assertThat(filas.get(0).get("alertaCobro")).isEqualTo(true);
        assertThat(filas.get(0).get("proveedor")).isEqualTo("STRIPE");
        @SuppressWarnings("unchecked")
        Map<String, Object> kpis = (Map<String, Object>) out.get("kpis");
        assertThat(kpis.get("pastDue")).isEqualTo(1L);
        assertThat(kpis.get("conStripe")).isEqualTo(1L);
    }

    @Test
    @DisplayName("Detalle oculta la empresa interna de plataforma")
    void detalleRechazaEmpresaPlataforma() {
        Empresa interna = tenant(1L, "HOTCLICK", "hotclick");
        when(empresaRepo.findByIdWithPlan(1L)).thenReturn(Optional.of(interna));

        assertThatThrownBy(() -> service.detalleEmpresa(1L))
            .isInstanceOf(RecursoNoEncontradoException.class)
            .hasMessageContaining("plataforma");
    }

    @Test
    @DisplayName("Detalle junta suscripción, facturas y ledger")
    void detalleArmaPayload() {
        Empresa tienda = tenant(10L, "Café Luz", "cafe-luz");
        Suscripcion sub = vigente(tienda, "ACTIVO", "sub_onvo_1", null);
        when(empresaRepo.findByIdWithPlan(10L)).thenReturn(Optional.of(tienda));
        when(suscripcionRepo.findActivaByEmpresaId(10L)).thenReturn(Optional.of(sub));
        when(facturaRepo.countByEmpresaIdAndEstado(10L, "FALLIDO")).thenReturn(0L);
        when(ledgerRepo.countByEmpresaIdAndTipo(10L, BillingLedger.TIPO_COBRO_FALLIDO)).thenReturn(0L);
        when(facturaRepo.findByEmpresaIdOrderByFechaCreacionDesc(eq(10L), any(PageRequest.class)))
            .thenReturn(new PageImpl<>(List.of()));
        when(ledgerRepo.findByEmpresaIdOrderByFechaEventoDesc(eq(10L), any(PageRequest.class)))
            .thenReturn(List.of());

        Map<String, Object> out = service.detalleEmpresa(10L);

        @SuppressWarnings("unchecked")
        Map<String, Object> empresa = (Map<String, Object>) out.get("empresa");
        assertThat(empresa.get("nombre")).isEqualTo("Café Luz");
        @SuppressWarnings("unchecked")
        Map<String, Object> suscripcion = (Map<String, Object>) out.get("suscripcion");
        assertThat(suscripcion.get("proveedor")).isEqualTo("ONVO");
        assertThat(suscripcion.get("onvoSubscriptionId")).isEqualTo("sub_onvo_1");
        assertThat(out).containsKeys("facturas", "ledger");
    }

    private static Empresa tenant(long id, String nombre, String slug) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setNombreEmpresa(nombre);
        e.setNombreComercial(nombre);
        e.setSlug(slug);
        e.setEstadoEmpresa("ACTIVO");
        e.setEstadoPlan("ACTIVO");
        Plan plan = new Plan();
        plan.setId(2L);
        plan.setNombre("PYME");
        plan.setPrecioMensual(9900);
        plan.setComisionPorcentaje(new BigDecimal("4.00"));
        e.setPlan(plan);
        return e;
    }

    private static Suscripcion vigente(Empresa empresa, String estado, String onvo, String stripe) {
        Suscripcion s = new Suscripcion();
        s.setEmpresa(empresa);
        s.setPlan(empresa.getPlan());
        s.setEstado(estado);
        s.setOnvoSubscriptionId(onvo);
        s.setStripeSubscriptionId(stripe);
        return s;
    }
}
