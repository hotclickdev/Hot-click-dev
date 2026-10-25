package com.hotclick.controller.storefront;

import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** M-01: el pedido de invitado del storefront cobra el precio de oferta calculado en el backend. */
class StorefrontPrecioOfertaTest {

    @Test
    @DisplayName("M-01 | storefront: ítem en oferta → precio y subtotal con la oferta")
    void itemCobraOferta() {
        Producto p = new Producto();
        p.setPrecioVenta(8900);
        p.setPrecioCompra(5000);
        p.setEnOferta(true);
        p.setPrecioOferta(7900);
        PedidoItem i = StorefrontGuestOrderService.crearPedidoItem(p, 2, new Pedido());
        assertThat(i.getPrecioUnitarioMomento()).isEqualTo(7900);
        assertThat(i.getSubtotalItem()).isEqualTo(15800);
    }
}
