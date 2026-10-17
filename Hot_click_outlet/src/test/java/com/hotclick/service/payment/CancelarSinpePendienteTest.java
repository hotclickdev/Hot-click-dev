package com.hotclick.service.payment;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CancelarSinpePendienteTest {

    @Test
    void sinpeRecienCreadoSePuedeCancelar() {
        assertThat(PaymentUserCancellationService.cancelablePorComprador("PENDIENTE")).isTrue();
        assertThat(PaymentUserCancellationService.cancelablePorComprador("PENDIENTE_COMPROBANTE")).isTrue();
    }

    @Test
    void enRevisionOPagadoNo() {
        assertThat(PaymentUserCancellationService.cancelablePorComprador("PENDIENTE_APROBACION")).isFalse();
        assertThat(PaymentUserCancellationService.cancelablePorComprador("PAGADO")).isFalse();
    }
}
