package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
import com.hotclick.repository.PagoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("QA5 MEDIO | Job de respaldo del webhook ONVO: lote, idempotencia y fail-closed")
class OnvoPendientesReconsultaServiceTest {

    private final PagoRepository repo = mock(PagoRepository.class);
    private final OnvoService onvo = mock(OnvoService.class);
    private final OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
    private final OnvoRechazoService rechazo = mock(OnvoRechazoService.class);
    private final PlatformTransactionManager tm = mock(PlatformTransactionManager.class);

    @BeforeEach
    void armar() {
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        when(onvo.isPagosDisponibles()).thenReturn(true);
    }

    private OnvoPendientesReconsultaService servicio(int lote, int antiguedad) {
        return new OnvoPendientesReconsultaService(repo, onvo, provider, rechazo, tm, lote, antiguedad);
    }

    private static Pago pago(long id) {
        Pago p = new Pago();
        p.setId(id);
        p.setMerchantToken("cs_resp_" + id);
        p.setEstadoPago(Constants.PAGO_PENDIENTE);
        return p;
    }

    @Test
    @DisplayName("usa el tope de lote y la antigüedad mínima configurados, y reclama con lock (FOR UPDATE SKIP LOCKED)")
    void loteYAntiguedad() throws Exception {
        when(repo.reclamarPendientesParaReconsulta(any(), any(), any())).thenReturn(List.of());
        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(7);
        servicio(3, 7).ejecutar();
        ArgumentCaptor<Pageable> pag = ArgumentCaptor.forClass(Pageable.class);
        ArgumentCaptor<LocalDateTime> lim = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(repo).reclamarPendientesParaReconsulta(eq(Constants.PROVEEDOR_ONVO), lim.capture(), pag.capture());
        assertThat(pag.getValue().getPageSize()).isEqualTo(3);
        assertThat(lim.getValue()).isBetween(antes.minusSeconds(5), antes.plusSeconds(5));
        var m = PagoRepository.class.getMethod("reclamarPendientesParaReconsulta", String.class, LocalDateTime.class, Pageable.class);
        assertThat(m.getAnnotation(org.springframework.data.jpa.repository.Lock.class).value())
            .isEqualTo(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        assertThat(m.getAnnotation(org.springframework.data.jpa.repository.QueryHints.class).value()[0].value()).isEqualTo("-2");
        assertThat(com.hotclick.scheduler.OnvoPendientesReconsultaScheduler.class.getMethod("ejecutar")
            .getAnnotation(SchedulerLock.class)).isNotNull();
        assertThatThrownBy(() -> servicio(0, 5)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("lote mixto: cobrado → captura verificada; rechazado → FALLIDO; en proceso → nada")
    void loteMixto() {
        when(repo.reclamarPendientesParaReconsulta(any(), any(), any())).thenReturn(List.of(pago(1), pago(2), pago(3)));
        when(provider.procesarPagoVerificado("cs_resp_1", "respaldo")).thenReturn(Verificacion.OK);
        when(provider.procesarPagoVerificado("cs_resp_2", "respaldo")).thenReturn(Verificacion.NO_PAGADO);
        when(provider.procesarPagoVerificado("cs_resp_3", "respaldo")).thenReturn(Verificacion.EN_PROCESO);
        when(rechazo.cerrarSiRechazado(2L, "cs_resp_2")).thenReturn(true);
        var r = servicio(20, 5).ejecutar();
        assertThat(r).isEqualTo(new OnvoPendientesReconsultaService.Resumen(3, 1, 1, 1));
        verify(rechazo, never()).cerrarSiRechazado(eq(1L), any());
        verify(rechazo, never()).cerrarSiRechazado(eq(3L), any());
    }

    @Test
    @DisplayName("segunda corrida no repite efectos: lo ya cerrado no vuelve al lote y el cierre es idempotente")
    void segundaCorridaSinEfectos() {
        List<Pago> pendientes = new ArrayList<>(List.of(pago(2)));
        when(repo.reclamarPendientesParaReconsulta(any(), any(), any())).thenAnswer(i -> List.copyOf(pendientes));
        when(provider.procesarPagoVerificado(anyString(), anyString())).thenReturn(Verificacion.NO_PAGADO);
        when(rechazo.cerrarSiRechazado(2L, "cs_resp_2")).thenAnswer(i -> { pendientes.clear(); return true; });
        assertThat(servicio(20, 5).ejecutar().fallidos()).isEqualTo(1);
        assertThat(servicio(20, 5).ejecutar()).isEqualTo(new OnvoPendientesReconsultaService.Resumen(0, 0, 0, 0));
        verify(rechazo, times(1)).cerrarSiRechazado(anyLong(), anyString());
        verify(provider, times(1)).procesarPagoVerificado(anyString(), anyString());
    }

    @Test
    @DisplayName("fail-closed: ONVO falla en un pago → ese pago no cambia y el resto del lote sigue")
    void failClosed() {
        when(repo.reclamarPendientesParaReconsulta(any(), any(), any())).thenReturn(List.of(pago(1), pago(2)));
        when(provider.procesarPagoVerificado("cs_resp_1", "respaldo"))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("timeout"));
        when(provider.procesarPagoVerificado("cs_resp_2", "respaldo")).thenReturn(Verificacion.NO_PAGADO);
        when(rechazo.cerrarSiRechazado(2L, "cs_resp_2")).thenReturn(true);
        var r = servicio(20, 5).ejecutar();
        assertThat(r).isEqualTo(new OnvoPendientesReconsultaService.Resumen(2, 0, 1, 1));
        verify(rechazo, never()).cerrarSiRechazado(eq(1L), any());

        when(onvo.isPagosDisponibles()).thenReturn(false);
        assertThat(servicio(20, 5).ejecutar().revisados()).isZero();
    }
}
