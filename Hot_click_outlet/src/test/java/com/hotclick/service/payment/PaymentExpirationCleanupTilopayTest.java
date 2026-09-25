package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentExpirationCleanup — Tilopay reconsulta")
class PaymentExpirationCleanupTilopayTest {

    @Mock private EmpresaRepository empresaRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private StockReservationService stockReservationService;
    @Mock private TilopayConfirmacionService tilopayConfirmacionService;

    @InjectMocks private PaymentExpirationCleanupService service;

    private Empresa empresa;
    private Pedido pedido;
    private Pago pagoTilopay;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(1L);
        empresa.setEstadoEmpresa("ACTIVO");

        pedido = new Pedido();
        pedido.setId(10L);
        pedido.setNumeroPedido("ORD-TILO");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);

        pagoTilopay = new Pago();
        pagoTilopay.setId(20L);
        pagoTilopay.setPedido(pedido);
        pagoTilopay.setProveedor(Constants.PROVEEDOR_TILOPAY);
        pagoTilopay.setEstadoPago(Constants.PAGO_PENDIENTE);
        pagoTilopay.setMerchantToken("ORD-TILO");
        pagoTilopay.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(40));

        when(empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO"))
            .thenReturn(List.of(empresa));
        when(pagoRepository.findExpiradosPendientesByEmpresa(any(), eq(1L)))
            .thenReturn(List.of(pagoTilopay));
    }

    @Test
    @DisplayName("Tilopay ya aprobado → confirma y no cancela")
    void tilopayAprobado_confirmaSinCancelar() {
        when(tilopayConfirmacionService.intentarConfirmarSiAprobado(pagoTilopay)).thenReturn(true);

        service.cancelarExpirados();

        assertThat(pagoTilopay.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(pagoRepository, never()).saveAll(anyList());
        verify(pedidoRepository, never()).saveAll(anyList());
        verify(stockReservationService, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("Tilopay no aprobado → cancela pago y pedido")
    void tilopayNoAprobado_cancela() {
        when(tilopayConfirmacionService.intentarConfirmarSiAprobado(pagoTilopay)).thenReturn(false);
        when(pagoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.cancelarExpirados();

        assertThat(pagoTilopay.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(stockReservationService).liberarReservas(pedido);
        verify(pagoRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("Reconsulta Tilopay falla → cancela igual (fail-safe)")
    void tilopayReconsultaFalla_cancela() {
        when(tilopayConfirmacionService.intentarConfirmarSiAprobado(pagoTilopay))
            .thenThrow(new RuntimeException("timeout"));
        when(pagoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        service.cancelarExpirados();

        assertThat(pagoTilopay.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        verify(stockReservationService).liberarReservas(pedido);
    }
}
