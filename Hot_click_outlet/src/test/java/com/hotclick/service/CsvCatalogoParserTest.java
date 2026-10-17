package com.hotclick.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CsvCatalogoParserTest {

    @Test
    void plantillaDeQaSeLeeSinIa() {
        String csv = "nombreProducto,precioVenta,precioCompra,stockActual,sku\n"
            + "QA-TEST Import 1610-1,1200,500,3,QATEST-IMP1610-1\n"
            + "\"Taza, grande\",1300,,2,\n";
        var lista = CsvCatalogoParser.parsear(csv).orElseThrow();
        assertThat(lista).hasSize(2);
        assertThat(lista.get(0).getPrecioVenta()).isEqualTo(1200);
        assertThat(lista.get(0).getStockActual()).isEqualTo(3);
        assertThat(lista.get(1).getNombreProducto()).isEqualTo("Taza, grande");
        assertThat(lista.get(1).getPrecioCompra()).isNull();
    }

    @Test
    void numeroInvalidoDiceLaFila() {
        String csv = "nombre;precio\nPulsera;abc\n";
        assertThatThrownBy(() -> CsvCatalogoParser.parsear(csv))
            .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("Fila 2");
    }

    @Test
    void columnasDesconocidasVanALaIa() {
        assertThat(CsvCatalogoParser.parsear("articulo,valor\nx,1\n")).isEmpty();
    }
}
