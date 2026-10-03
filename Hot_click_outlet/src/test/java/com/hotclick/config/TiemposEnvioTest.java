package com.hotclick.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

@DisplayName("TiemposEnvio — única fuente de los tiempos de entrega (D13)")
class TiemposEnvioTest {

    @Test
    @DisplayName("Lee config/tiempos-envio.json del classpath")
    void leeElJsonCompartido() throws Exception {
        var json = new ObjectMapper().readTree(Path.of("src/main/resources/config/tiempos-envio.json").toFile());
        TiemposEnvio.Valores v = TiemposEnvio.valores();
        assertThat(v.rapidoDesdeMin()).isEqualTo(json.at("/rapido/desdeMin").asInt());
        assertThat(v.rapidoHastaHoras()).isEqualTo(json.at("/rapido/hastaHoras").asInt());
        assertThat(v.normalGamDesde()).isEqualTo(json.at("/normalGam/desdeDias").asInt());
        assertThat(v.normalGamHasta()).isEqualTo(json.at("/normalGam/hastaDias").asInt());
        assertThat(v.fueraGamDesde()).isEqualTo(json.at("/fueraGam/desdeDias").asInt());
        assertThat(v.fueraGamHasta()).isEqualTo(json.at("/fueraGam/hastaDias").asInt());
        assertThat(json.at("/provisional").asBoolean()).as("confirmados por el negocio").isFalse();
    }

    @Test
    @DisplayName("El frontend importa el mismo JSON (no hay una segunda copia de los valores)")
    void elFrontendUsaElMismoArchivo() throws Exception {
        Path fuente = Path.of("frontend/src/config/tiemposEnvio.ts");
        assumeTrue(Files.exists(fuente), "solo con el repo completo (mvn desde Hot_click_outlet)");
        String ts = Files.readString(fuente);
        assertThat(ts).contains("src/main/resources/config/tiempos-envio.json");
        assertThat(ts).doesNotContainPattern("desdeMin:\\s*\\d");
    }

    @Test
    @DisplayName("Plazo por método de envío, con los valores confirmados (2-oct-2026)")
    void plazoPorMetodo() {
        assertThat(TiemposEnvio.plazo("ENVIO_RAPIDO")).isEqualTo("de 30 min a 2 horas");
        assertThat(TiemposEnvio.plazo("ENVIO_NORMAL_GAM")).isEqualTo("de 2 a 4 días hábiles");
        assertThat(TiemposEnvio.plazo("ENVIO_NORMAL_FUERA_GAM")).isEqualTo("de 3 a 4 días hábiles");
        assertThat(TiemposEnvio.plazo(null)).isEqualTo("de 2 a 4 días hábiles");
        assertThat(TiemposEnvio.plazoEn("ENVIO_RAPIDO")).isEqualTo("30 min to 2 hours");
        assertThat(TiemposEnvio.plazoEn("ENVIO_NORMAL_FUERA_GAM")).isEqualTo("3-4 business days");
        assertThat(TiemposEnvio.resumen())
            .isEqualTo("en el GAM de 2 a 4 días hábiles, fuera del GAM de 3 a 4 días hábiles y envío rápido en el GAM de 30 min a 2 horas");
    }

    @Test
    @DisplayName("Un valor faltante o no positivo falla al arrancar en vez de inventar un plazo")
    void validaLosValores() throws Exception {
        var malo = new ObjectMapper().readTree("{\"rapido\":{\"desdeMin\":30,\"hastaHoras\":2},"
            + "\"normalGam\":{\"desdeDias\":0,\"hastaDias\":4},\"fueraGam\":{\"desdeDias\":3,\"hastaDias\":4}}");
        assertThatThrownBy(() -> TiemposEnvio.leer(malo)).hasMessageContaining("normalGam.desdeDias");
        assertThatThrownBy(() -> TiemposEnvio.leer(new ObjectMapper().readTree("{}"))).isInstanceOf(IllegalStateException.class);
    }
}
