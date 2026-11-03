package com.hotclick.service.facturacion;

import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.security.CompanyScope;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** GET /api/facturas 500 (dueño PYME): el query nunca recibe fechas null (Postgres: "could not determine data type"). */
class FacturaConsultaFechasNullTest {

    @Test
    void sinFiltros_mandaRangoNoNull() {
        ComprobanteFiscalRepository repo = mock(ComprobanteFiscalRepository.class);
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(repo.findByEmpresaIdConFiltros(anyLong(), any(), any(), any(), any())).thenReturn(Page.empty());

        new FacturaConsultaService(repo, scope).listar(0, 20, null, null, null);

        verify(repo).findByEmpresaIdConFiltros(eq(7L), isNull(),
            eq(FacturaConsultaService.FECHA_MIN), eq(FacturaConsultaService.FECHA_MAX), any());
    }

    @Test
    void conFiltros_respetaFechas() {
        ComprobanteFiscalRepository repo = mock(ComprobanteFiscalRepository.class);
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        when(repo.findByEmpresaIdConFiltros(anyLong(), any(), any(), any(), any())).thenReturn(Page.empty());

        new FacturaConsultaService(repo, scope).listar(0, 20, "ACEPTADO", LocalDate.of(2026, 1, 2), LocalDate.of(2026, 1, 3));

        verify(repo).findByEmpresaIdConFiltros(eq(7L), eq("ACEPTADO"),
            eq(LocalDateTime.of(2026, 1, 2, 0, 0)), eq(LocalDateTime.of(2026, 1, 3, 23, 59, 59)), any());
        assertThat(FacturaConsultaService.FECHA_MIN).isBefore(FacturaConsultaService.FECHA_MAX);
    }
}
