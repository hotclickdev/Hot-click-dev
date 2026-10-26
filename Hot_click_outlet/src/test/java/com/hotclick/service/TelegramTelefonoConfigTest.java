package com.hotclick.service;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/** Regla: ningún teléfono hardcodeado; el de soporte viene de hotclick.soporte.telefono. */
class TelegramTelefonoConfigTest {

    private static final Pattern TEL = Pattern.compile("\\b\\d{4}[- ]?\\d{4}\\b|\\+\\d{3}");

    @Test void sinTelefonoConfigurado_omiteLaLinea() {
        String t = TelegramNotificacionClienteService.textoRevision("Tu producto", "Silla", "Mejorar foto", "");
        assertThat(t).doesNotContain("escribinos").contains("Mejorar foto");
        assertThat(TEL.matcher(t).find()).isFalse();
        assertThat(TelegramNotificacionClienteService.textoRevision("Tu producto", "Silla", null, null))
            .doesNotContain("escribinos");
    }

    @Test void conTelefonoConfigurado_usaElValor() {
        String t = TelegramNotificacionClienteService.textoRevision("Tu producto", "Silla", null, "+000 0000 0000");
        assertThat(t).contains("escribinos al *+000 0000 0000*");
    }

    @Test void fuenteSinTelefonoHardcodeado() throws Exception {
        String src = Files.readString(Path.of(
            "src/main/java/com/hotclick/service/TelegramNotificacionClienteService.java"));
        assertThat(Pattern.compile("\"[^\"\\n]*\\b\\d{4}-\\d{4}\\b[^\"\\n]*\"").matcher(src).find()).isFalse();
    }
}
