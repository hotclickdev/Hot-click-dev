package com.hotclick.monitoreo;

import io.sentry.Hint;
import io.sentry.SentryEvent;
import io.sentry.SentryOptions;
import io.sentry.protocol.Message;
import io.sentry.protocol.SentryException;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.regex.Pattern;

/** INF-03: redacta correos, teléfonos y cédulas antes de enviar eventos a Sentry. */
@Component
public class SentryRedaccionPii implements SentryOptions.BeforeSendCallback {

    private static final Pattern CORREO = Pattern.compile("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}");
    /** Cédula CR: física 0-0000-0000 / 9 dígitos, jurídica 3-101-000000, DIMEX 11-12 dígitos. */
    private static final Pattern CEDULA = Pattern.compile("\\b\\d{1,2}-\\d{3,4}-\\d{4,6}\\b|\\b\\d{9,12}\\b");
    /** Teléfono: +506 8888-8888, 8888 8888, 88888888 y similares. */
    private static final Pattern TELEFONO = Pattern.compile("(?:\\+\\d{1,3}[\\s-]?)?\\b\\d{4}[\\s-]?\\d{4}\\b");

    public static String redactar(String s) {
        if (s == null) return null;
        String r = CORREO.matcher(s).replaceAll("[correo]");
        r = CEDULA.matcher(r).replaceAll("[cedula]");
        return TELEFONO.matcher(r).replaceAll("[telefono]");
    }

    @Override
    public SentryEvent execute(SentryEvent event, Hint hint) {
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
            Map<String, Object> copia = new HashMap<>(extras);
            copia.forEach((k, v) -> event.setExtra(k, v instanceof String sv ? redactar(sv) : (v == null ? null : redactar(String.valueOf(v)))));
        }
        return event;
    }
}
