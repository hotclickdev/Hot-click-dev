package com.hotclick.controller.storefront;

import com.hotclick.dto.StorefrontPedidoDTO;
import com.hotclick.service.payment.OrderPricingService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class StorefrontCostoEnvioTest {

    private static StorefrontPedidoDTO dto(String metodo, String provincia, String canton) {
        StorefrontPedidoDTO d = new StorefrontPedidoDTO();
        d.setMetodoEnvio(metodo); d.setProvincia(provincia); d.setCanton(canton);
        return d;
    }

    @Test
    void domicilioSumaEnvioNormalDeLaTabla() {
        OrderPricingService pricing = mock(OrderPricingService.class);
        when(pricing.calcularCostoEnvio("ENVIO_NORMAL_GAM")).thenReturn(4000);
        assertThat(StorefrontGuestOrderService.costoEnvioTienda(dto(StorefrontPedidoDTO.ENVIO_DOMICILIO, "San José", "Escazú"), pricing)).isEqualTo(4000);
    }

    @Test
    void retiroNoSumaEnvio() {
        OrderPricingService pricing = mock(OrderPricingService.class);
        assertThat(StorefrontGuestOrderService.costoEnvioTienda(dto("RETIRO", "San José", "Escazú"), pricing)).isZero();
        assertThat(StorefrontGuestOrderService.costoEnvioTienda(dto(StorefrontPedidoDTO.ENVIO_DOMICILIO, "San José", "Escazú"), null)).isZero();
    }
}
