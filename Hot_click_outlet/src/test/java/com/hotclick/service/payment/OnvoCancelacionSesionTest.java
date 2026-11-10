package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.payment.OnvoPaymentProvider.Verificacion;
import com.hotclick.payment.OnvoPaymentProvider.CobroIntent;
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
        when(onvoPaymentProvider.revisarCobro("cs_test_b1", "cancelacion", false))
            .thenReturn(new OnvoPaymentProvider.RevisionCobro(OnvoPaymentProvider.CobroIntent.SIN_COBRO, "canceled"));

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

    private OnvoPendientesReconsultaService respaldo(OnvoService onvo, PlatformTransactionManager tm, boolean habilitado) {
        return new OnvoPendientesReconsultaService(pagoRepository, onvo, onvoPaymentProvider,
            mock(OnvoRechazoService.class), tm, 20, 5, 200, habilitado);
    }

    @Test
    @DisplayName("respaldo: FALLIDO cobrado en ONVO → COBRADO_SOBRE_CANCELADO (REEMBOLSO_PENDIENTE); NO_PAGADO o error → se reagenda")
    void respaldoCerradosCobrados() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        OnvoRechazoService rechazo = mock(OnvoRechazoService.class);
        var srv = new OnvoPendientesReconsultaService(pagoRepository, onvo, onvoPaymentProvider, rechazo, tm, 20, 5, 200, true);

        Pago cobrado = cerrado(16L, "cs_b1_cobrado", Constants.PAGO_FALLIDO);
        Pago noPagado = cerrado(17L, "cs_b1_nopagado", Constants.PAGO_CANCELADO);
        Pago error = cerrado(18L, "cs_b1_error", Constants.PAGO_FALLIDO);
        error.setConciliacionIntentos(4);
        when(pagoRepository.reclamarPendientesParaReconsulta(any(), any(), any(), any())).thenReturn(List.of());
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any()))
            .thenReturn(List.of(cobrado, noPagado, error));
        when(onvoPaymentProvider.procesarPagoVerificado("cs_b1_cobrado", "respaldo"))
            .thenReturn(Verificacion.COBRADO_SOBRE_CANCELADO);
        when(onvoPaymentProvider.procesarPagoVerificado("cs_b1_nopagado", "respaldo")).thenReturn(Verificacion.NO_PAGADO);
        when(onvoPaymentProvider.procesarPagoVerificado("cs_b1_error", "respaldo")).thenThrow(new RuntimeException("5xx"));

        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR);
        var r = srv.revisarCerrados();

        assertThat(r).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(3, 1));
        ArgumentCaptor<LocalDateTime> ahora = ArgumentCaptor.forClass(LocalDateTime.class);
        ArgumentCaptor<Pageable> pag = ArgumentCaptor.forClass(Pageable.class);
        verify(pagoRepository, atLeastOnce()).reclamarCerradosParaReconsulta(eq(Constants.PROVEEDOR_ONVO), ahora.capture(), pag.capture());
        // fix2: sin corte de 24 h; se pasa "ahora" para las próximas reconsultas vencidas.
        assertThat(ahora.getValue()).isBetween(antes.minusSeconds(5), antes.plusSeconds(5));
        // fix2 (tormenta de históricos): lote de conciliación propio (10): 5 reintentos vencidos + 5 nunca agendados.
        assertThat(pag.getValue().getPageSize()).isEqualTo(5);
        verify(pagoRepository).reclamarCerradosNuevos(eq(Constants.PROVEEDOR_ONVO), pag.capture());
        assertThat(pag.getValue().getPageSize()).isEqualTo(5);
        verifyNoInteractions(rechazo);
        // Cada pago reclamado queda agendado (backoff) ANTES de llamar a ONVO: 1.º intento 2 min, 5.º intento 32 min.
        ArgumentCaptor<LocalDateTime> proxima = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(pagoRepository).agendarConciliacion(eq(16L), any(), proxima.capture());
        assertThat(proxima.getValue()).isBetween(antes.plusMinutes(2).minusSeconds(5), antes.plusMinutes(2).plusSeconds(5));
        verify(pagoRepository).agendarConciliacion(eq(18L), any(), proxima.capture());
        assertThat(proxima.getValue()).isBetween(antes.plusMinutes(32).minusSeconds(5), antes.plusMinutes(32).plusSeconds(5));
        verify(pagoRepository, never()).marcarConciliacionResuelta(any(), any());
    }

    @Test
    @DisplayName("fix2: las queries de cerrados no cortan por antigüedad, reclaman con SKIP LOCKED y separan nuevos de reintentos")
    void queryCerrados() throws Exception {
        var m = PagoRepository.class.getMethod("reclamarCerradosParaReconsulta", String.class, LocalDateTime.class, Pageable.class);
        String jpql = m.getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
        assertThat(jpql).contains("'FALLIDO'", "'CANCELADO'", "merchantToken IS NOT NULL",
            "p.conciliacionResueltaEn IS NULL", "p.conciliacionProximaEn IS NOT NULL AND p.conciliacionProximaEn <= :ahora");
        assertThat(jpql).doesNotContain("PENDIENTE").doesNotContain("fechaCreacion >=").doesNotContain(":desde");
        assertThat(jpql).contains("ORDER BY p.conciliacionProximaEn ASC, p.fechaCreacion ASC").doesNotContain("DESC");
        assertThat(m.getAnnotation(org.springframework.data.jpa.repository.Lock.class).value())
            .isEqualTo(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        assertThat(m.getAnnotation(org.springframework.data.jpa.repository.QueryHints.class).value()[0].value()).isEqualTo("-2");

        var n = PagoRepository.class.getMethod("reclamarCerradosNuevos", String.class, Pageable.class);
        String nuevos = n.getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
        assertThat(nuevos).contains("'FALLIDO'", "'CANCELADO'", "p.conciliacionResueltaEn IS NULL",
            "p.conciliacionProximaEn IS NULL", "ORDER BY p.fechaCreacion DESC").doesNotContain("fechaCreacion >=");
        assertThat(n.getAnnotation(org.springframework.data.jpa.repository.Lock.class).value())
            .isEqualTo(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        assertThat(n.getAnnotation(org.springframework.data.jpa.repository.QueryHints.class).value()[0].value()).isEqualTo("-2");
    }

    @Test
    @DisplayName("fix2 tormenta: sin referencia (404 sin intent) → tope directo y UNA alerta resumen por corrida")
    void sinReferenciaTopeYResumen() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        var srv = respaldo(onvo, tm, true);
        Pago nuevo = cerrado(31L, "cs_sinref_nuevo", Constants.PAGO_CANCELADO);
        Pago yaMarcado = cerrado(32L, "cs_sinref_viejo", Constants.PAGO_FALLIDO);
        yaMarcado.setConciliacionSinReferenciaEn(LocalDateTime.now(Constants.ZONA_CR).minusDays(3));
        when(pagoRepository.reclamarCerradosNuevos(any(), any())).thenReturn(List.of(nuevo));
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any())).thenReturn(List.of(yaMarcado));
        when(onvoPaymentProvider.procesarPagoVerificado(any(), eq("respaldo"))).thenReturn(Verificacion.NO_ENCONTRADO);
        when(onvoPaymentProvider.revisarCobro("cs_sinref_nuevo", "respaldo", true)).thenReturn(
            new com.hotclick.payment.OnvoPaymentProvider.RevisionCobro(CobroIntent.EN_DUDA, null, true, true));
        when(onvoPaymentProvider.revisarCobro("cs_sinref_viejo", "respaldo", true)).thenReturn(
            new com.hotclick.payment.OnvoPaymentProvider.RevisionCobro(CobroIntent.EN_DUDA, null, true, false));
        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR);

        assertThat(srv.revisarCerrados()).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(2, 0));

        ArgumentCaptor<LocalDateTime> proxima = ArgumentCaptor.forClass(LocalDateTime.class);
        // Ya marcado: el reclamo lo agenda directo al tope (no 2 min); y tras el 404 se mantiene en el tope.
        verify(pagoRepository, org.mockito.Mockito.times(2)).agendarConciliacion(eq(32L), any(), proxima.capture());
        proxima.getAllValues().forEach(v ->
            assertThat(v).isBetween(antes.plusMinutes(1440).minusSeconds(5), antes.plusMinutes(1440).plusSeconds(5)));
        // Nuevo: el reclamo lo agenda a 2 min (aún no se sabía) y al quedar sin referencia pasa al tope.
        ArgumentCaptor<LocalDateTime> p31 = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(pagoRepository, org.mockito.Mockito.times(2)).agendarConciliacion(eq(31L), any(), p31.capture());
        assertThat(p31.getAllValues().get(1))
            .isBetween(antes.plusMinutes(1440).minusSeconds(5), antes.plusMinutes(1440).plusSeconds(5));
        verify(pagoRepository, never()).marcarConciliacionResuelta(any(), any());
    }

    @Test
    @DisplayName("fix2: lote de conciliación configurable y acotado por lote-max")
    void loteConciliacionValidado() {
        var srv = respaldo(mock(OnvoService.class), mock(PlatformTransactionManager.class), true);
        srv.setLoteConciliacion(1);
        srv.setLoteConciliacion(200);
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setLoteConciliacion(0));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setLoteConciliacion(201));
    }

    @Test
    @DisplayName("fix2: backoff exponencial con tope (nunca se abandona por edad) y validación de la config")
    void backoffConTope() {
        var srv = respaldo(mock(OnvoService.class), mock(PlatformTransactionManager.class), true);
        assertThat(srv.esperaMinutos(1)).isEqualTo(2);
        assertThat(srv.esperaMinutos(2)).isEqualTo(4);
        assertThat(srv.esperaMinutos(10)).isEqualTo(1024);
        assertThat(srv.esperaMinutos(11)).isEqualTo(1440);
        assertThat(srv.esperaMinutos(500)).isEqualTo(1440);
        srv.setBackoff(5, 60, 3);
        assertThat(srv.esperaMinutos(1)).isEqualTo(5);
        assertThat(srv.esperaMinutos(9)).isEqualTo(60);
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setBackoff(0, 60, 3));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setBackoff(10, 5, 3));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setBackoff(1, 5, 0));
    }

    @Test
    @DisplayName("fix2: intent canceled en ONVO → conciliación resuelta (deja de reconsultarse); requires_payment_method → sigue")
    void canceladoResuelveRequiresPaymentMethodSigue() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        var srv = respaldo(onvo, tm, true);
        Pago cancelado = cerrado(21L, "cs_canc", Constants.PAGO_CANCELADO);
        Pago abierto = cerrado(22L, "cs_rpm", Constants.PAGO_CANCELADO);
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any())).thenReturn(List.of(cancelado, abierto));
        when(onvoPaymentProvider.procesarPagoVerificado(any(), eq("respaldo"))).thenReturn(Verificacion.NO_PAGADO);
        when(onvoPaymentProvider.revisarCobro("cs_canc", "respaldo", true)).thenReturn(
            new com.hotclick.payment.OnvoPaymentProvider.RevisionCobro(CobroIntent.SIN_COBRO, "canceled"));
        when(onvoPaymentProvider.revisarCobro("cs_rpm", "respaldo", true)).thenReturn(
            new com.hotclick.payment.OnvoPaymentProvider.RevisionCobro(CobroIntent.SIN_COBRO, "requires_payment_method"));

        assertThat(srv.revisarCerrados()).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(2, 0));

        verify(pagoRepository).marcarConciliacionResuelta(eq(21L), any());
        verify(pagoRepository, never()).marcarConciliacionResuelta(eq(22L), any());
    }

    @Test
    @DisplayName("deshabilitado o ONVO no disponible: no reconsulta cerrados")
    void ventanaCeroNoReconsulta() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        var srv = respaldo(onvo, mock(PlatformTransactionManager.class), false);
        assertThat(srv.revisarCerrados()).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(0, 0));
        verify(pagoRepository, never()).reclamarCerradosParaReconsulta(anyString(), any(), any());
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

    // ---- fix2: intención antes de red ----

    @Test
    @DisplayName("fix2: la intención se confirma en su propia transacción ANTES de expirar en ONVO")
    void intencionAntesDeRed() {
        CancelacionIntencionService intencion = mock(CancelacionIntencionService.class);
        when(intencion.registrar(any(), any())).thenReturn(true);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "cancelacionIntencionService", intencion);
        when(onvoPaymentProvider.expirarSesionParaCancelar("cs_test_b1")).thenReturn(true);
        when(onvoPaymentProvider.revisarCobro("cs_test_b1", "cancelacion", false))
            .thenReturn(new OnvoPaymentProvider.RevisionCobro(OnvoPaymentProvider.CobroIntent.SIN_COBRO, "canceled"));

        service.cancelarAnon("ORD-B1", "ok");

        var orden = inOrder(intencion, onvoPaymentProvider, paymentFailureHandler);
        orden.verify(intencion).registrar(pago.getId(), "INVITADO");
        orden.verify(onvoPaymentProvider).expirarSesionParaCancelar("cs_test_b1");
        orden.verify(paymentFailureHandler).marcarFallido(pago, "Cancelado por el usuario");
    }

    @Test
    @DisplayName("fix2: expire falla con la intención guardada → 409 veraz (cancelación registrada), sin cancelar")
    void expireFallaConIntencion() {
        CancelacionIntencionService intencion = mock(CancelacionIntencionService.class);
        when(intencion.registrar(any(), any())).thenReturn(true);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "cancelacionIntencionService", intencion);
        when(onvoPaymentProvider.expirarSesionParaCancelar("cs_test_b1")).thenThrow(new RuntimeException("timeout"));

        assertThatThrownBy(() -> service.cancelarAnon("ORD-B1", "ok"))
            .isInstanceOf(CancelacionPendienteOnvoException.class)
            .hasMessage(PaymentUserCancellationService.MSG_CANCELACION_REGISTRADA);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("fix2: si no se puede guardar la intención no se llama a ONVO ni se cancela (fail-closed)")
    void sinIntencionNoHayRed() {
        CancelacionIntencionService intencion = mock(CancelacionIntencionService.class);
        when(intencion.registrar(any(), any())).thenThrow(new org.springframework.dao.QueryTimeoutException("db"));
        org.springframework.test.util.ReflectionTestUtils.setField(service, "cancelacionIntencionService", intencion);

        assertThatThrownBy(() -> service.cancelarAnon("ORD-B1", "ok"))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("No pudimos registrar la cancelación");
        verify(onvoPaymentProvider, never()).expirarSesionParaCancelar(any());
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }
}
