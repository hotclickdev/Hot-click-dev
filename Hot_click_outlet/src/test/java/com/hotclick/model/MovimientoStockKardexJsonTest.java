package com.hotclick.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.hibernate.LazyInitializationException;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/** QA6-R4-01: GET /api/productos/{id}/kardex daba 500 al serializar el producto LAZY. */
class MovimientoStockKardexJsonTest {

    @Test
    void serializaSinTocarElProductoLazy() throws Exception {
        Producto proxySinSesion = Mockito.mock(Producto.class, inv -> {
            throw new LazyInitializationException("could not initialize proxy - no Session");
        });
        MovimientoStock m = new MovimientoStock();
        m.setProducto(proxySinSesion);
        m.setTipoMovimiento(MovimientoStock.VENTA_POS);
        m.setCantidad(-1);
        m.setFechaMovimiento(LocalDateTime.now());

        String json = new ObjectMapper().registerModule(new JavaTimeModule()).writeValueAsString(m);

        assertThat(json).contains("\"tipoMovimiento\":\"VENTA_POS\"").doesNotContain("\"producto\"");
    }
}
