package com.hotclick.service.billing;

import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AdminBillingMapper — plan, proveedor y comisión")
class AdminBillingMapperTest {

    @Test
    @DisplayName("ONVO gana si hay id real; Stripe mock no cuenta")
    void proveedorOnvoIgnoraStripeMock() {
        Suscripcion sub = new Suscripcion();
        sub.setOnvoSubscriptionId("sub_onvo");
        sub.setStripeSubscriptionId("sub_mock_abc");
        assertThat(AdminBillingMapper.detectarProveedor(sub)).isEqualTo("ONVO");
    }

    @Test
    @DisplayName("Stripe + ONVO reales se marcan AMBOS")
    void proveedorAmbos() {
        Suscripcion sub = new Suscripcion();
        sub.setOnvoSubscriptionId("cus_onvo");
        sub.setStripeSubscriptionId("sub_live");
        assertThat(AdminBillingMapper.detectarProveedor(sub)).isEqualTo("AMBOS");
    }

    @Test
    @DisplayName("Fila toma comisión y precio del plan de la suscripción")
    void filaExponeComisionYPlan() {
        Plan plan = new Plan();
        plan.setNombre("NEGOCIO_PLUS");
        plan.setPrecioMensual(24900);
        plan.setComisionPorcentaje(new BigDecimal("4.00"));

        Empresa e = new Empresa();
        e.setId(8L);
        e.setNombreEmpresa("Legal");
        e.setNombreComercial("Legal CR");
        e.setSlug("legal-cr");
        e.setEstadoPlan("ACTIVO");

        Suscripcion sub = new Suscripcion();
        sub.setPlan(plan);
        sub.setEstado("ACTIVO");
        sub.setOnvoSubscriptionId("sub_1");

        Map<String, Object> fila = AdminBillingMapper.filaLista(e, sub, 0);
        assertThat(fila.get("nombre")).isEqualTo("Legal CR");
        assertThat(fila.get("plan")).isEqualTo("NEGOCIO_PLUS");
        assertThat(fila.get("precioMensual")).isEqualTo(24900);
        assertThat((BigDecimal) fila.get("comisionPorcentaje")).isEqualByComparingTo("4.00");
        assertThat(fila.get("alertaCobro")).isEqualTo(false);
    }

    @Test
    @DisplayName("KPIs cuentan PAST_DUE, alerta, Onvo y Stripe sin doble conteo de lista")
    void kpisDeFilas() {
        Map<String, Object> onvoOk = Map.of(
            "estadoSuscripcion", "ACTIVO", "estadoPlan", "ACTIVO",
            "alertaCobro", false, "proveedor", "ONVO");
        Map<String, Object> stripeAlerta = Map.of(
            "estadoSuscripcion", "PAST_DUE", "estadoPlan", "PAST_DUE",
            "alertaCobro", true, "proveedor", "STRIPE");
        Map<String, Object> ambos = Map.of(
            "estadoSuscripcion", "ACTIVO", "estadoPlan", "ACTIVO",
            "alertaCobro", false, "proveedor", "AMBOS");

        Map<String, Object> kpis = AdminBillingMapper.kpisDeFilas(List.of(onvoOk, stripeAlerta, ambos));
        assertThat(kpis.get("total")).isEqualTo(3);
        assertThat(kpis.get("pastDue")).isEqualTo(1L);
        assertThat(kpis.get("conAlertaCobro")).isEqualTo(1L);
        assertThat(kpis.get("conOnvo")).isEqualTo(2L);
        assertThat(kpis.get("conStripe")).isEqualTo(2L);
    }

    @Test
    @DisplayName("Empresa 1 o slug hotclick es interna de plataforma")
    void empresaPlataforma() {
        Empresa porId = new Empresa();
        porId.setId(1L);
        porId.setSlug("otra");
        Empresa porSlug = new Empresa();
        porSlug.setId(99L);
        porSlug.setSlug("hotclick");
        Empresa tenant = new Empresa();
        tenant.setId(4L);
        tenant.setSlug("cafe");
        assertThat(AdminBillingMapper.esEmpresaPlataforma(porId)).isTrue();
        assertThat(AdminBillingMapper.esEmpresaPlataforma(porSlug)).isTrue();
        assertThat(AdminBillingMapper.esEmpresaPlataforma(tenant)).isFalse();
    }
}
