package com.hotclick.service.sinpe;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.payment.PaymentFailureHandler;
import com.hotclick.service.payment.PaymentUserCancellationService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Seguridad (MEDIO): los logs del flujo SINPE/pagos no llevan nombre, cédula, teléfono ni correo. */
@DisplayName("Logs SINPE/pagos sin PII")
class LogPiiSinpeTest {

    private static final String NOMBRE = "Ana Mora Solis";
    private static final String CEDULA = "1-1111-1111";
    private static final String TELEFONO = "88881234";
    private static final String CORREO = "ana.mora@test.cr";

    private Logger logger;
    private ListAppender<ILoggingEvent> appender;

    private List<String> capturar(Class<?> clase) {
        logger = (Logger) LoggerFactory.getLogger(clase);
        appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        return null;
    }

    private String mensajes() {
        return String.join("\n", appender.list.stream().map(ILoggingEvent::getFormattedMessage).toList());
    }

    @AfterEach
    void soltar() {
        if (logger != null) logger.detachAppender(appender);
    }

    private static void sinPii(String log) {
        assertThat(log).doesNotContain(NOMBRE).doesNotContain(CEDULA).doesNotContain(TELEFONO).doesNotContain(CORREO);
    }

    @Test
    void comprobanteSubidoSoloLogueaElIdDelPedido() {
        PedidoRepository pedidos = mock(PedidoRepository.class);
        SinpeComprobantePersistenceService svc = new SinpeComprobantePersistenceService();
        ReflectionTestUtils.setField(svc, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(svc, "comprobanteRepository", mock(ComprobanteSinpeRepository.class));
        Pedido p = new Pedido();
        p.setId(4242L);
        p.setNumeroPedido("ORD-PII");
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        when(pedidos.findByNumeroPedido("ORD-PII")).thenReturn(Optional.of(p));
        capturar(SinpeComprobantePersistenceService.class);

        svc.guardar("ORD-PII", "https://cdn.test/c.jpg", NOMBRE, CEDULA, TELEFONO, CORREO);

        String log = mensajes();
        assertThat(log).contains("pedidoId=4242");
        sinPii(log);
    }

    @Test
    void cancelacionPorUsuarioNoLogueaElCorreo() {
        PedidoRepository pedidos = mock(PedidoRepository.class);
        PagoRepository pagos = mock(PagoRepository.class);
        PaymentUserCancellationService svc = new PaymentUserCancellationService();
        ReflectionTestUtils.setField(svc, "pedidoRepository", pedidos);
        ReflectionTestUtils.setField(svc, "pagoRepository", pagos);
        ReflectionTestUtils.setField(svc, "paymentFailureHandler", mock(PaymentFailureHandler.class));
        Usuario u = new Usuario();
        u.setCorreo(CORREO);
        Pedido p = new Pedido();
        p.setId(77L);
        p.setNumeroPedido("ORD-PII-2");
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(u);
        Pago pago = new Pago();
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(pedidos.findByNumeroPedido("ORD-PII-2")).thenReturn(Optional.of(p));
        when(pagos.findTopByPedidoId(77L)).thenReturn(Optional.of(pago));
        capturar(PaymentUserCancellationService.class);

        svc.cancelarPorUsuario("ORD-PII-2", CORREO);

        String log = mensajes();
        assertThat(log).contains("ORD-PII-2");
        sinPii(log);
    }
}
