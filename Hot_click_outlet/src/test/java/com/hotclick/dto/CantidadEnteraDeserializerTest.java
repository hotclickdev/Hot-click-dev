package com.hotclick.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** QA7 POS: cantidad 1.5 debe rechazarse (400), no truncarse a 1. */
class CantidadEnteraDeserializerTest {

    private final ObjectMapper om = new ObjectMapper();

    @Test
    void posCantidadDecimalSeRechaza() {
        assertThatThrownBy(() -> om.readValue("{\"items\":[{\"productoId\":1,\"cantidad\":1.5}]}", PosVentaDTO.class))
                .isInstanceOf(InvalidFormatException.class);
    }

    @Test
    void ventaCantidadDecimalSeRechaza() {
        assertThatThrownBy(() -> om.readValue("{\"items\":[{\"productoId\":1,\"cantidad\":0.5}]}", VentaRequestDTO.class))
                .isInstanceOf(InvalidFormatException.class);
    }

    @Test
    void enterosSiguenFuncionando() throws Exception {
        assertThat(om.readValue("{\"items\":[{\"productoId\":1,\"cantidad\":3}]}", PosVentaDTO.class)
                .getItems().get(0).getCantidad()).isEqualTo(3);
        assertThat(om.readValue("{\"items\":[{\"productoId\":1,\"cantidad\":2.0}]}", PosVentaDTO.class)
                .getItems().get(0).getCantidad()).isEqualTo(2);
        assertThat(om.readValue("{\"items\":[{\"productoId\":1,\"cantidad\":null}]}", PosVentaDTO.class)
                .getItems().get(0).getCantidad()).isNull();
    }
}
