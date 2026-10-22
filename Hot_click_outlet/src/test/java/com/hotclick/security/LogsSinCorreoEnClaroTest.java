package com.hotclick.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

/** Guardia: en estos archivos de auth ningún log.* recibe un correo sin pasar por CorreoLogSeguro. */
class LogsSinCorreoEnClaroTest {

    private static final Pattern LOG = Pattern.compile("log\\.(trace|debug|info|warn|error)\\((.*?)\\);", Pattern.DOTALL);
    private static final Pattern CORREO_CRUDO = Pattern.compile("(?<![\\w(])(email|correo|\\w+\\.getCorreo\\(\\)|request\\.getCorreo\\(\\))\\s*[,)]");

    @ParameterizedTest
    @ValueSource(strings = {
        "src/main/java/com/hotclick/service/auth/AuthCredentialLoginHandler.java",
        "src/main/java/com/hotclick/service/auth/AuthRegistroEmpresaHandler.java",
        "src/main/java/com/hotclick/service/auth/ClerkSyncService.java",
        "src/main/java/com/hotclick/service/SecurityAuditService.java"})
    void sinCorreoEnClaro(String archivo) throws Exception {
        String src = Files.readString(Path.of(archivo));
        var m = LOG.matcher(src);
        while (m.find()) {
            String args = m.group(2) + ")";
            int coma = args.indexOf("\","); // saltar el literal del mensaje
            String resto = coma < 0 ? "" : args.substring(coma + 2);
            assertThat(CORREO_CRUDO.matcher(resto).find()).as(archivo + ": " + m.group(0)).isFalse();
        }
    }
}
