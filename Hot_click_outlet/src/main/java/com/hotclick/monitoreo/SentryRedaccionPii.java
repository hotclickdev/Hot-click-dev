package com.hotclick.monitoreo;

import io.sentry.Breadcrumb;
import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.SentryOptions;
import io.sentry.protocol.Message;
import io.sentry.protocol.Request;
import io.sentry.protocol.SentryException;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * INF-03: redacta datos personales antes de enviar eventos a Sentry.
 * Falla cerrado: si algo falla al redactar, el evento se descarta (null).
 */
@Component
public class SentryRedaccionPii implements SentryOptions.BeforeSendCallback {

    private static final Pattern CORREO = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    /** IBAN CR: CR + 20 dígitos, con o sin espacios. Va antes que la cédula. */
    private static final Pattern IBAN_CR = Pattern.compile("(?i)\\bCR\\s?(?:\\d\\s?){19}\\d\\b");
    /** Cédula CR: física 0-0000-0000 / 9 dígitos, jurídica 3-101-000000, DIMEX 11-12 dígitos. */
    private static final Pattern CEDULA = Pattern.compile("\\b\\d{1,2}-\\d{3,4}-\\d{4,6}\\b|\\b\\d{9,12}\\b");
    /** Teléfono: +506 8888-8888, 8888 8888, 88888888 y similares. */
    private static final Pattern TELEFONO = Pattern.compile("(?:\\+\\d{1,3}[\\s-]?)?\\b\\d{4}[\\s-]?\\d{4}\\b");

    public static String redactar(String s) {
        if (s == null) return null;
        String r = CORREO.matcher(s).replaceAll("[correo]");
        r = IBAN_CR.matcher(r).replaceAll("[iban]");
        r = CEDULA.matcher(r).replaceAll("[cedula]");
        return TELEFONO.matcher(r).replaceAll("[telefono]");
    }

    private static Object redactarValor(Object v) {
        return v == null ? null : redactar(String.valueOf(v));
    }

    @Override
    public SentryEvent execute(SentryEvent event, Hint hint) {
        try {
            return redactarEvento(event);
        } catch (RuntimeException e) {
            return null;
        }
    }

    SentryEvent redactarEvento(SentryEvent event) {
        Message m = event.getMessage();
        if (m != null) {
            m.setMessage(redactar(m.getMessage()));
            m.setFormatted(redactar(m.getFormatted()));
            if (m.getParams() != null) m.setParams(m.getParams().stream().map(SentryRedaccionPii::redactar).toList());
        }
        if (event.getExceptions() != null) {
            for (SentryException e : event.getExceptions()) e.setValue(redactar(e.getValue()));
        }
        Map<String, Object> extras = event.getExtras();
        if (extras != null) {
            new HashMap<>(extras).forEach((k, v) -> event.setExtra(k, redactarValor(v)));
        }
        if (event.getBreadcrumbs() != null) {
            for (Breadcrumb b : event.getBreadcrumbs()) {
                b.setMessage(redactar(b.getMessage()));
                new HashMap<>(b.getData()).forEach((k, v) -> b.setData(k, redactarValor(v)));
            }
        }
        event.setUser(null);
        Map<String, String> tags = event.getTags();
        if (tags != null) {
            new HashMap<>(tags).forEach((k, v) -> event.setTag(k, redactar(v)));
        }
        Request req = event.getRequest();
        if (req != null) {
            req.setCookies(null);
            req.setHeaders(null);
            req.setQueryString(null);
            req.setData(null);
            req.setUrl(redactar(req.getUrl()));
        }
        return event;
    }
}
