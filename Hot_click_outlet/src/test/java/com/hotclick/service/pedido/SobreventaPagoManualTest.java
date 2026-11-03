package com.hotclick.service.pedido;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PaymentNotificationsFacade;
import com.hotclick.service.payment.PaymentOrderConfirmationService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * MED-2 (regresión): un cobro manual sin stock (sobreventa) queda registrado, el pedido en revisión
 * (no PAGADO, no se despacha), el comprobante sin aprobar y la plataforma recibe la alerta.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("MED-2: sobreventa después del cobro manual")
class SobreventaPagoManualTest {

    @Mock private PedidoGrupoService pedidoGrupoService;
    @Mock private PagoRepository pagoRepository;
    @Mock private ComprobanteSinpeRepository comprobanteRepository;
    @Mock private PaymentService paymentService;
    @Mock private AuditoriaAdminRegistroService auditoria;
    @Mock private CompanyScope companyScope;
    @Mock private AutocompraNegocioGuard autocompraGuard;
    @Mock private EntityManager entityManager;
    @InjectMocks private PedidoPagoManualService service;

    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void armar() {
        pedido = new Pedido();
        pedido.setId(1L);
        pedido.setOrigen("POS");
        pedido.setMetodoPago("EFECTIVO");
        pedido.setNumeroPedido("HC-MED2-1");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago = new Pago();
        pago.setId(10L);
        pago.setProveedor(Constants.PROVEEDOR_MANUAL);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(pedido);
        when(companyScope.isAdminIT()).thenReturn(true);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.of(pago));
        when(entityManager.contains(any())).thenReturn(true);
    }

    @Test
    @DisplayName("sobreventa → pedido en revisión, no PAGADO, y se informa al llamador")
    void sobreventa_quedaEnRevision() {
        doAnswer(inv -> {
            pedido.setEstadoPedido(Constants.PEDIDO_REVISION_SOBREVENTA);
            pago.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
            return PaymentOrderConfirmationService.Resultado.SOBREVENTA;
        }).when(paymentService).confirmarPedido(pago);

        boolean sobreventa = service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1");

        assertThat(sobreventa).isTrue();
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(auditoria).registrar(anyString(), eq("PEDIDO"), eq(1L), any(),
            contains(Constants.PEDIDO_REVISION_SOBREVENTA));
    }

    @Test
    @DisplayName("sobreventa con comprobante SINPE → el comprobante no se aprueba")
    void sobreventa_noApruebaComprobante() {
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.of(pago));
        ComprobanteSinpe comprobante = new ComprobanteSinpe();
        comprobante.setId(5L);
        comprobante.setEstado(Constants.COMPROBANTE_PENDIENTE);
        when(comprobanteRepository.findByPedidoId(1L)).thenReturn(Optional.of(comprobante));
        when(comprobanteRepository.findByIdForUpdate(5L)).thenReturn(Optional.of(comprobante));
        when(paymentService.confirmarPedido(pago)).thenReturn(PaymentOrderConfirmationService.Resultado.SOBREVENTA);

        service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, null);

        assertThat(comprobante.getEstado()).isEqualTo(Constants.COMPROBANTE_PENDIENTE);
        verify(comprobanteRepository, never()).save(any());
        assertThat(pedido.getEstadoPedido()).isNotEqualTo(Constants.PEDIDO_PAGADO);
    }

    @Test
    @DisplayName("con stock → sigue quedando PAGADO (sin cambio de comportamiento)")
    void conStock_quedaPagado() {
        when(paymentService.confirmarPedido(pago)).thenReturn(PaymentOrderConfirmationService.Resultado.CONFIRMADO);

        boolean sobreventa = service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1");

        assertThat(sobreventa).isFalse();
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
    }

    @Test
    @DisplayName("alerta a plataforma: la fachada avisa al admin IT sin PII")
    void fachada_avisaSobreventa() {
        PaymentNotificationsFacade facade = new PaymentNotificationsFacade();
        NotificacionEmailService email = mock(NotificacionEmailService.class);
        ReflectionTestUtils.setField(facade, "notificacionEmailService", email);
        pago.setMonto(15000);

        facade.onSobreventa(pago, "HC-MED2-1");

        verify(email).enviarAlertaSobreventaAAdminIT(10L, "HC-MED2-1", 15000, Constants.PROVEEDOR_MANUAL);
    }

    @Test
    @DisplayName("pendiente sin fila de Pago: el pago manual nuevo también chequea sobreventa → revisión")
    void sinPago_sobreventa_quedaEnRevision() {
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.empty());
        com.hotclick.model.Usuario cliente = new com.hotclick.model.Usuario();
        pedido.setUsuarioFinal(cliente);
        pedido.setTotalPedido(5000);
        when(paymentService.revisarSobreventa(any())).thenAnswer(inv -> {
            Pago nuevo = inv.getArgument(0);
            nuevo.setEstadoPago(Constants.PAGO_REEMBOLSO_PENDIENTE);
            pedido.setEstadoPedido(Constants.PEDIDO_REVISION_SOBREVENTA);
            return true;
        });

        boolean sobreventa = service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1");

        assertThat(sobreventa).isTrue();
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
        verify(pagoRepository).save(org.mockito.ArgumentMatchers.argThat(p ->
            Constants.PROVEEDOR_MANUAL.equals(p.getProveedor())));
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("pendiente sin fila de Pago y con stock → sigue quedando PAGADO")
    void sinPago_conStock_quedaPagado() {
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.empty());
        pedido.setUsuarioFinal(new com.hotclick.model.Usuario());
        when(paymentService.revisarSobreventa(any())).thenReturn(false);

        assertThat(service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1")).isFalse();
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
    }
}
