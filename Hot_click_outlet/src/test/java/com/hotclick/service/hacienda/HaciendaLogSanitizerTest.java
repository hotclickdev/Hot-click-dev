package com.hotclick.service.hacienda;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class HaciendaLogSanitizerTest {

    @Test
    void claveQuedaConUltimos4() {
        assertThat(HaciendaLogSanitizer.clave("50626102600310100000000100001010000000001199991234")).isEqualTo("***1234");
        assertThat(HaciendaLogSanitizer.clave(null)).isEqualTo("***");
        assertThat(HaciendaLogSanitizer.clave("123")).isEqualTo("***");
    }

    @Test
    void mensajeQuitaDigitosLargosSaltosYTrunca() {
        assertThat(HaciendaLogSanitizer.mensaje("cédula 3101000000\r\nfalso log")).isEqualTo("cédula [num]  falso log".replace("  ", " "));
        assertThat(HaciendaLogSanitizer.mensaje("línea 12 col 8")).isEqualTo("línea 12 col 8");
        assertThat(HaciendaLogSanitizer.mensaje(null)).isEqualTo("sin detalle");
        assertThat(HaciendaLogSanitizer.mensaje("x".repeat(1000))).hasSize(HaciendaLogSanitizer.MAX + 1);
    }

    @Test
    void mensajeEnmascaraNumerosConGuiones() {
        assertThat(HaciendaLogSanitizer.mensaje("cédula 1-2345-6789 rechazada")).isEqualTo("cédula [num] rechazada");
        assertThat(HaciendaLogSanitizer.mensaje("emisor 3-101-123456 sin permiso")).isEqualTo("emisor [num] sin permiso");
        assertThat(HaciendaLogSanitizer.mensaje("emisor 3 101 123456")).isEqualTo("emisor [num]");
        assertThat(HaciendaLogSanitizer.mensaje("versión 4-4 línea 12-8")).isEqualTo("versión 4-4 línea 12-8");
    }

    @Test
    void errorIncluyeTipoYNoElMensajeCrudo() {
        String s = HaciendaLogSanitizer.error(new IllegalStateException("clave 50626102600310100000000100001010000000001199991234"));
        assertThat(s).startsWith("IllegalStateException: ").doesNotContain("506261026");
    }

    @Test
    void v196AvisaConSuPropioNumero() throws Exception {
        try (var st = Files.list(Path.of("src/main/resources/db/migration"))) {
            Path v196 = st.filter(p -> p.getFileName().toString().startsWith("V196__")).findFirst().orElseThrow();
            String sql = Files.readString(v196, StandardCharsets.UTF_8);
            assertThat(sql).contains("RAISE NOTICE 'V196:").doesNotContain("'V194:");
        }
    }
}
