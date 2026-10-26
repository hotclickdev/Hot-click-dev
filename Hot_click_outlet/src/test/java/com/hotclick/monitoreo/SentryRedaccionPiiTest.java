package com.hotclick.monitoreo;

import io.sentry.Breadcrumb;
import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.protocol.Message;
import io.sentry.protocol.Request;
import io.sentry.protocol.SentryException;
import io.sentry.protocol.User;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

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

        assertThat(out.getMessage().getMessage()).doesNotContain("ana.p@correo.com", "8888-7777", "1-1234-5678")
                .contains("[correo]", "[telefono]", "[cedula]");
        assertThat(out.getExceptions().get(0).getValue()).doesNotContain("304560789", "88887777");
        assertThat(out.getExtras().get("contacto")).isEqualTo("[correo]");
        assertThat(out.getExtras().get("pedido")).isEqualTo("42");
    }

    @Test
    void redactaIbanCrConYSinEspaciosAntesQueCedula() {
        assertThat(SentryRedaccionPii.redactar("iban CR05015202001026284066")).isEqualTo("iban [iban]");
        assertThat(SentryRedaccionPii.redactar("iban CR05 0152 0200 1026 2840 66")).isEqualTo("iban [iban]");
    }

    @Test
    void limpiaBreadcrumbs() {
        SentryEvent ev = new SentryEvent();
        Breadcrumb b = new Breadcrumb();
        b.setMessage("login ana@x.com");
        b.setData("tel", "8888-7777");
        ev.setBreadcrumbs(List.of(b));

        Breadcrumb out = cb.execute(ev, new Hint()).getBreadcrumbs().get(0);

        assertThat(out.getMessage()).isEqualTo("login [correo]");
        assertThat(out.getData().get("tel")).isEqualTo("[telefono]");
    }

    @Test
    void quitaUsuario() {
        SentryEvent ev = new SentryEvent();
        User u = new User();
        u.setEmail("ana@x.com");
        u.setIpAddress("10.0.0.1");
        u.setUsername("ana");
        ev.setUser(u);

        assertThat(cb.execute(ev, new Hint()).getUser()).isNull();
    }

    @Test
    void redactaTags() {
        SentryEvent ev = new SentryEvent();
        ev.setTag("cliente", "ana@x.com");

        assertThat(cb.execute(ev, new Hint()).getTag("cliente")).isEqualTo("[correo]");
    }

    @Test
    void limpiaRequest() {
        SentryEvent ev = new SentryEvent();
        Request r = new Request();
        r.setCookies("JSESSIONID=abc");
        r.setHeaders(Map.of("Authorization", "Bearer x"));
        r.setQueryString("email=ana@x.com");
        r.setData(Map.of("cedula", "112345678"));
        ev.setRequest(r);

        Request out = cb.execute(ev, new Hint()).getRequest();

        assertThat(out.getCookies()).isNull();
        assertThat(out.getHeaders()).isNull();
        assertThat(out.getQueryString()).isNull();
        assertThat(out.getData()).isNull();
    }

    @Test
    void siFallaDescartaElEvento() {
        SentryEvent roto = new SentryEvent();
        roto.setBreadcrumbs(java.util.Arrays.asList((Breadcrumb) null));

        assertThat(cb.execute(roto, new Hint())).isNull();
    }

    @Test
    void nullSeguro() {
        assertThat(SentryRedaccionPii.redactar(null)).isNull();
        assertThat(cb.execute(new SentryEvent(), new Hint())).isNotNull();
    }

    @Test
    void redactaTokensEnTextoLibre() {
        String relleno = "A".repeat(35);
        assertThat(SentryRedaccionPii.redactar("Authorization: Bearer abc.DEF-123_xyz"))
                .isEqualTo("Authorization: Bearer [token]");
        assertThat(SentryRedaccionPii.redactar("bot 123456789:" + relleno + " falló"))
                .isEqualTo("bot [token] falló");
        assertThat(SentryRedaccionPii.redactar("slack " + "xox" + "b-0000000000-ficticio"))
                .isEqualTo("slack [token]");
        assertThat(SentryRedaccionPii.redactar("jwt " + "eyJ" + "hbGc.eyJzdWIi.firma_falsa"))
                .isEqualTo("jwt [token]");
    }
}
