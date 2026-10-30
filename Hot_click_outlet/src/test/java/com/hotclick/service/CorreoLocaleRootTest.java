package com.hotclick.service;

import com.hotclick.controller.ClerkSyncControllerAccess;
import com.hotclick.service.consola.TiendaRapidaReglas;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Re-auditoría área 2 (MED-5, parte c): {@code toLowerCase()} sin Locale usa el idioma de la JVM; con locale turco
 * «INFO@X.CR» queda «ınfo@x.cr» (i sin punto) y el correo ya no coincide con el del registro. Todos los sitios que
 * normalizan correos usan {@code Locale.ROOT}. Datos ficticios.
 */
@DisplayName("[MEDIO] Correos se pasan a minúsculas con Locale.ROOT")
class CorreoLocaleRootTest {

    private Locale original;

    @BeforeEach
    void turco() {
        original = Locale.getDefault();
        Locale.setDefault(Locale.forLanguageTag("tr-TR"));
    }

    @AfterEach
    void restaurar() {
        Locale.setDefault(original);
    }

    @Test
    @DisplayName("TiendaRapidaReglas.correo no depende del locale de la JVM")
    void tiendaRapida() {
        assertThat(TiendaRapidaReglas.correo(" INFO@TIENDA.CR ")).isEqualTo("info@tienda.cr");
    }

    @Test
    @DisplayName("PasswordResetService.normalizar no depende del locale de la JVM")
    void passwordReset() throws Exception {
        Method m = PasswordResetService.class.getDeclaredMethod("normalizar", String.class);
        m.setAccessible(true);
        assertThat(m.invoke(null, " INFO@RESET.CR ")).isEqualTo("info@reset.cr");
    }

    @Test
    @DisplayName("ClerkSyncController.emailVerificado no depende del locale de la JVM")
    void clerk() {
        assertThat(ClerkSyncControllerAccess.emailVerificado("INFO@CLERK.CR")).isEqualTo("info@clerk.cr");
    }

    /**
     * Excepciones explícitas (ruta relativa a src/main/java → motivo). Vacía a propósito: toLowerCase()/toUpperCase()
     * sin Locale depende del idioma de la JVM (tr-TR convierte «I» en «ı»/«İ»), también en roles, estados, claves y
     * slugs. Un sitio solo entra aquí si de verdad debe seguir el idioma del usuario (texto mostrado en pantalla).
     */
    private static final Map<String, String> EXCEPCIONES = Map.of();

    private static final Pattern SIN_LOCALE = Pattern.compile("(\\.|::)\\s*to(Lower|Upper)Case\\s*(\\(\\s*\\)|(?!\\s*\\())");

    @Test
    @DisplayName("Ningún archivo de src/main/java usa toLowerCase()/toUpperCase() sin Locale")
    void sinToLowerCaseSinLocale() throws Exception {
        Path base = Path.of("src/main/java");
        List<String> infractores = new ArrayList<>();
        try (Stream<Path> archivos = Files.walk(base)) {
            for (Path f : (Iterable<Path>) archivos.filter(p -> p.toString().endsWith(".java"))::iterator) {
                String rel = base.relativize(f).toString().replace('\\', '/');
                if (EXCEPCIONES.containsKey(rel)) continue;
                List<String> lineas = Files.readAllLines(f);
                for (int i = 0; i < lineas.size(); i++) {
                    String l = lineas.get(i);
                    String t = l.trim();
                    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;
                    if (SIN_LOCALE.matcher(l).find()) {
                        infractores.add(rel + ":" + (i + 1) + "  " + t);
                    }
                }
            }
        }
        assertThat(infractores)
            .as("usar toLowerCase(Locale.ROOT) / toUpperCase(Locale.ROOT) (o declarar la excepción con su motivo)")
            .isEmpty();
    }

    @Test
    @DisplayName("El detector reconoce los usos sin Locale y deja pasar los que lo traen")
    void detectorFunciona() {
        assertThat(SIN_LOCALE.matcher("x.toLowerCase()").find()).isTrue();
        assertThat(SIN_LOCALE.matcher("x.trim().toUpperCase() ;").find()).isTrue();
        assertThat(SIN_LOCALE.matcher("map(String::toLowerCase)").find()).isTrue();
        assertThat(SIN_LOCALE.matcher("x.toLowerCase( )").find()).isTrue();
        assertThat(SIN_LOCALE.matcher("x.toLowerCase(Locale.ROOT)").find()).isFalse();
        assertThat(SIN_LOCALE.matcher("x.toUpperCase(java.util.Locale.ROOT)").find()).isFalse();
        assertThat(SIN_LOCALE.matcher("x.toLowerCase(Locale.of(\"es\"))").find()).isFalse();
    }
}
