package com.hotclick.service.sinpe;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Compra multinegocio: el Pago vive en el paquete principal. Aprobar o rechazar el comprobante
 * con el número de otro paquete tiene que encontrar ese Pago (merge 89c1795b2, L8).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class SinpePaqueteNoPrincipalTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private ComprobanteSinpeRepository comprobanteRepository;
    @Mock private PaymentService paymentService;
    @Mock private SinpeAuditSupport auditSupport;
    @Mock private SinpeAprobacionGuard aprobacionGuard;
    @Mock private com.hotclick.service.NotificacionEmailService notificacionEmailService;
    @InjectMocks private SinpeComprobanteService service;

    private Pago pago;
    private ComprobanteSinpe comprobante;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "pedidoGrupoService", new PedidoGrupoService(pedidoRepository, pagoRepository));
        Pedido principal = new Pedido();
        principal.setId(1L);
        principal.setNumeroPedido("ORD-1");
        principal.setGrupoPago("GP-1");
        principal.setEstadoPedido(Constants.PEDIDO_PENDIENTE_APROBACION);
        Pedido segundo = new Pedido();
        segundo.setId(2L);
        segundo.setNumeroPedido("ORD-2");
        segundo.setGrupoPago("GP-1");
        segundo.setEstadoPedido(Constants.PEDIDO_PENDIENTE_APROBACION);
        when(pedidoRepository.findByGrupoPagoOrderByIdAsc("GP-1")).thenReturn(List.of(principal, segundo));

        pago = new Pago();
        pago.setId(10L);
        pago.setPedido(principal);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(pagoRepository.findTopByPedidoId(1L)).thenReturn(Optional.of(pago));
        when(pagoRepository.findTopByPedidoId(2L)).thenReturn(Optional.empty());

        comprobante = new ComprobanteSinpe();
        comprobante.setId(50L);
        comprobante.setPedido(segundo);
        comprobante.setEstado(Constants.COMPROBANTE_PENDIENTE);
        when(comprobanteRepository.findById(50L)).thenReturn(Optional.of(comprobante));
    }

    @Test
    void aprobarConPaqueteNoPrincipal_confirmaElPagoDelGrupo() {
        service.aprobar(50L, "admin@test.cr", 1L);

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verify(paymentService).confirmarPedido(pago);
    }

    @Test
    void rechazarConPaqueteNoPrincipal_cancelaElPagoDelGrupo() {
        service.rechazar(50L, "monto no coincide", "admin@test.cr", 1L);

        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        verify(pagoRepository).save(pago);
    }
}
