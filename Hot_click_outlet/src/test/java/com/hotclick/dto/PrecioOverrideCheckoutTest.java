package com.hotclick.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** P6-02: el JSON público del checkout nunca fija el precio unitario. */
class PrecioOverrideCheckoutTest {

    @Test
    void jsonNoPuedeFijarPrecio() throws Exception {
        PaymentCheckoutRequest.ItemDTO item = new ObjectMapper().readValue(
            "{\"productoId\":1,\"cantidad\":1,\"precioUnitarioOverride\":1}", PaymentCheckoutRequest.ItemDTO.class);
        assertThat(item.getPrecioUnitarioOverride()).isNull();
        item.asignarPrecioCotizado(15_000);
        assertThat(item.getPrecioUnitarioOverride()).isEqualTo(15_000);
    }
}
