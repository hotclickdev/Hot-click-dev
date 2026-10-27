package com.hotclick.service.telegram;

import org.junit.jupiter.api.Test;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

/** Throwable limpio de {@link TelegramTexto#paraLog(Throwable)}. Datos ficticios. */
class TelegramTextoParaLogThrowableTest {

    @Test
    void conservaClaseOriginalCausaRaizYStackTrace_sinMensajesNiCausa() {
        IllegalArgumentException rootCause = new IllegalArgumentException("Detail: Key (email)=(ficticio@ejemplo.test)");
        IllegalStateException original = new IllegalStateException("Failing row contains (FICT-0001, x)",
            new IOException("intermedio con datos FICT-0002", rootCause));

        Throwable limpio = TelegramTexto.paraLog(original);

        assertThat(limpio.getCause()).as("sin cadena de causas").isNull();
        assertThat(limpio.getSuppressed()).isEmpty();
        assertThat(limpio.getMessage()).contains(IllegalStateException.class.getName())
            .contains(IllegalArgumentException.class.getName())
            .doesNotContain("FICT").doesNotContain("ficticio").doesNotContain("Failing").doesNotContain("Detail");
        assertThat(limpio.getStackTrace()).isEqualTo(original.getStackTrace());
    }

    @Test
    void sinCausa_soloLaClaseOriginal_yNullDevuelveNull() {
        Throwable limpio = TelegramTexto.paraLog(new IllegalStateException("dato FICT-0003"));

        assertThat(limpio.getMessage()).isEqualTo(IllegalStateException.class.getName());
        assertThat(TelegramTexto.paraLog((Throwable) null)).isNull();
    }

    @Test
    void causaCiclica_noCuelga() {
        IllegalStateException a = new IllegalStateException("a");
        IllegalStateException b = new IllegalStateException("b", a);
        a.initCause(b);

        assertThat(TelegramTexto.paraLog(a).getMessage()).contains(IllegalStateException.class.getName());
    }
}
