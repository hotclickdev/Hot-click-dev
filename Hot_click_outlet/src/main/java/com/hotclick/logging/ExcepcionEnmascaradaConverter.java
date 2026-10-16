package com.hotclick.logging;

import ch.qos.logback.classic.pattern.ThrowableProxyConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

/**
 * {@code %exSeguro} en logback-spring.xml: la traza de la excepción (mensajes y causas)
 * con RedaccionLog aplicado, para que un IBAN, una cédula o un token dentro de
 * {@code getMessage()} no lleguen al log (LOG-1). Acepta las mismas opciones que {@code %ex}.
 */
public class ExcepcionEnmascaradaConverter extends ThrowableProxyConverter {
    @Override
    public String convert(ILoggingEvent event) {
        return RedaccionLog.enmascarar(super.convert(event));
    }
}
