package com.hotclick.monitoreo;

import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.TelegramService;
import org.junit.jupiter.api.Test;

import java.time.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class OnvoPedidosPendientesJobTest {

    PedidoRepository repo = mock(PedidoRepository.class);
    TelegramService telegram = mock(TelegramService.class);
    Clock clock = Clock.fixed(Instant.parse("2026-10-25T12:00:00Z"), ZoneOffset.UTC);
    OnvoPedidosPendientesJob job = new OnvoPedidosPendientesJob(repo, telegram, 30, clock);

    @Test
    void avisaSiHayPendientesViejosConCorteDe30Min() {
        when(repo.countByMetodoPagoIgnoreCaseAndEstadoPedidoAndFechaPedidoBefore(any(), any(), any())).thenReturn(2L);
        assertThat(job.revisar()).isEqualTo(2L);
        verify(repo).countByMetodoPagoIgnoreCaseAndEstadoPedidoAndFechaPedidoBefore(
            "ONVO", "PENDIENTE", LocalDateTime.of(2026, 10, 25, 11, 30));
        verify(telegram).enviar(contains("2 pedido(s) ONVO"));
    }

    @Test
    void silencioSiNoHayPendientes() {
        when(repo.countByMetodoPagoIgnoreCaseAndEstadoPedidoAndFechaPedidoBefore(any(), any(), any())).thenReturn(0L);
        assertThat(job.revisar()).isZero();
        verifyNoInteractions(telegram);
    }
}
