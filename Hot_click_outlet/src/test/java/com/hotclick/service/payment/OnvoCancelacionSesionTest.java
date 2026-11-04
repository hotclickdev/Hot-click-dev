package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * QA7-B1 ALTO: un pedido cancelado no puede seguir cobrándose en la misma URL de ONVO.
 * ONVO va mockeado (sin llave ni red).
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("QA7-B1 | Cancelar expira la sesión ONVO (fail-closed) y el respaldo revisa FALLIDO/CANCELADO")
class OnvoCancelacionSesionTest {

    @Mock private PedidoRepository pedidoRepository;
    @Mock private PagoRepository pagoRepository;
    @Mock private PaymentFailureHandler paymentFailureHandler;
    @Mock private GuestCancelTokenService guestCancelTokenService;
    @Mock private OnvoPaymentProvider onvoPaymentProvider;
    @Mock private OnvoService onvoService;
    @Mock private com.hotclick.service.sinpe.SinpeOnvoMarketplaceService sinpeOnvoMarketplaceService;

    @InjectMocks private PaymentUserCancellationService service;

    private Pago pago;

    @BeforeEach
    void setUp() {
        Pedido pedido = new Pedido();
        pedido.setId(21L);
        pedido.setNumeroPedido("ORD-B1");
        pedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        pago = new Pago();
        pago.setId(16L);
        pago.setPedido(pedido);
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setMerchantToken("cs_test_b1");
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        when(guestCancelTokenService.esValido("ORD-B1", "ok")).thenReturn(true);
        when(pedidoRepository.findByNumeroPedido("ORD-B1")).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(21L)).thenReturn(Optional.of(pago));
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.isMockMode()).thenReturn(false);
    }

    @Test
    @DisplayName("sin llave / cliente ONVO deshabilitado y con sesión: no cancela (409), fail-closed")
    void sinLlaveNoCancela() {
        when(onvoService.isPagosDisponibles()).thenReturn(false);

        assertThatThrownBy(() -> service.cancelarAnon("ORD-B1", "ok"))
            .isInstanceOf(IllegalStateException.class);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
        verify(onvoPaymentProvider, never()).expirarSesionParaCancelar(any());
    }

    @Test
    @DisplayName("pago ONVO sin sesión: cancela aunque no haya llave")
    void sinSesionCancelaSinLlave() {
        when(onvoService.isPagosDisponibles()).thenReturn(false);
        pago.setMerchantToken(null);

        service.cancelarAnon("ORD-B1", "ok");

        verifyNoInteractions(onvoPaymentProvider);
        verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }

    @Test
    @DisplayName("modo simulado explícito (isMockMode): cancela sin llamar a ONVO")
    void modoMockCancela() {
        when(onvoService.isMockMode()).thenReturn(true);
        when(onvoService.isPagosDisponibles()).thenReturn(true);

        service.cancelarAnon("ORD-B1", "ok");

        verifyNoInteractions(onvoPaymentProvider);
        verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }

    @Test
    @DisplayName("cancelar un pago ONVO expira la sesión en ONVO antes de marcarlo FALLIDO")
    void cancelarExpiraSesion() {
        when(onvoPaymentProvider.expirarSesionParaCancelar("cs_test_b1")).thenReturn(true);

        service.cancelarAnon("ORD-B1", "ok");

        var orden = inOrder(onvoPaymentProvider, paymentFailureHandler);
        orden.verify(onvoPaymentProvider).expirarSesionParaCancelar("cs_test_b1");
        orden.verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }

    @Test
    @DisplayName("si ONVO no confirma la expiración (ya pagada u otro estado) no se cancela")
    void onvoNoExpiraNoCancela() {
        when(onvoPaymentProvider.expirarSesionParaCancelar("cs_test_b1")).thenReturn(false);

        assertThatThrownBy(() -> service.cancelarAnon("ORD-B1", "ok"))
            .isInstanceOf(IllegalStateException.class);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("si ONVO falla (timeout/5xx/circuito abierto) no se cancela: fail-closed")
    void onvoFallaNoCancela() {
        when(onvoPaymentProvider.expirarSesionParaCancelar("cs_test_b1")).thenThrow(new RuntimeException("timeout"));

        assertThatThrownBy(() -> service.cancelarAnon("ORD-B1", "ok"))
            .isInstanceOf(IllegalStateException.class);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("pagos que no son ONVO no llaman a ONVO")
    void noOnvoNoLlama() {
        pago.setProveedor(Constants.PROVEEDOR_STRIPE);

        service.cancelarAnon("ORD-B1", "ok");

        verifyNoInteractions(onvoPaymentProvider);
        verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }

    // ---- Respaldo: FALLIDO/CANCELADO cobrados igual por ONVO ----

    private OnvoPendientesReconsultaService respaldo(OnvoService onvo, PlatformTransactionManager tm, int ventana) {
        return new OnvoPendientesReconsultaService(pagoRepository, onvo, onvoPaymentProvider,
            mock(OnvoRechazoService.class), tm, 20, 5, 200, ventana);
    }

    @Test
    @DisplayName("respaldo: FALLIDO cobrado en ONVO → COBRADO_SOBRE_CANCELADO (REEMBOLSO_PENDIENTE); NO_PAGADO o error → nada")
    void respaldoCerradosCobrados() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        OnvoRechazoService rechazo = mock(OnvoRechazoService.class);
        var srv = new OnvoPendientesReconsultaService(pagoRepository, onvo, onvoPaymentProvider, rechazo, tm, 20, 5, 200, 24);

        Pago cobrado = cerrado(16L, "cs_b1_cobrado", Constants.PAGO_FALLIDO);
        Pago noPagado = cerrado(17L, "cs_b1_nopagado", Constants.PAGO_CANCELADO);
        Pago error = cerrado(18L, "cs_b1_error", Constants.PAGO_FALLIDO);
        when(pagoRepository.reclamarPendientesParaReconsulta(any(), any(), any())).thenReturn(List.of());
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any(), any()))
            .thenReturn(List.of(cobrado, noPagado, error));
        when(onvoPaymentProvider.procesarPagoVerificado("cs_b1_cobrado", "respaldo"))
            .thenReturn(Verificacion.COBRADO_SOBRE_CANCELADO);
        when(onvoPaymentProvider.procesarPagoVerificado("cs_b1_nopagado", "respaldo")).thenReturn(Verificacion.NO_PAGADO);
        when(onvoPaymentProvider.procesarPagoVerificado("cs_b1_error", "respaldo")).thenThrow(new RuntimeException("5xx"));

        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
        srv.ejecutar();
        var r = srv.revisarCerrados();

        assertThat(r).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(3, 1));
        ArgumentCaptor<LocalDateTime> desde = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<Pageable> pag = ArgumentCaptor.forClass(Pageable.class);
        verify(pagoRepository, atLeastOnce()).reclamarCerradosParaReconsulta(eq(Constants.PROVEEDOR_ONVO), desde.capture(), any(), pag.capture());
        assertThat(desde.getValue()).isBetween(antes.minusSeconds(5), antes.plusSeconds(5));
        assertThat(pag.getValue().getPageSize()).isEqualTo(20);
        verifyNoInteractions(rechazo);
        // BAJO QA7-B1 (b): cada pago reclamado queda marcado para rotar en la próxima pasada.
        assertThat(List.of(cobrado, noPagado, error)).allSatisfy(p ->
            assertThat(p.getReconsultaCerradoEn()).isAfterOrEqualTo(antes.plusHours(24).minusSeconds(5)));
    }

    @Test
    @DisplayName("la query de cerrados filtra FALLIDO/CANCELADO de ONVO con sesión y reclama con lock SKIP LOCKED")
    void queryCerrados() throws Exception {
        var m = PagoRepository.class.getMethod("reclamarCerradosParaReconsulta", String.class, LocalDateTime.class, LocalDateTime.class, Pageable.class);
        String jpql = m.getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
        assertThat(jpql).contains("'FALLIDO'", "'CANCELADO'", "merchantToken IS NOT NULL", "fechaCreacion >= :desde");
        assertThat(jpql).doesNotContain("PENDIENTE");
        // BAJO QA7-B1 (b): sin starvation: nunca revisados primero, después el revisado hace más tiempo.
        assertThat(jpql).contains("ORDER BY p.reconsultaCerradoEn ASC NULLS FIRST, p.fechaCreacion ASC")
            .doesNotContain("DESC");
        assertThat(m.getAnnotation(org.springframework.data.jpa.repository.Lock.class).value())
            .isEqualTo(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        assertThat(m.getAnnotation(org.springframework.data.jpa.repository.QueryHints.class).value()[0].value()).isEqualTo("-2");
    }

    @Test
    @DisplayName("BAJO: un CANCELADO ya revisado no se reconsulta en cada corrida, solo tras el intervalo de reintento")
    void canceladoRevisadoNoSeReconsultaCadaCorrida() throws Exception {
        var m = PagoRepository.class.getMethod("reclamarCerradosParaReconsulta", String.class, LocalDateTime.class, LocalDateTime.class, Pageable.class);
        String jpql = m.getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
        assertThat(jpql).contains("p.estadoPago = 'CANCELADO' AND (p.reconsultaCerradoEn IS NULL OR p.reconsultaCerradoEn < :canceladoRevisadoAntes)")
            .contains("p.estadoPago = 'FALLIDO' OR");

        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        var srv = respaldo(onvo, tm, 24);
        srv.setCanceladoReintentoMinutos(45);
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any(), any())).thenReturn(List.of());
        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR);

        srv.revisarCerrados();

        ArgumentCaptor<LocalDateTime> corte = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(pagoRepository).reclamarCerradosParaReconsulta(eq(Constants.PROVEEDOR_ONVO), any(), corte.capture(), any());
        assertThat(corte.getValue()).isBetween(antes.minusMinutes(45).minusSeconds(5), antes.minusMinutes(45).plusSeconds(5));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setCanceladoReintentoMinutos(-1));
    }

    @Test
    @DisplayName("ventana 0 o ONVO no disponible: no reconsulta cerrados")
    void ventanaCeroNoReconsulta() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        var srv = respaldo(onvo, mock(PlatformTransactionManager.class), 0);
        assertThat(srv.revisarCerrados()).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(0, 0));
        verify(pagoRepository, never()).reclamarCerradosParaReconsulta(anyString(), any(), any(), any());
    }

    private static Pago cerrado(long id, String sesion, String estado) {
        Pago p = new Pago();
        p.setId(id);
        p.setProveedor(Constants.PROVEEDOR_ONVO);
        p.setMerchantToken(sesion);
        p.setEstadoPago(estado);
        return p;
    }

    // ---- Cancelación desde el panel: pago cobrado y cerrarIntentSinpeOnvo ----

    private Pedido pedidoPanel() {
        return pago.getPedido();
    }

    private void comoSinpeOnvo() {
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setMerchantToken(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.PREFIJO + "pi_test_1");
    }

    @Test
    @DisplayName("panel: pago CAPTURADO → 409 sin tocar ONVO")
    void panelCapturadoNoCancela() {
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelar(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
        verifyNoInteractions(onvoPaymentProvider, sinpeOnvoMarketplaceService);
    }

    @Test
    @DisplayName("panel: pago en estado PAGADO → 409")
    void panelPagadoNoCancela() {
        pago.setEstadoPago("PAGADO");
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelar(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
    }

    @Test
    @DisplayName("cerrarIntentSinpeOnvo: ONVO ya cobró el intent SINPE → 409")
    void sinpeIntentPagadoNoCancela() {
        comoSinpeOnvo();
        when(sinpeOnvoMarketplaceService.cerrarIntentParaComprador(pago))
            .thenReturn(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador.PAGADO);
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelar(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
    }

    @Test
    @DisplayName("cerrarIntentSinpeOnvo: ONVO no confirma el cierre → 409")
    void sinpeIntentNoConfirmadoNoCancela() {
        comoSinpeOnvo();
        when(sinpeOnvoMarketplaceService.cerrarIntentParaComprador(pago))
            .thenReturn(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador.NO_CONFIRMADO);
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelar(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
    }

    @Test
    @DisplayName("cerrarIntentSinpeOnvo: intent cancelado en ONVO → se puede cancelar")
    void sinpeIntentCanceladoPermite() {
        comoSinpeOnvo();
        when(sinpeOnvoMarketplaceService.cerrarIntentParaComprador(pago))
            .thenReturn(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador.CANCELADO);
        service.cerrarPagoOnvoAntesDeCancelar(pedidoPanel());
        verify(sinpeOnvoMarketplaceService).cerrarIntentParaComprador(pago);
    }

    @Test
    @DisplayName("pagoCobrado: CAPTURADO/PAGADO sí; PENDIENTE/FALLIDO/CANCELADO no")
    void pagoCobradoEstados() {
        assertThat(PaymentUserCancellationService.pagoCobrado("CAPTURADO")).isTrue();
        assertThat(PaymentUserCancellationService.pagoCobrado("PAGADO")).isTrue();
        assertThat(PaymentUserCancellationService.pagoCobrado("PENDIENTE")).isFalse();
        assertThat(PaymentUserCancellationService.pagoCobrado("FALLIDO")).isFalse();
        assertThat(PaymentUserCancellationService.pagoCobrado(null)).isFalse();
    }
}
