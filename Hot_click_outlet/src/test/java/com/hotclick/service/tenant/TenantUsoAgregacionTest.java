package com.hotclick.service.tenant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("TenantUsoAgregacion")
class TenantUsoAgregacionTest {

    @Test
    void pctCuota_limites() {
        assertThat(TenantUsoAgregacion.pctCuota(0, 100)).isZero();
        assertThat(TenantUsoAgregacion.pctCuota(50, 100)).isEqualTo(50);
        assertThat(TenantUsoAgregacion.pctCuota(100, 100)).isEqualTo(100);
        assertThat(TenantUsoAgregacion.pctCuota(150, 100)).isEqualTo(100);
        assertThat(TenantUsoAgregacion.pctCuota(10, 0)).isZero();
        assertThat(TenantUsoAgregacion.pctCuota(10, -1)).isZero();
    }

    @Test
    void costoUsd_preciosHaiku() {
        assertThat(TenantUsoAgregacion.costoUsd(1_000_000, 1_000_000))
            .isEqualTo(4.80, org.assertj.core.data.Offset.offset(0.0001));
        assertThat(TenantUsoAgregacion.redondearCostoUsd(0.123456)).isEqualTo(0.1235);
    }

    @Test
    void resolverLimite_planYLegacy() {
        assertThat(TenantUsoAgregacion.resolverLimite(null, "ADMIN")).isEqualTo(-1);
        assertThat(TenantUsoAgregacion.resolverLimite(200, "PYME")).isEqualTo(200);
        assertThat(TenantUsoAgregacion.resolverLimite(null, "ENTERPRISE")).isEqualTo(500);
        assertThat(TenantUsoAgregacion.resolverLimite(null, "PRO")).isEqualTo(50);
        assertThat(TenantUsoAgregacion.resolverLimite(null, "EMPRENDEDOR")).isZero();
        assertThat(TenantUsoAgregacion.resolverLimite(null, null)).isZero();
    }

    @Test
    void filaUso_agregaDerivados() {
        Map<String, Object> f = TenantUsoAgregacion.filaUso(
            2L, "Café CR", "cafe-cr", "ACTIVO", "PYME",
            150_000L, 12L, 40_000L, 3L,
            80L, 1000L, 500L, 100,
            25L, 40L
        );
        assertThat(f.get("tokensMes")).isEqualTo(1500L);
        assertThat(f.get("pctCuotaAi")).isEqualTo(80);
        assertThat(f.get("gmv")).isEqualTo(150_000L);
        assertThat(f.get("imagenes")).isEqualTo(40L);
        assertThat(TenantUsoAgregacion.esEmpresaPlataforma(1L)).isTrue();
        assertThat(TenantUsoAgregacion.esEmpresaPlataforma(2L)).isFalse();
    }

    @Test
    @SuppressWarnings("unchecked")
    void rankingDesdeFilas_omitePlataformaYSuma() {
        Map<String, Object> plataforma = TenantUsoAgregacion.filaUso(
            1L, "Plataforma", "hc", "ACTIVO", "ADMIN",
            500L, 2L, 0L, 0L, 0L, 0L, 0L, -1, 0L, 0L);
        Map<String, Object> a = TenantUsoAgregacion.filaUso(
            2L, "A", "a", "ACTIVO", "PYME",
            100L, 4L, 10L, 1L, 10L, 100L, 50L, 100, 1L, 1L);
        Map<String, Object> b = TenantUsoAgregacion.filaUso(
            3L, "B", "b", "ACTIVO", "PRO",
            50L, 1L, 5L, 1L, 5L, 20L, 30L, 50, 2L, 2L);
        Map<String, Object> out = TenantUsoAgregacion.rankingDesdeFilas(2026, 9, List.of(plataforma, a, b));
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> tenants = (List<Map<String, Object>>) out.get("tenants");
        assertThat(tenants).hasSize(2);
        Map<String, Object> resumen = (Map<String, Object>) out.get("resumen");
        assertThat(resumen.get("gmvTotal")).isEqualTo(150L);
        assertThat(resumen.get("pedidosTotal")).isEqualTo(5L);
        assertThat(resumen.get("tokensMesTotal")).isEqualTo(200L);
    }

    @Test
    void creditosRestantes_yPeriodo() {
        assertThat(TenantUsoAgregacion.creditosRestantes(-1, 999)).isEqualTo(-1);
        assertThat(TenantUsoAgregacion.creditosRestantes(100, 80)).isEqualTo(20);
        assertThat(TenantUsoAgregacion.creditosRestantes(10, 50)).isZero();
        TenantUsoAgregacion.PeriodoUso p = TenantUsoAgregacion.periodo(2026, 9);
        assertThat(p.inicio()).isEqualTo(java.time.LocalDate.of(2026, 9, 1));
        assertThat(p.fin()).isEqualTo(java.time.LocalDate.of(2026, 10, 1));
        assertThatThrownBy(() -> TenantUsoAgregacion.periodo(2026, 0))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void detalleDesdeFila_agregaCreditosYNota() {
        Map<String, Object> f = TenantUsoAgregacion.filaUso(
            2L, "Café", "cafe", "ACTIVO", "PYME",
            1L, 1L, 1L, 1L, 80L, 0L, 0L, 100, 1L, 1L);
        Map<String, Object> d = TenantUsoAgregacion.detalleDesdeFila(
            TenantUsoAgregacion.periodo(2026, 9), f);
        assertThat(d.get("creditosRestantes")).isEqualTo(20);
        assertThat(d.get("notaAlmacenamiento")).isEqualTo(TenantUsoAgregacion.NOTA_ALMACENAMIENTO);
        assertThat(d.get("anio")).isEqualTo(2026);
    }
}
