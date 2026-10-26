package com.hotclick.service.facturacion;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class FacturacionAsyncRunnerLogTest {

    @Test
    void logDeErrorVaSanitizado() {
        FacturacionEnvioProcessor proc = mock(FacturacionEnvioProcessor.class);
        doThrow(new IllegalStateException("clave 50626102600310100000000100001010000000001199991234\nx"))
            .when(proc).procesarComprobante(5L);
        Logger lg = (Logger) LoggerFactory.getLogger(FacturacionAsyncRunner.class);
        ListAppender<ILoggingEvent> app = new ListAppender<>();
        app.start();
        lg.addAppender(app);
        try {
            new FacturacionAsyncRunner(proc).alEmitir(new ComprobanteEmitidoEvent(5L));
            assertThat(app.list).hasSize(1);
            String msg = app.list.get(0).getFormattedMessage();
            assertThat(msg).contains("IllegalStateException").doesNotContain("506261026").doesNotContain("\n");
        } finally {
            lg.detachAppender(app);
        }
    }
}
