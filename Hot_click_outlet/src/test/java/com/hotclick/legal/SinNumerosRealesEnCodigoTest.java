package com.hotclick.legal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/**
 * Compuerta: el WhatsApp del dueño y el SINPE de la plataforma no se versionan en código, pruebas ni
 * configuración; salen de hotclick.soporte.telefono / VITE_SOPORTE_TELEFONO / ONVO_SINPE_DESTINO. Los números
 * prohibidos vienen de HOTCLICK_NUMEROS_PROHIBIDOS (comas, secret en CI); sin variable la compuerta se omite
 * (no falla ni imprime valores).
 * Solo reporta archivo:línea. Quedan fuera los locales i18n (los atiende otra rama), el build estático y docs.
 */
@DisplayName("Sin números reales de contacto/SINPE en el código")
class SinNumerosRealesEnCodigoTest {

    private static final String VARIABLE = "HOTCLICK_NUMEROS_PROHIBIDOS";

    /** Lee los números prohibidos (8 dígitos locales) del entorno; nunca se escriben en el código. */
    static Set<String> prohibidos(String valor) {
        Set<String> r = new HashSet<>();
        if (valor == null) return r;
        for (String parte : valor.split(",")) {
            String d = parte.replaceAll("\\D", "");
            if (d.length() == 11 && d.startsWith("506")) d = d.substring(3);
            if (d.length() == 8) r.add(d);
        }
        return r;
    }

    /** 8 dígitos locales, opcionalmente con +506/506 y separador espacio o guion en el medio. */
    private static final Pattern TELEFONO = Pattern.compile("(?<!\\d)(?:\\+?506[\\s-]?)?(\\d{4})[\\s-]?(\\d{4})(?!\\d)");

    private static final List<String> RAICES = List.of(
        "src/main", "src/test", "frontend/src", "frontend/tests", "frontend/index.html", "frontend/public/llms.txt", ".env.example");

    @Test
    void ningunArchivoContieneLosNumerosReales() throws IOException {
        Set<String> numeros = prohibidos(System.getenv(VARIABLE));
        assumeTrue(!numeros.isEmpty(), VARIABLE + " no está configurada: compuerta omitida.");
        Path base = Path.of("").toAbsolutePath();
        List<String> hallazgos = new ArrayList<>();
        for (String raiz : RAICES) {
            Path p = base.resolve(raiz);
            if (!Files.exists(p)) continue;
            try (Stream<Path> s = Files.walk(p)) {
                s.filter(Files::isRegularFile).filter(SinNumerosRealesEnCodigoTest::revisable)
                    .forEach(f -> revisar(base, f, numeros, hallazgos));
            }
        }
        assertThat(hallazgos).as("Número real en archivo:línea (usá las variables de entorno)").isEmpty();
    }

    @Test
    void laVariableAceptaFormatosComunes() {
        assertThat(prohibidos("8888-8888, +506 8888 8889,50688888890, x")).containsExactlyInAnyOrder("88888888", "88888889", "88888890");
        assertThat(prohibidos(null)).isEmpty();
    }

    @Test
    void elDetectorReconoceFormatosComunes() {
        List<String> h = new ArrayList<>();
        Matcher m = TELEFONO.matcher("+506 8888-8888 / 50688888889 / 8888 8888");
        while (m.find()) h.add(m.group(1) + m.group(2));
        assertThat(h).containsExactly("88888888", "88888889", "88888888");
    }

    private static boolean revisable(Path f) {
        String s = f.toString().replace('\\', '/');
        if (s.contains("/i18n/locales/") || s.contains("/resources/static/") || s.contains("/node_modules/")) return false;
        return s.matches(".*\\.(java|ts|tsx|js|jsx|html|properties|yml|yaml|json|txt|sql|md|example)$") || s.endsWith(".env.example");
    }

    private static void revisar(Path base, Path f, Set<String> numeros, List<String> hallazgos) {
        List<String> lineas;
        try {
            lineas = Files.readAllLines(f, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return;
        }
        for (int i = 0; i < lineas.size(); i++) {
            Matcher m = TELEFONO.matcher(lineas.get(i));
            while (m.find()) {
                if (numeros.contains(m.group(1) + m.group(2))) {
                    hallazgos.add(base.relativize(f) + ":" + (i + 1));
                    break;
                }
            }
        }
    }
}
