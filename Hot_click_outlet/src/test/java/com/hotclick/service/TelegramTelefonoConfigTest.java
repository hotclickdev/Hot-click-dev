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
        Pattern literal = Pattern.compile("\"[^\"\\n]*(\\b\\d{4}-\\d{4}\\b|wa\\.me/\\d)[^\"\\n]*\"");
        for (String f : new String[] {
                "src/main/java/com/hotclick/service/TelegramNotificacionClienteService.java",
                "src/main/java/com/hotclick/controller/CustomErrorController.java",
                "src/main/java/com/hotclick/service/email/EmailLayoutHelper.java"}) {
            assertThat(literal.matcher(Files.readString(Path.of(f))).find()).as(f).isFalse();
        }
        // Seeders: solo teléfonos obviamente ficticios (un único dígito repetido).
        Pattern tel = Pattern.compile("setTelefono\\w*\\(\"(\\d+)\"\\)");
        for (String f : new String[] {
                "src/main/java/com/hotclick/config/CatalogoLocalSeeder.java",
                "src/main/java/com/hotclick/config/QaCuentasSeeder.java"}) {
            var m = tel.matcher(Files.readString(Path.of(f)));
            while (m.find()) assertThat(m.group(1).chars().distinct().count()).as(f).isEqualTo(1);
        }
    }
}
