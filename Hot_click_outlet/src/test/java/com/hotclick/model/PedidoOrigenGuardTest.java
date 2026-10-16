package com.hotclick.model;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PedidoOrigenGuardTest {

    @ParameterizedTest
    @CsvSource({"TIENDA_WEB,ONLINE", "QR,POS", "TELEGRAM,MANUAL", "ASIGNACION_MANUAL,MANUAL",
                "MARKETPLACE,ONLINE", "web,ONLINE", "POS,POS", "MANUAL,MANUAL"})
    void prePersistNormaliza(String crudo, String esperado) {
        Pedido p = new Pedido();
        p.setOrigen(crudo);
        PedidoOrigenGuardAccess.prePersist(p);
        assertThat(p.getOrigen()).isEqualTo(esperado);
        assertThat(p.getTokenSeguimiento()).isNotNull();
    }

    @Test
    void preUpdateConNuloQuedaOnline() {
        Pedido p = new Pedido();
        p.setOrigen(null);
        PedidoOrigenGuardAccess.preUpdate(p);
        assertThat(p.getOrigen()).isEqualTo("ONLINE");
    }

    @Test
    void productoACotizar() {
        Producto p = new Producto();
        p.setEsPersonalizado(true);
        p.setModoPrecioPersonalizado("COTIZACION");
        assertThat(p.esACotizar()).isTrue();
        p.setModoPrecioPersonalizado("FIJO");
        assertThat(p.esACotizar()).isFalse();
    }
}
