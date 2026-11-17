package com.hotclick.legal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
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
        "(?<![\\w.+-])(?:\\+?506[ -]?)?[245678]\\d{3}[ .-]?\\d{4}(?![\\w-]|\\.\\d)");

    /**
     * Excepciones: coincidencias del patrón que NO son teléfonos. Clave "ruta::texto". Una por una,
     * con motivo. Nunca por directorio. Un teléfono-placeholder realista se cambia a 0000-0001,
     * no se exceptúa (8812-0034 NO es excepción). Si una excepción deja de usarse, el test falla.
     */
    private static final Map<String, String> EXCEPCIONES = Map.of(
        "src/main/java/com/hotclick/service/contacto/ContactoTextoFiltro.java::4000-5000",
        "Rango de montos en colones ('4000-5000 colones') en javadoc y comentario del filtro de contacto; es un monto, no un teléfono.",
        "src/main/java/com/hotclick/service/contacto/ContactoTextoFiltro.java::2025-2026",
        "Rango de años en javadoc del mismo filtro ('modelo 2026, 2025-2026'); no es teléfono.",
        "src/main/java/com/hotclick/service/EmpresaAdminService.java::23456789",
        "Alfabeto de dígitos sin ambiguos (2-9) para generar contraseñas temporales (DIGITOS_SIN_AMBIGUOS); no es dato de contacto.",
        "frontend/src/pages/admin/pos/AdminPOSHistorial.tsx::86400000",
        "Milisegundos por día (24*60*60*1000) en un cálculo de diferencia de fechas; no es teléfono.");

    private static final List<String> RAICES = List.of("src/main/java", "frontend/src");

    @Test
    void elPatronDetectaLosFormatosViejos() {
        for (String s : List.of("8812-0034", "88120034", "+506 8812-0034", "2222-3333", "4000 5000", "7123.4567", "8888-8888", "88888888", "88001234", "+506 8888-8888", "8888 8888", "8888-1234", "88887777", "50688880000", "8888-0000")) {
            assertThat(REALISTA.matcher(s).find()).as(s).isTrue();
        }
        for (String s : List.of("0000-0001", "00000001", "+506 0000-0001", "id1234567890", "1888-88888", "a1b2c3d4-8812-0034")) {
            assertThat(REALISTA.matcher(s).find()).as(s).isFalse();
        }
    }

    /** Raíz del módulo: Maven corre con user.dir = Hot_click_outlet; si se corre desde el repo, baja a ese módulo. */
    private static Path baseDelModulo() {
        Path base = Path.of(System.getProperty("user.dir")).toAbsolutePath();
        if (!Files.isDirectory(base.resolve("src/main/java")) && Files.isDirectory(base.resolve("Hot_click_outlet/src/main/java"))) {
            base = base.resolve("Hot_click_outlet");
        }
        return base;
    }

    @Test
    void codigoDeProduccionYUiSinTelefonosRealistas() throws IOException {
        Path base = baseDelModulo();
        List<String> hallazgos = new ArrayList<>();
        Set<String> usadas = new HashSet<>();
        int raicesRevisadas = 0;
        for (String raiz : RAICES) {
            Path p = base.resolve(raiz);
            // Fail-closed: una raíz faltante (cwd equivocado) nunca se salta en silencio.
            assertThat(p).as("Raíz declarada inexistente (base=" + base + "): la compuerta no puede saltarla").isDirectory();
            raicesRevisadas++;
            try (Stream<Path> s = Files.walk(p)) {
                for (Path f : (Iterable<Path>) s.filter(Files::isRegularFile).filter(SinPlaceholdersTelefonoRealistaTest::revisable)::iterator) {
                    revisar(base, f, hallazgos, usadas);
                }
            }
        }
        assertThat(raicesRevisadas).as("Ninguna raíz resuelta").isEqualTo(RAICES.size());
        assertThat(usadas).as("Excepciones obsoletas (ya no coinciden): borrarlas").containsExactlyInAnyOrderElementsOf(EXCEPCIONES.keySet());
        assertThat(hallazgos).as("Teléfono realista en archivo:línea (usá 0000-0001)").isEmpty();
    }

    private static boolean revisable(Path f) {
        String n = f.getFileName().toString();
        if (n.contains(".test.") || n.contains(".spec.")) return false;
        return n.endsWith(".java") || n.endsWith(".ts") || n.endsWith(".tsx") || n.endsWith(".json");
    }

    private static void revisar(Path base, Path f, List<String> hallazgos, Set<String> usadas) {
        try {
            List<String> lineas = Files.readAllLines(f);
            for (int i = 0; i < lineas.size(); i++) {
                Matcher m = REALISTA.matcher(lineas.get(i));
                while (m.find()) {
                    String ruta = base.relativize(f).toString().replace('\\', '/');
                    String clave = ruta + "::" + m.group();
                    if (EXCEPCIONES.containsKey(clave)) usadas.add(clave);
                    else hallazgos.add(m.group() + " @ " + ruta + ":" + (i + 1));
                }
            }
        } catch (IOException e) {
            // binario o ilegible: se omite
        }
    }
}
