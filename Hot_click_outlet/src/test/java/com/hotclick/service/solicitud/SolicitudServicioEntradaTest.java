package com.hotclick.service.solicitud;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Entrada pública de una solicitud de búsqueda")
class SolicitudServicioEntradaTest {

    @Test
    void exigeDescripcionYRecortaVacios() {
        SolicitudServicioEntrada.Datos datos = SolicitudServicioEntrada.validar(Map.of(
            "descripcion", "  Busco el reloj de la foto  ",
            "nombreContacto", "   ",
            "fotosUrls", "[\"https://cdn.example/reloj.jpg\"]"
        ));

        assertThat(datos.descripcion()).isEqualTo("Busco el reloj de la foto");
        assertThat(datos.nombre()).isNull();
        assertThat(datos.fotosUrls()).isEqualTo("[\"https://cdn.example/reloj.jpg\"]");
    }

    @Test
    void rechazaUrlQueNoSeaHttps() {
        Map<String, String> body = new HashMap<>();
        body.put("descripcion", "Busco un reloj");
        body.put("fotosUrls", "[\"javascript:alert(1)\"]");

        assertThatThrownBy(() -> SolicitudServicioEntrada.validar(body))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Las fotos de la solicitud no son válidas");
    }

    @Test
    void rechazaDescripcionEnorme() {
        assertThatThrownBy(() -> SolicitudServicioEntrada.validar(Map.of(
            "descripcion", "a".repeat(SolicitudServicioEntrada.DESCRIPCION_MAX + 1)
        ))).isInstanceOf(IllegalArgumentException.class)
            .hasMessage("La descripción es demasiado larga");
    }
}
