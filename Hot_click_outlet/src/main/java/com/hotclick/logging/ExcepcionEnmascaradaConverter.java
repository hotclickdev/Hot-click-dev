package com.hotclick.logging;

import ch.qos.logback.classic.pattern.RootCauseFirstThrowableProxyConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

/**
 * {@code %exSeguro} en logback-spring.xml: la traza de la excepción (mensajes y causas)
 * con RedaccionLog aplicado, para que un IBAN, una cédula o un token dentro de
 * {@code getMessage()} no lleguen al log (LOG-1). Es {@code %rEx} enmascarado: causa raíz primero y
 * el mismo recorte ({@code %exSeguro{12}} = {@code %rEx{12}}).
 */
public class ExcepcionEnmascaradaConverter extends RootCauseFirstThrowableProxyConverter {
    @Override
    public String convert(ILoggingEvent event) {
        return RedaccionLog.enmascarar(super.convert(event));
    }
}
