package com.hotclick.service.sinpe;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * L3 (Seguridad): el 404 de SinpeComprobantePersistenceService no lleva el número de pedido en el mensaje que ve el cliente; en el log solo va enmascarado.
 */
@DisplayName("SinpeComprobantePersistenceService: 404 sin datos internos (L3)")
class SinpeNoEncontradoSinDatosTest {

    private static final String NUMERO_PEDIDO = "HC-20261027-ABCD1234";

    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();
    private Logger logExcepcion;

    @BeforeEach
    void capturarLog() {
        logExcepcion = (Logger) LoggerFactory.getLogger(RecursoNoEncontradoException.class);
        appender.start();
        logExcepcion.addAppender(appender);
    }

    @AfterEach
    void soltarLog() {
        logExcepcion.detachAppender(appender);
        appender.stop();
    }

    private String logs() {
        StringBuilder sb = new StringBuilder();
        for (ILoggingEvent e : appender.list) sb.append(e.getFormattedMessage()).append('\n');
        return sb.toString();
    }

    private static String alCliente(Throwable t) {
        assertThat(t).isInstanceOf(NoSuchElementException.class);
        return new GlobalExceptionHandler().handleNotFound((NoSuchElementException) t).getBody().getMessage();
    }

    @Test
    @DisplayName("SinpeComprobantePersistenceService.guardar: pedido inexistente → «Pedido no encontrado» sin el número; en el log va enmascarado")
    void sinpePedido() {
        PedidoRepository pedidos = mock(PedidoRepository.class);
        when(pedidos.findByNumeroPedido(anyString())).thenReturn(Optional.empty());
        SinpeComprobantePersistenceService svc = new SinpeComprobantePersistenceService();
        ReflectionTestUtils.setField(svc, "pedidoRepository", pedidos);
        Throwable t = catchThrowable(() -> svc.guardar(NUMERO_PEDIDO, "https://cdn.test/c.jpg", "Ana", null, null, "ana@test.cr"));
        assertThat(alCliente(t)).isEqualTo("Pedido no encontrado");
        assertThat(t.getMessage()).doesNotContain(NUMERO_PEDIDO).doesNotContain("ABCD1234");
        assertThat(logs()).contains("***1234").doesNotContain(NUMERO_PEDIDO);
    }
}
