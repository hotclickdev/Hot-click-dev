package com.hotclick.logging;

import ch.qos.logback.classic.pattern.MessageConverter;
import ch.qos.logback.classic.spi.ILoggingEvent;

/** {@code %msgSeguro} en logback-spring.xml: el mensaje con RedaccionLog aplicado (LOG-1). */
public class MensajeEnmascaradoConverter extends MessageConverter {
    @Override
    public String convert(ILoggingEvent event) {
        return RedaccionLog.enmascarar(super.convert(event));
    }
}
