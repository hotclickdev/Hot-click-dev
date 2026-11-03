package com.hotclick.controller;

import com.hotclick.security.CompanyScope;
import com.hotclick.security.TenantContext;
import com.hotclick.service.AiQuotaService;
import com.hotclick.service.d105.CompraD105Service;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** A6-1 / A7-1 (re-QA 1e181f7e): entradas sin contexto o sin parámetros dan 400, no 500. */
class ReqaA6A7ParametrosTest {

    @AfterEach void limpiar() { TenantContext.clear(); }

    @Test
    void a6_1_usoIaSinEmpresa_400() {
        AiQuotaService quota = mock(AiQuotaService.class);
        AiCopilotController c = new AiCopilotController();
        ReflectionTestUtils.setField(c, "aiQuotaService", quota);
        TenantContext.clear();
        assertThat(c.uso().getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(quota);
    }

    @Test
    void a7_1_reporteD105SinParametros_400() {
        CompraD105Service svc = mock(CompraD105Service.class);
        CompraD105Controller c = new CompraD105Controller(svc, mock(CompanyScope.class));
        assertThat(c.reporte(null, null).getStatusCode().value()).isEqualTo(400);
        assertThat(c.reporte(2026, " ").getStatusCode().value()).isEqualTo(400);
        verifyNoInteractions(svc);
    }
}
