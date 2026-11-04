package com.hotclick.payment;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regresión: ONVO es el único procesador de tarjeta. Falla si la pasarela retirada vuelve a aparecer en
 * src/main (código, config, assets de static/) o en src/test. Las migraciones Flyway ya aplicadas
 * (db/migration) quedan fuera: no se editan. El término se arma por partes para no detectarse a sí mismo.
 */
class SinPasarelaRetiradaTest {

    private static final String RETIRADA = "tilo" + "pay";

    @Test
    void srcMainYSrcTestNoLaMencionan() throws IOException {
        assertThat(conMencion(Paths.get("src/main"))).isEmpty();
        assertThat(conMencion(Paths.get("src/test"))).isEmpty();
    }

    @Test
    void elBuildNoLaEmpaqueta() throws IOException {
        Path clases = Paths.get("target/classes");
        if (!Files.isDirectory(clases)) return;
        assertThat(conMencion(clases)).isEmpty();
    }

    private static List<String> conMencion(Path raiz) throws IOException {
        if (!Files.isDirectory(raiz)) return List.of();
        try (Stream<Path> s = Files.walk(raiz)) {
            return s.filter(Files::isRegularFile)
                .filter(p -> !p.toString().replace('\\', '/').contains("db/migration/"))
                .filter(p -> !p.getFileName().toString().equals("SinPasarelaRetiradaTest.java"))
                .filter(p -> !p.getFileName().toString().startsWith("SinPasarelaRetiradaTest"))
                .filter(SinPasarelaRetiradaTest::menciona)
                .map(Path::toString)
                .toList();
        }
    }

    private static boolean menciona(Path p) {
        String nombre = p.getFileName().toString().toLowerCase(Locale.ROOT);
        if (nombre.contains(RETIRADA)) return true;
        try {
            byte[] b = Files.readAllBytes(p);
            return new String(b, StandardCharsets.ISO_8859_1).toLowerCase(Locale.ROOT).contains(RETIRADA);
        } catch (IOException e) {
            return false;
        }
    }
}
