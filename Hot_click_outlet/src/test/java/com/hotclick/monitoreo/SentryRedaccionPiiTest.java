package com.hotclick.monitoreo;

import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.protocol.Message;
import io.sentry.protocol.SentryException;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SentryRedaccionPiiTest {

    private final SentryRedaccionPii cb = new SentryRedaccionPii();

    @Test
    void redactaCorreoTelefonoYCedulaEnMensajeExcepcionYExtras() {
        SentryEvent ev = new SentryEvent();
        Message m = new Message();
        m.setMessage("cliente ana.p@correo.com tel +506 8888-7777 ced 1-1234-5678");
        ev.setMessage(m);
        SentryException ex = new SentryException();
        ex.setValue("fallo para 304560789 / 88887777");
        ev.setExceptions(List.of(ex));
        ev.setExtra("contacto", "x@y.cr");
        ev.setExtra("pedido", 42);

        SentryEvent out = cb.execute(ev, new Hint());

        String msg = out.getMessage().getMessage();
        assertThat(msg).doesNotContain("ana.p@correo.com", "8888-7777", "1-1234-5678")
                .contains("[correo]", "[telefono]", "[cedula]");
        assertThat(out.getExceptions().get(0).getValue()).doesNotContain("304560789", "88887777");
        assertThat(out.getExtras().get("contacto")).isEqualTo("[correo]");
        assertThat(out.getExtras().get("pedido")).isEqualTo("42");
    }

    @Test
    void nullSeguro() {
        assertThat(SentryRedaccionPii.redactar(null)).isNull();
        assertThat(cb.execute(new SentryEvent(), new Hint())).isNotNull();
    }
}
