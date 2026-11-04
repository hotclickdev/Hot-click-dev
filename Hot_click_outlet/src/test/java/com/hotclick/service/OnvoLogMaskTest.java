package com.hotclick.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ONVO | los logs no llevan el sessionId completo")
class OnvoLogMaskTest {

    @Test
    void enmascaraDejandoSoloCuatroYCuatro() {
        String id = "cs_" + "a1b2c3d4e5f6g7h8i9";
        String m = OnvoService.enmascarar(id);
        assertThat(m).isEqualTo("cs_a...h8i9").doesNotContain("c3d4e5f6g7");
        assertThat(OnvoService.enmascarar("corto")).isEqualTo("****");
        assertThat(OnvoService.enmascarar(null)).isEqualTo("null");
    }

    /** Guardia: en los 3 archivos de ONVO ningún log.* recibe un id de sesión sin pasar por enmascarar(). */
    @Test
    void ningunLogOnvoPasaElIdCrudo() throws Exception {
        Pattern logCall = Pattern.compile("log\\.\\w+\\((.*?)\\);", Pattern.DOTALL);
        Pattern idCrudo = Pattern.compile("(?<![\\w(])(checkoutSessionId|sessionId|session\\.id\\(\\)|id)\\s*[,)]");
        List<String> malos = new ArrayList<>();
        for (String f : List.of("service/OnvoService.java", "payment/OnvoPaymentProvider.java", "payment/OnvoCapturaService.java")) {
            String src = Files.readString(Path.of("src/main/java/com/hotclick", f));
            Matcher m = logCall.matcher(src);
            while (m.find()) {
                String args = m.group(1);
                int coma = args.indexOf("\",");
                if (coma < 0) continue;
                if (idCrudo.matcher(args.substring(coma + 1)).find()) malos.add(f + ": " + m.group().replaceAll("\\s+", " "));
            }
        }
        assertThat(malos).isEmpty();
    }
}
