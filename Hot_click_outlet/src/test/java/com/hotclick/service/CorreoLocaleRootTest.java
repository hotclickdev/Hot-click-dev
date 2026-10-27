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
import java.util.List;
import java.util.Locale;

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

    @Test
    @DisplayName("Ningún sitio que normaliza correos usa toLowerCase() sin Locale")
    void sinToLowerCaseSinLocale() throws Exception {
        Path base = Path.of("src/main/java/com/hotclick");
        for (String f : List.of("controller/EquipoController.java", "service/EmpresaAdminService.java",
                "service/EmprendedorRegistroService.java", "service/UsuarioService.java",
                "service/PasswordResetService.java", "service/auth/AuthRegistrationService.java",
                "controller/ClerkSyncController.java", "service/consola/TiendaRapidaReglas.java")) {
            List<String> lineas = Files.readAllLines(base.resolve(f));
            for (int i = 0; i < lineas.size(); i++) {
                String l = lineas.get(i);
                // El slug de texto libre (Normalizer NFD) no es un correo.
                if (l.contains(".toLowerCase()") && !l.contains("Normalizer.normalize")) {
                    throw new AssertionError(f + ":" + (i + 1) + " usa toLowerCase() sin Locale.ROOT: " + l.trim());
                }
            }
        }
    }
}
