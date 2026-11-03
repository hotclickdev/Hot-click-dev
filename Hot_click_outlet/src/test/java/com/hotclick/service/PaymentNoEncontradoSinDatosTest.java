package com.hotclick.service;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.payment.PedidoGrupoService;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * L3 (Seguridad): el 404 de PaymentService no lleva el número de pedido en el mensaje que ve el cliente; en el log solo va enmascarado.
 */
@DisplayName("PaymentService: 404 sin datos internos (L3)")
class PaymentNoEncontradoSinDatosTest {

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
    @DisplayName("PaymentService.consultarEstado: sin el número de pedido en el mensaje; en el log va enmascarado")
    void pagoPedido() {
        PedidoRepository pedidos = mock(PedidoRepository.class);
        when(pedidos.findByNumeroPedido(anyString())).thenReturn(Optional.empty());
        PaymentService ps = new PaymentService();
        ReflectionTestUtils.setField(ps, "pedidoRepository", pedidos);
        Throwable t = catchThrowable(() -> ps.consultarEstado(NUMERO_PEDIDO));
        assertThat(alCliente(t)).isEqualTo("Pedido no encontrado");
        assertThat(t.getMessage()).doesNotContain(NUMERO_PEDIDO).doesNotContain("ABCD1234");
        assertThat(logs()).contains("***1234").doesNotContain(NUMERO_PEDIDO);
    }

    @Test
    @DisplayName("PaymentService.consultarEstado: pago inexistente → «Pago no encontrado» sin el número de pedido")
    void pagoSinPago() {
        PedidoRepository pedidos = mock(PedidoRepository.class);
        when(pedidos.findByNumeroPedido(anyString())).thenReturn(Optional.of(new Pedido()));
        PedidoGrupoService grupo = mock(PedidoGrupoService.class);
        when(grupo.pagoDelGrupo(any())).thenReturn(Optional.empty());
        PaymentService ps = new PaymentService();
        ReflectionTestUtils.setField(ps, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(ps, "pedidoGrupoService", grupo);
        Throwable t = catchThrowable(() -> ps.consultarEstado(NUMERO_PEDIDO));
        assertThat(alCliente(t)).isEqualTo("Pago no encontrado");
        assertThat(t.getMessage()).doesNotContain(NUMERO_PEDIDO);
    }
}
