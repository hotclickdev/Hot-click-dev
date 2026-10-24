package com.hotclick.legal;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Gate: ningún teléfono de Costa Rica (8 dígitos que empiezan en 2/4/5/6/7/8, con o sin guion o
 * espacio, con o sin +506/506) en la documentación (*.md, llms.txt) ni en los textos de pantalla
 * (i18n/locales/*.json y los componentes de contacto). El número oficial se configura fuera del repo.
 * El reporte de fallo da archivo:línea, nunca el valor.
 */
@DisplayName("Seguridad: sin teléfonos públicos en docs ni textos de UI")
class SinTelefonoPublicoEnDocsTest {

    /** Teléfono CR: opcional +506/506, luego [245678]ddd[- ]?dddd, sin dígitos/letras pegados. */
    static final Pattern TELEFONO_CR = Pattern.compile(
        "(?<![\\w.-])(?:\\+?506[ -]?)?([245678]\\d{3})[ -]?(\\d{4})(?![\\w-])");

    /** Allowlist mínima de números ficticios usados como ejemplo o placeholder. */
    static final Set<String> FICTICIOS = Set.of(
        "88888888", "22222222", "60000000", "70000000", "80000000", "88880000", "88881234", "81234567");

    private static final Path RAIZ = Path.of("..").toAbsolutePath().normalize();
    private static final Set<String> DIRS_IGNORADOS = Set.of(
        ".git", "node_modules", "target", "maven", "dist", "static", "Front para cliente EPN");

    /** Textos de pantalla fuera de los locales que mostraban el teléfono. */
    private static final List<String> UI_EXTRA = List.of(
        "Hot_click_outlet/frontend/src/pages/contacto/ContactoSeo.tsx",
        "Hot_click_outlet/frontend/src/pages/contacto/ContactoCanales.tsx",
        "Hot_click_outlet/frontend/src/pages/admin/configuracion/SeccionNotificaciones.tsx");

    static boolean esFicticio(String d) {
        if (FICTICIOS.contains(d)) return true;
        if (d.chars().distinct().count() == 1) return true;   // 8888-8888, 2222 2222
        if (d.matches("20\\d{2}20\\d{2}")) return true;            // rango de años 2023-2027
        return d.matches("20\\d{2}(0[1-9]|1[0-2])([0-2]\\d|3[01])"); // fecha AAAAMMDD
    }

    /** 8 dígitos pegados, sin prefijo ni separador, entre backticks: hash de commit o id de Figma. */
    static boolean esIdDeCodigo(String linea, Matcher m) {
        String txt = m.group();
        return txt.matches("\\d{8}") && m.start() > 0 && m.end() < linea.length()
            && linea.charAt(m.start() - 1) == '`' && linea.charAt(m.end()) == '`';
    }

    static List<String> hallazgos(Path archivo, String texto) {
        List<String> out = new ArrayList<>();
        String[] lineas = texto.split("\n", -1);
        for (int i = 0; i < lineas.length; i++) {
            Matcher m = TELEFONO_CR.matcher(lineas[i]);
            while (m.find()) {
                if (!esFicticio(m.group(1) + m.group(2)) && !esIdDeCodigo(lineas[i], m)) {
                    out.add(RAIZ.relativize(archivo.toAbsolutePath().normalize()) + ":" + (i + 1));
                }
            }
        }
        return out;
    }

    private static boolean ignorado(Path p) {
        for (Path parte : RAIZ.relativize(p.toAbsolutePath().normalize())) {
            if (DIRS_IGNORADOS.contains(parte.toString())) return true;
        }
        return false;
    }

    private static List<Path> archivosAEscanear() throws IOException {
        List<Path> lista = new ArrayList<>();
        try (Stream<Path> s = Files.walk(RAIZ)) {
            s.filter(Files::isRegularFile).filter(p -> !ignorado(p)).filter(p -> {
                String n = p.getFileName().toString();
                String rel = RAIZ.relativize(p.toAbsolutePath().normalize()).toString().replace('\\', '/');
                return n.endsWith(".md") || n.equals("llms.txt")
                    || (rel.contains("frontend/src/i18n/locales/") && n.endsWith(".json"));
            }).forEach(lista::add);
        }
        lista.add(RAIZ.resolve("Hot_click_outlet/src/main/resources/static/llms.txt"));
        for (String u : UI_EXTRA) lista.add(RAIZ.resolve(u));
        return lista;
    }

    @Test
    void docsYTextosDeUi_noPublicanTelefonos() throws IOException {
        List<String> malos = new ArrayList<>();
        int escaneados = 0;
        for (Path p : archivosAEscanear()) {
            if (!Files.exists(p)) continue;
            escaneados++;
            malos.addAll(hallazgos(p, new String(Files.readAllBytes(p), StandardCharsets.UTF_8)));
        }
        assertThat(escaneados).as("archivos escaneados").isGreaterThan(50);
        assertThat(malos).as("Teléfono CR en docs/UI (archivo:línea). Usá 'contactanos por el chat de soporte'"
            + " o un ficticio de la allowlist").isEmpty();
    }

    @Test
    void patron_detectaFormatosYRespetaAllowlist() {
        Path f = RAIZ.resolve("x.md");
        assertThat(hallazgos(f, "WhatsApp +506 6123-4567")).hasSize(1);
        assertThat(hallazgos(f, "tel 61234567")).hasSize(1);
        assertThat(hallazgos(f, "llamá al 506 2345 6789")).hasSize(1);
        assertThat(hallazgos(f, "placeholder 8888-8888 y 88888888")).isEmpty();
        assertThat(hallazgos(f, "modelo claude-haiku-4-5-20251001")).isEmpty();
        assertThat(hallazgos(f, "commit `5737b1b8` y monto ₡17.500")).isEmpty();
        assertThat(hallazgos(f, "commits `b9b22017`, `51234567`")).isEmpty();
        assertThat(hallazgos(f, "ENIA 2023-2027")).isEmpty();
        assertThat(hallazgos(f, "WhatsApp `+50661234567`")).hasSize(1);
        assertThat(hallazgos(f, "SINPE `6123-4567`")).hasSize(1);
    }
}
