package com.hotclick.service.suscripcion;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("B1: PLANES_MONEDA sin default en código y documentada en .env.example")
class PlanesMonedaSinDefaultTest {

    private static List<String> lineas(String ruta) throws IOException {
        return Files.readAllLines(Path.of(ruta));
    }

    @Test
    @DisplayName("application.properties: hotclick.planes.moneda=${PLANES_MONEDA:} (default vacío, nunca usd)")
    void propiedadSinDefault() throws IOException {
        List<String> props = lineas("src/main/resources/application.properties").stream()
            .filter(l -> l.startsWith("hotclick.planes.moneda=")).toList();
        assertThat(props).containsExactly("hotclick.planes.moneda=${PLANES_MONEDA:}");
    }

    @Test
    @DisplayName(".env.example lista PLANES_MONEDA solo con el nombre, sin valor")
    void envExampleSoloElNombre() throws IOException {
        assertThat(lineas(".env.example").stream().filter(l -> l.startsWith("PLANES_MONEDA")).toList())
            .containsExactly("PLANES_MONEDA=");
    }

    @Test
    @DisplayName("Sin valor, la moneda de los planes queda vacía: el billing no cae a un default")
    void monedaVaciaNoTieneDefault() {
        assertThat(new PreciosPlanesConfig("9", "24", "49", "").moneda()).isEmpty();
        assertThat(new PreciosPlanesConfig("9", "24", "49", null).moneda()).isEmpty();
    }
}
