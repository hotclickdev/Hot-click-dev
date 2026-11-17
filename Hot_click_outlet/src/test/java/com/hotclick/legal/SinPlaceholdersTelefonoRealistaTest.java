package com.hotclick.legal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Compuerta: placeholders de UI, copy y seeders de producción/dev/test no usan números que parecen
 * teléfonos reales de CR (8888-8888, 88888888, 88001234, 8888-1234). Usar sintéticos 0000000X.
 * Las migraciones SQL ya aplicadas quedan fuera (no se editan). Solo reporta archivo:línea.
 */
@DisplayName("Sin placeholders de teléfono que parezcan reales")
class SinPlaceholdersTelefonoRealistaTest {

    private static final Pattern REALISTA = Pattern.compile(
        "(?<!\\d)(?:\\+?506[ -]?)?(?:8888[ .-]?\\d{4}|88001234)(?!\\d)");

    private static final List<String> RAICES = List.of("src/main/java", "frontend/src");

    @Test
    void elPatronDetectaLosFormatosViejos() {
        for (String s : List.of("8888-8888", "88888888", "88001234", "+506 8888-8888", "8888 8888", "8888-1234", "88887777", "50688880000", "8888-0000")) {
            assertThat(REALISTA.matcher(s).find()).as(s).isTrue();
        }
        for (String s : List.of("0000-0001", "00000001", "+506 0000-0001")) {
            assertThat(REALISTA.matcher(s).find()).as(s).isFalse();
        }
    }

    @Test
    void codigoDeProduccionYUiSinTelefonosRealistas() throws IOException {
        Path base = Path.of("").toAbsolutePath();
        List<String> hallazgos = new ArrayList<>();
        for (String raiz : RAICES) {
            Path p = base.resolve(raiz);
            if (!Files.exists(p)) continue;
            try (Stream<Path> s = Files.walk(p)) {
                s.filter(Files::isRegularFile).filter(SinPlaceholdersTelefonoRealistaTest::revisable)
                    .forEach(f -> revisar(base, f, hallazgos));
            }
        }
        assertThat(hallazgos).as("Teléfono realista en archivo:línea (usá 0000-0001)").isEmpty();
    }

    private static boolean revisable(Path f) {
        String n = f.getFileName().toString();
        if (n.contains(".test.") || n.contains(".spec.")) return false;
        return n.endsWith(".java") || n.endsWith(".ts") || n.endsWith(".tsx") || n.endsWith(".json");
    }

    private static void revisar(Path base, Path f, List<String> hallazgos) {
        try {
            List<String> lineas = Files.readAllLines(f);
            for (int i = 0; i < lineas.size(); i++) {
                if (REALISTA.matcher(lineas.get(i)).find()) hallazgos.add(base.relativize(f) + ":" + (i + 1));
            }
        } catch (IOException e) {
            // binario o ilegible: se omite
        }
    }
}
