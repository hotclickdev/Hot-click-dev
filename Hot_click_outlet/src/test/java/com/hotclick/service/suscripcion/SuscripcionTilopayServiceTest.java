package com.hotclick.service.suscripcion;

import com.hotclick.model.CobroSuscripcion;
import com.hotclick.service.TilopayService.ConsultaResultado;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.hotclick.exception.PlanNoDisponibleException;
import com.hotclick.model.Plan;
import com.hotclick.repository.*;
import com.hotclick.service.TilopayService;
import com.hotclick.service.billing.BillingLedgerWriter;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class SuscripcionTilopayServiceTest {

    private static CobroSuscripcion cobro() {
        CobroSuscripcion c = new CobroSuscripcion();
        c.setOrderNumber("SUB-5-ABC");
        c.setMontoCrc(12_900L); // Pyme
        return c;
    }

    private static ConsultaResultado consulta(String monto, String moneda, String orden, boolean simulada) {
        return new ConsultaResultado(true, "1", "ok", "AUTH", monto == null ? null : new BigDecimal(monto),
            moneda, orden, simulada);
    }

    @Test
    void aceptaSoloMontoMonedaYOrdenExactos() {
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("12900", "CRC", "SUB-5-ABC", false), false)).isTrue();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("100", "CRC", "SUB-5-ABC", false), false)).isFalse();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("12900", "USD", "SUB-5-ABC", false), false)).isFalse();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta("12900", "CRC", "SUB-9-XYZ", false), false)).isFalse();
    }

    @Test
    void simulacionSoloEnModoPrueba() {
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta(null, null, null, true), true)).isTrue();
        assertThat(SuscripcionTilopayService.aceptable(cobro(), consulta(null, null, null, true), false)).isFalse();
    }

    @Test
    void proximoCobroCaeEnElDiaDelNegocio() {
        assertThat(SuscripcionTilopayService.proximoCobro(LocalDate.of(2026, 10, 12), 28)).isEqualTo(LocalDate.of(2026, 11, 28));
        assertThat(SuscripcionTilopayService.proximoCobro(LocalDate.of(2026, 10, 12), 13)).isEqualTo(LocalDate.of(2026, 11, 13));
        assertThat(SuscripcionTilopayService.proximoCobro(LocalDate.of(2027, 1, 30), 28)).isEqualTo(LocalDate.of(2027, 2, 28));
    }

    @Test
    void esc5_precioReal_noCobraPorTilopay_sinPrecioDa409() {
        CobroSuscripcionRepository cobroRepo = mock(CobroSuscripcionRepository.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        TilopayService tilopay = mock(TilopayService.class);
        when(tilopay.loginSdk()).thenReturn("tok");
        when(cobroRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        SuscripcionTilopayService svc = new SuscripcionTilopayService(cobroRepo, planRepo,
            mock(EmpresaRepository.class), mock(SuscripcionRepository.class), tilopay,
            mock(SuscripcionOnvoChangeService.class), mock(BillingLedgerWriter.class), 28, "NINGUNO");

        Plan pyme = new Plan();
        pyme.setId(2L);
        pyme.setNombre("PYME");
        pyme.setPrecioMensual(12_900);
        when(planRepo.findById(2L)).thenReturn(Optional.of(pyme));
        assertThatThrownBy(() -> svc.iniciarCambioPlan(5L, 2L))
            .isInstanceOf(com.hotclick.exception.CobroPlanNoDisponibleException.class);
        verify(cobroRepo, never()).save(any());
        verifyNoInteractions(tilopay);

        Plan sinPrecio = new Plan();
        sinPrecio.setId(3L);
        sinPrecio.setNombre("X");
        sinPrecio.setPrecioMensual(null);
        when(planRepo.findById(3L)).thenReturn(Optional.of(sinPrecio));
        assertThatThrownBy(() -> svc.iniciarCambioPlan(5L, 3L)).isInstanceOf(PlanNoDisponibleException.class);
    }

    @Test
    @org.junit.jupiter.api.DisplayName("Alta/cambio, confirmación y pago de renovación: nunca llaman al cliente Tilopay (ni mock)")
    void ningunCaminoDePlanLlamaATilopay() {
        CobroSuscripcionRepository cobroRepo = mock(CobroSuscripcionRepository.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        TilopayService tilopay = mock(TilopayService.class);
        when(tilopay.isMockMode()).thenReturn(true);
        SuscripcionOnvoChangeService planLocal = mock(SuscripcionOnvoChangeService.class);
        SuscripcionTilopayService svc = new SuscripcionTilopayService(cobroRepo, planRepo,
            mock(EmpresaRepository.class), mock(SuscripcionRepository.class), tilopay,
            planLocal, mock(BillingLedgerWriter.class), 28, "NINGUNO");
        Plan plus = new Plan();
        plus.setId(4L);
        plus.setNombre("NEGOCIO_PLUS");
        plus.setPrecioMensual(28_900);
        when(planRepo.findById(4L)).thenReturn(Optional.of(plus));
        CobroSuscripcion pendiente = cobro();
        pendiente.setEmpresaId(5L);
        pendiente.setPlanId(4L);
        pendiente.setEstado(CobroSuscripcion.PENDIENTE);
        when(cobroRepo.findByOrderNumberAndEmpresaId(any(), any())).thenReturn(Optional.of(pendiente));
        when(cobroRepo.findFirstByEmpresaIdAndEstadoAndMotivoOrderByFechaCreacionDesc(any(), any(), any()))
            .thenReturn(Optional.of(pendiente));

        assertThatThrownBy(() -> svc.iniciarCambioPlan(5L, 4L))
            .isInstanceOf(com.hotclick.exception.CobroPlanNoDisponibleException.class);
        assertThatThrownBy(() -> svc.confirmar(5L, "SUB-5-ABC"))
            .isInstanceOf(com.hotclick.exception.CobroPlanNoDisponibleException.class);
        assertThatThrownBy(() -> svc.pendiente(5L))
            .isInstanceOf(com.hotclick.exception.CobroPlanNoDisponibleException.class);

        verifyNoInteractions(tilopay);
        verifyNoInteractions(planLocal);
        verify(cobroRepo, never()).save(any());
    }

    @Test
    void precioCeroONegativo_nuncaActivaSinCobro_da409() {
        CobroSuscripcionRepository cobroRepo = mock(CobroSuscripcionRepository.class);
        PlanRepository planRepo = mock(PlanRepository.class);
        TilopayService tilopay = mock(TilopayService.class);
        SuscripcionOnvoChangeService planLocal = mock(SuscripcionOnvoChangeService.class);
        SuscripcionTilopayService svc = new SuscripcionTilopayService(cobroRepo, planRepo,
            mock(EmpresaRepository.class), mock(SuscripcionRepository.class), tilopay,
            planLocal, mock(BillingLedgerWriter.class), 28, "NINGUNO");
        for (int precio : new int[] {0, -1, -12_900}) {
            Plan p = new Plan();
            p.setId(9L);
            p.setNombre("PYME");
            p.setPrecioMensual(precio);
            when(planRepo.findById(9L)).thenReturn(Optional.of(p));
            assertThatThrownBy(() -> svc.iniciarCambioPlan(5L, 9L))
                .isInstanceOf(com.hotclick.exception.PlanSinPrecioException.class);
        }
        verifyNoInteractions(planLocal, tilopay);
        verify(cobroRepo, never()).save(any());
    }

    @Test
    void prorrateoPorDias_primerPeriodoHastaElDiaDeCobro() {
        LocalDate hoy = LocalDate.of(2026, 10, 12);
        assertThat(ProrrateoSuscripcion.siguienteDiaCobro(hoy, 28)).isEqualTo(LocalDate.of(2026, 10, 28));
        assertThat(ProrrateoSuscripcion.siguienteDiaCobro(LocalDate.of(2026, 10, 28), 28)).isEqualTo(LocalDate.of(2026, 11, 28));
        // 16 de 30 días → ceil(12900 * 16 / 30)
        assertThat(ProrrateoSuscripcion.montoAlta("DIAS", 12_900, hoy, 28)).isEqualTo(6_880L);
        assertThat(ProrrateoSuscripcion.montoAlta(null, 12_900, hoy, 28)).isEqualTo(6_880L);
        assertThat(ProrrateoSuscripcion.montoAlta("NINGUNO", 12_900, hoy, 28)).isEqualTo(12_900L);
        assertThat(ProrrateoSuscripcion.montoAlta("DIAS", 12_900, LocalDate.of(2026, 9, 28), 28)).isEqualTo(12_900L);
        assertThat(ProrrateoSuscripcion.finPrimerPeriodo("NINGUNO", hoy, 28)).isEqualTo(LocalDate.of(2026, 11, 28));
    }
}
