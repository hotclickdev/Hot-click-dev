package com.hotclick.service.pedido;

import com.hotclick.model.ComprobanteSinpe;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * P-02 (regresión): confirmar un pago manual compite con la limpieza TTL que lo cancela, o con otra
 * confirmación. El estado se tiene que leer bajo FOR UPDATE y releído de la base; si otro lo cerró
 * mientras tanto, la confirmación falla sin capturar ni pisar el pedido.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("P-02: confirmar pago manual toma lock y relee el estado")
class PedidoPagoManualLockTest {

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
        pedido.setNumeroPedido("HC-TEST-1");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago = new Pago();
        pago.setId(10L);
        pago.setProveedor(Constants.PROVEEDOR_MANUAL);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(pedido);
        when(companyScope.isAdminIT()).thenReturn(true);
        when(pedidoGrupoService.delGrupo(pedido)).thenReturn(List.of(pedido));
        when(entityManager.contains(any())).thenReturn(true);
    }

    @Test
    @DisplayName("la limpieza TTL canceló el pago mientras tanto → no captura ni marca PAGADO")
    void pagoCanceladoPorOtraTransaccion_noSeCaptura() {
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.of(pago));
        // Simula lo que el FOR UPDATE ve al obtener el lock: la otra transacción ya commiteó CANCELADO.
        doAnswer(inv -> { pago.setEstadoPago(Constants.PAGO_CANCELADO); return null; })
            .when(entityManager).refresh(pago, LockModeType.PESSIMISTIC_WRITE);

        assertThatThrownBy(() -> service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1"))
            .isInstanceOf(IllegalStateException.class);

        verify(pagoRepository, never()).save(any());
        verify(paymentService, never()).confirmarPedido(any());
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("pago sigue PENDIENTE → el lock se toma antes de capturar")
    void pagoPendiente_seBloqueaAntesDeCapturar() {
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.of(pago));

        service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1");

        InOrder orden = inOrder(entityManager, pagoRepository, paymentService);
        orden.verify(entityManager).refresh(pago, LockModeType.PESSIMISTIC_WRITE);
        orden.verify(pagoRepository).save(pago);
        orden.verify(paymentService).confirmarPedido(pago);
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
    }

    @Test
    @DisplayName("comprobante resuelto por otra transacción → no se aprueba dos veces")
    void comprobanteYaResuelto_noSeApruebaDeNuevo() {
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.empty());
        ComprobanteSinpe comprobante = new ComprobanteSinpe();
        comprobante.setEstado(Constants.COMPROBANTE_PENDIENTE);
        when(comprobanteRepository.findByPedidoId(1L)).thenReturn(Optional.of(comprobante));
        doAnswer(inv -> { comprobante.setEstado(Constants.COMPROBANTE_RECHAZADO); return null; })
            .when(entityManager).refresh(comprobante, LockModeType.PESSIMISTIC_WRITE);

        assertThatThrownBy(() -> service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, null))
            .isInstanceOf(IllegalArgumentException.class);

        verify(comprobanteRepository, never()).save(any());
        assertThat(comprobante.getEstado()).isEqualTo(Constants.COMPROBANTE_RECHAZADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("pago fuera del contexto → se relee con FOR UPDATE por id, no se salta el lock")
    void pagoNoGestionado_seBloqueaPorId() {
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.of(pago));
        when(entityManager.contains(pago)).thenReturn(false);
        Pago enBase = new Pago();
        enBase.setId(10L);
        enBase.setProveedor(Constants.PROVEEDOR_MANUAL);
        enBase.setEstadoPago(Constants.PAGO_CANCELADO);
        enBase.setPedido(pedido);
        when(pagoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(enBase));

        assertThatThrownBy(() -> service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1"))
            .isInstanceOf(IllegalStateException.class);

        verify(pagoRepository).findByIdForUpdate(10L);
        verify(entityManager, never()).refresh(any(), any(LockModeType.class));
        verify(pagoRepository, never()).save(any());
        verify(paymentService, never()).confirmarPedido(any());
    }

    @Test
    @DisplayName("pago fuera del contexto y sin id → error explícito, nunca sin lock")
    void pagoNoGestionadoSinId_fallaExplicito() {
        pago.setId(null);
        when(pedidoGrupoService.pagoDelGrupo(pedido)).thenReturn(Optional.of(pago));
        when(entityManager.contains(pago)).thenReturn(false);

        assertThatThrownBy(() -> service.confirmar(pedido, Constants.PEDIDO_PENDIENTE, "REF-1"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("lock");
        verify(paymentService, never()).confirmarPedido(any());
    }
}
