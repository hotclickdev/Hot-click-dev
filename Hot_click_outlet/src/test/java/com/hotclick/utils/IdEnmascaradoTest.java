package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QA5 BAJO | ids de ONVO enmascarados en logs")
class IdEnmascaradoTest {

    @Test
    void dejaPrefijoYUltimos4() {
        String id = "cs_9f8e7d6c5b4a3210abcd";
        String m = IdEnmascarado.de(id);
        assertThat(m).isEqualTo("cs_…abcd").doesNotContain("9f8e7d6c5b4a3210");
        assertThat(IdEnmascarado.de("cl502zv0d0127ebdp3zt27651")).isEqualTo("…7651");
    }

    @Test
    void cortosNulosYVacios() {
        assertThat(IdEnmascarado.de(null)).isEqualTo("?");
        assertThat(IdEnmascarado.de("  ")).isEqualTo("?");
        assertThat(IdEnmascarado.de("cs_abc")).isEqualTo("cs_****");
        assertThat(IdEnmascarado.de("12345678")).isEqualTo("****");
    }

    @Test
    @DisplayName("ningún log de ONVO en archivos permitidos interpola el sessionId crudo")
    void fuentesSinSessionIdCrudo() throws Exception {
        for (String f : new String[] {"src/main/java/com/hotclick/payment/OnvoCapturaService.java",
                "src/main/java/com/hotclick/service/OnvoService.java"}) {
            for (String linea : java.nio.file.Files.readAllLines(java.nio.file.Path.of(f))) {
                if (linea.contains("log.") && linea.matches(".*[\"]\\s*,\\s*(checkoutSessionId|sessionId)\\s*[,)].*")) {
                    throw new AssertionError("sessionId sin enmascarar en " + f + ": " + linea.trim());
                }
            }
        }
    }
}
