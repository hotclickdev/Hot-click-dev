package com.hotclick.service.suscripcion;

import com.hotclick.model.CobroSuscripcion;
import com.hotclick.model.Empresa;
import com.hotclick.model.Plan;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.*;
import com.hotclick.service.TilopayService;
import com.hotclick.service.billing.BillingLedgerWriter;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** SCALE1: la corrida de renovaciones consulta en lote y guarda en lote, sin consultas por negocio. */
class RenovacionesTilopayServiceTest {

    private static Suscripcion sub(long empresaId, int precio, LocalDate fin) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Plan p = new Plan();
        p.setId(1L);
        p.setNombre("Pyme");
        p.setPrecioMensual(precio);
        Suscripcion s = new Suscripcion();
        s.setEmpresa(e);
        s.setPlan(p);
        s.setEstado("ACTIVO");
        s.setFechaFin(fin);
        return s;
    }

    @Test
    @SuppressWarnings("unchecked")
    void renovacionesEnLote_sinCobroTilopay() {
        LocalDate hoy = LocalDate.of(2026, 10, 28);
        SuscripcionRepository subs = mock(SuscripcionRepository.class);
        CobroSuscripcionRepository cobros = mock(CobroSuscripcionRepository.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        BillingLedgerWriter ledger = mock(BillingLedgerWriter.class);
        TilopayService tilopay = mock(TilopayService.class);
        SuscripcionTilopayService svc = spy(new SuscripcionTilopayService(cobros, mock(PlanRepository.class), empresas,
            subs, tilopay, mock(SuscripcionOnvoChangeService.class), ledger, 28, "DIAS"));
        when(subs.findVigentesConPlanYEmpresa()).thenReturn(List.of(
            sub(1, 12900, hoy), sub(2, 12900, hoy.minusDays(1)), sub(3, 12900, hoy.plusDays(5)), sub(4, 0, hoy)));
        when(cobros.empresasConCobro(eq(CobroSuscripcion.PENDIENTE), eq(CobroSuscripcion.MOTIVO_RENOVACION), anyCollection()))
            .thenReturn(List.of(2L));

        int n = new RenovacionesTilopayService(subs, cobros, svc, ledger).generarRenovaciones(hoy);

        assertThat(n).isZero(); // [ALERTA-PAGO]: no se genera cobro de renovación por Tilopay
        verify(cobros, times(1)).empresasConCobro(any(), any(), anyCollection());
        verify(cobros, never()).findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(any(), any(), any());
        verify(empresas, never()).findById(any());
        ArgumentCaptor<List<CobroSuscripcion>> nuevos = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<List<Suscripcion>> pastDue = ArgumentCaptor.forClass(List.class);
        verify(svc).guardarRenovaciones(nuevos.capture(), pastDue.capture());
        assertThat(nuevos.getValue()).isEmpty();
        verify(svc, never()).nuevoCobro(any(), any(), any(), anyInt());
        verifyNoInteractions(tilopay);
        assertThat(pastDue.getValue()).hasSize(2).allMatch(s -> "PAST_DUE".equals(s.getEstado()));
        verify(cobros, never()).saveAll(anyList());
        verify(subs).saveAll(anyList());
        verify(cobros, never()).save(any());
        verify(subs, never()).save(any());
        verify(ledger, times(2)).registrar(any(), any(), any(), any(), any(), any(), any(), any());
    }
}
