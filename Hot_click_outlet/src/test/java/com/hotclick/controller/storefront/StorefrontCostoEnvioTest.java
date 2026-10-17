package com.hotclick.controller.storefront;

import com.hotclick.dto.StorefrontPedidoDTO;
import com.hotclick.service.payment.OrderPricingService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StorefrontCostoEnvioTest {

    @Test
    void domicilioSumaEnvioNormalDeLaTabla() {
        OrderPricingService pricing = mock(OrderPricingService.class);
        when(pricing.calcularCostoEnvio("ENVIO_NORMAL_GAM")).thenReturn(4000);
        assertThat(StorefrontGuestOrderService.costoEnvioTienda(StorefrontPedidoDTO.ENVIO_DOMICILIO, pricing)).isEqualTo(4000);
    }

    @Test
    void retiroNoSumaEnvio() {
        OrderPricingService pricing = mock(OrderPricingService.class);
        assertThat(StorefrontGuestOrderService.costoEnvioTienda("RETIRO", pricing)).isZero();
        assertThat(StorefrontGuestOrderService.costoEnvioTienda(StorefrontPedidoDTO.ENVIO_DOMICILIO, null)).isZero();
    }
}
