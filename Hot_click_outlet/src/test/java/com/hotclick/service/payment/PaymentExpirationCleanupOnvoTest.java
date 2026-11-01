package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

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
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PaymentExpirationCleanup — ONVO reconsulta antes de cancelar")
class PaymentExpirationCleanupOnvoTest {

    @Mock private EmpresaRepository empresaRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private StockReservationService stockReservationService;
    @Mock private TilopayConfirmacionService tilopayConfirmacionService;
    @Mock private OnvoPaymentProvider onvoPaymentProvider;
    @Mock private ReservaAntiBotService reservaAntiBot;
    @Mock private ReservaSospechosaLiberador reservaSospechosaLiberador;

    @InjectMocks private PaymentExpirationCleanupService service;

    private Pedido pedido;
    private Pago pagoOnvo;

    @BeforeEach
    void setUp() {
        when(reservaAntiBot.ahora()).thenAnswer(i -> LocalDateTime.now(Constants.ZONA_CR));
        Empresa empresa = new Empresa();
        empresa.setId(1L);
        empresa.setEstadoEmpresa("ACTIVO");

        pedido = new Pedido();
        pedido.setId(10L);
        pedido.setNumeroPedido("ORD-ONVO");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);

        pagoOnvo = new Pago();
        pagoOnvo.setId(20L);
        pagoOnvo.setPedido(pedido);
        pagoOnvo.setProveedor(Constants.PROVEEDOR_ONVO);
        pagoOnvo.setEstadoPago(Constants.PAGO_PENDIENTE);
        pagoOnvo.setMerchantToken("cs_vencida");

        when(empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")).thenReturn(List.of(empresa));
        when(pagoRepository.findExpiradosPendientesByEmpresa(any(), eq(1L))).thenReturn(List.of(pagoOnvo));
        when(pagoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        when(pedidoRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));
        ReflectionTestUtils.setField(service, "pagoExpiradoCancelador", new PagoExpiradoCancelador(pagoRepository,
            pedidoRepository, stockReservationService, new PedidoGrupoService(pedidoRepository, pagoRepository)));
        org.mockito.Mockito.lenient().when(pagoRepository.findByIdForUpdate(20L)).thenReturn(java.util.Optional.of(pagoOnvo));
    }

    private void noCancela() {
        assertThat(pagoOnvo.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(stockReservationService, never()).liberarReservas(any());
    }

    @Test
    @DisplayName("ONVO ya cobró (webhook atrasado o perdido) → se confirma y no se cancela")
    void onvoCobrado_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.OK);
        service.ejecutar();
        noCancela();
    }

    @Test
    @DisplayName("M-08: la reconsulta halla un cobro sin stock → pedido en revisión, el barrido no lo cancela")
    void onvoCobradoSinStock_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.COBRADO_SOBREVENTA);
        service.ejecutar();
        noCancela();
    }

    @Test
    @DisplayName("ONVO no responde → queda pendiente para la próxima vuelta (no se cancela algo que pudo cobrarse)")
    void onvoCaido_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup"))
            .thenThrow(new IllegalStateException("Servicio de pagos no disponible temporalmente"));
        service.ejecutar();
        noCancela();
    }

    @Test
    @DisplayName("ONVO cobró otro monto → no se cancela (queda para revisión con la alerta)")
    void montoDistinto_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.DATOS_DISTINTOS);
        service.ejecutar();
        noCancela();
    }

    @Test
    @DisplayName("N1: sin llave utilizable en producción → no se cancela un pago ONVO que pudo cobrarse")
    void sinLlave_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.NO_CONSULTABLE);
        service.ejecutar();
        noCancela();
        verify(onvoPaymentProvider, never()).expirarSesionSinCobro(any());
    }

    @Test
    @DisplayName("M2: el cobro sigue en proceso en ONVO (3DS, asíncrono) → no se cancela")
    void enProceso_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.EN_PROCESO);
        service.ejecutar();
        noCancela();
    }

    @Test
    @DisplayName("M2: sin cobro pero ONVO no deja la sesión expirada → no se cancela")
    void sinCobroSesionNoExpira_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.NO_PAGADO);
        when(onvoPaymentProvider.expirarSesionSinCobro("cs_vencida")).thenReturn(false);
        service.ejecutar();
        noCancela();
    }

    @Test
    @DisplayName("M2: sin cobro y ONVO no responde al expirar → no se cancela")
    void sinCobroExpirarFalla_noCancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.NO_PAGADO);
        when(onvoPaymentProvider.expirarSesionSinCobro("cs_vencida")).thenThrow(new IllegalStateException("caído"));
        service.ejecutar();
        noCancela();
    }

    @Test
    @DisplayName("ONVO dice que no hay cobro y expira la sesión → se cancela y se libera el stock")
    void sinCobro_cancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.NO_PAGADO);
        when(onvoPaymentProvider.expirarSesionSinCobro("cs_vencida")).thenReturn(true);
        service.ejecutar();
        assertThat(pagoOnvo.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
        verify(stockReservationService).liberarReservas(pedido);
    }

    @Test
    @DisplayName("ONVO no tiene la sesión → se cancela")
    void sesionInexistente_cancela() {
        when(onvoPaymentProvider.procesarPagoVerificado("cs_vencida", "cleanup")).thenReturn(Verificacion.NO_ENCONTRADO);
        service.ejecutar();
        assertThat(pagoOnvo.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
    }
}
