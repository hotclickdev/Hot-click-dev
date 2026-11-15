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

    // fix2: dependencia obligatoria (en Spring la inyecta @PersistenceContext); contains()=false → findByIdForUpdate.
    @Mock private jakarta.persistence.EntityManager entityManager;
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
        when(pagoRepository.findByIdForUpdate(16L)).thenReturn(Optional.of(pago));
        // fix2: sin bean de intención (unitario) el UPDATE va por el repositorio; la intención "quedó" en la base.
        when(pagoRepository.cancelacionSolicitadaEnBase(16L)).thenReturn(Optional.of(java.time.LocalDateTime.now()));
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
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any(), any()))
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
        verify(pagoRepository, atLeastOnce()).reclamarCerradosParaReconsulta(eq(Constants.PROVEEDOR_ONVO), ahora.capture(), any(), any());
        // fix2: sin corte de 24 h; se pasa "ahora" para las próximas reconsultas vencidas.
        assertThat(ahora.getValue()).isBetween(antes.minusSeconds(5), antes.plusSeconds(5));
        // fix2 (fairness): lote 10. Recientes hasta 5 (acá ninguno) → históricos vencidos hasta 5 (llegan 3) →
        // nunca agendados con lo que sobra (7) → relleno de recientes (7).
        verify(pagoRepository, times(2)).reclamarCerradosRecientes(eq(Constants.PROVEEDOR_ONVO), any(), any(), pag.capture());
        // 1.º recientes (cuota 5); 2.º relleno con lo que dejaron libre los históricos (10 - 3 = 7).
        assertThat(pag.getAllValues()).extracting(Pageable::getPageSize).containsExactly(5, 7);
        ArgumentCaptor<Pageable> pv = ArgumentCaptor.forClass(Pageable.class);
        verify(pagoRepository).reclamarCerradosParaReconsulta(eq(Constants.PROVEEDOR_ONVO), any(), any(), pv.capture());
        assertThat(pv.getValue().getPageSize()).isEqualTo(5);
        ArgumentCaptor<Pageable> pn = ArgumentCaptor.forClass(Pageable.class);
        verify(pagoRepository).reclamarCerradosNuevos(eq(Constants.PROVEEDOR_ONVO), any(), pn.capture());
        assertThat(pn.getValue().getPageSize()).isEqualTo(7);
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
    @DisplayName("fix2: queries de cerrados disjuntas (recientes / históricos vencidos / nunca agendados), SKIP LOCKED, sin abandono por edad")
    void queryCerrados() throws Exception {
        var rec = PagoRepository.class.getMethod("reclamarCerradosRecientes", String.class, LocalDateTime.class,
            LocalDateTime.class, Pageable.class);
        var venc = PagoRepository.class.getMethod("reclamarCerradosParaReconsulta", String.class, LocalDateTime.class,
            LocalDateTime.class, Pageable.class);
        var nue = PagoRepository.class.getMethod("reclamarCerradosNuevos", String.class, LocalDateTime.class, Pageable.class);
        for (var m : List.of(rec, venc, nue)) {
            String jpql = m.getAnnotation(org.springframework.data.jpa.repository.Query.class).value();
            assertThat(jpql).contains("'FALLIDO'", "'CANCELADO'", "merchantToken IS NOT NULL", "p.conciliacionResueltaEn IS NULL")
                .doesNotContain("PENDIENTE").doesNotContain(":desde");
            assertThat(m.getAnnotation(org.springframework.data.jpa.repository.Lock.class).value())
                .isEqualTo(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            assertThat(m.getAnnotation(org.springframework.data.jpa.repository.QueryHints.class).value()[0].value()).isEqualTo("-2");
        }
        // La edad solo particiona (corte) y ordena: recientes >= corte; históricos < corte (o sin fecha).
        assertThat(rec.getAnnotation(org.springframework.data.jpa.repository.Query.class).value())
            .contains("p.fechaCreacion >= :corte", "(p.conciliacionProximaEn IS NULL OR p.conciliacionProximaEn <= :ahora)");
        assertThat(venc.getAnnotation(org.springframework.data.jpa.repository.Query.class).value())
            .contains("(p.fechaCreacion < :corte OR p.fechaCreacion IS NULL)",
                "p.conciliacionProximaEn IS NOT NULL AND p.conciliacionProximaEn <= :ahora",
                "ORDER BY p.conciliacionProximaEn ASC");
        assertThat(nue.getAnnotation(org.springframework.data.jpa.repository.Query.class).value())
            .contains("(p.fechaCreacion < :corte OR p.fechaCreacion IS NULL)", "p.conciliacionProximaEn IS NULL",
                "ORDER BY p.fechaCreacion DESC");
    }

    @Test
    @DisplayName("fix2 fairness: con recientes que llenan su cuota, los históricos igual avanzan (sin inanición)")
    void fairnessRecientesYHistoricos() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        var srv = respaldo(onvo, tm, true);
        List<Pago> recientes = new java.util.ArrayList<>();
        for (long i = 0; i < 5; i++) recientes.add(cerrado(100 + i, "cs_rec_" + i, Constants.PAGO_CANCELADO));
        when(pagoRepository.reclamarCerradosRecientes(any(), any(), any(), any())).thenReturn(recientes, List.of());
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any(), any()))
            .thenReturn(List.of(cerrado(200, "cs_hv", Constants.PAGO_FALLIDO)));
        when(pagoRepository.reclamarCerradosNuevos(any(), any(), any()))
            .thenReturn(List.of(cerrado(300, "cs_hn", Constants.PAGO_FALLIDO)));
        when(onvoPaymentProvider.procesarPagoVerificado(any(), eq("respaldo"))).thenReturn(Verificacion.EN_PROCESO);

        assertThat(srv.revisarCerrados().revisados()).isEqualTo(7);

        ArgumentCaptor<Pageable> pag = ArgumentCaptor.forClass(Pageable.class);
        verify(pagoRepository).reclamarCerradosParaReconsulta(any(), any(), any(), pag.capture());
        assertThat(pag.getValue().getPageSize()).isEqualTo(3);
        verify(pagoRepository).reclamarCerradosNuevos(any(), any(), pag.capture());
        assertThat(pag.getValue().getPageSize()).isEqualTo(4);
        verify(pagoRepository).agendarConciliacion(eq(200L), any(), any());
        verify(pagoRepository).agendarConciliacion(eq(300L), any(), any());
    }

    private OnvoPendientesReconsultaService respaldoConMocks() {
        OnvoService onvo = mock(OnvoService.class);
        when(onvo.isPagosDisponibles()).thenReturn(true);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        return respaldo(onvo, tm, true);
    }

    @Test
    @DisplayName("fix2 backlog: limitador ShedLock (nombre exclusivo, ventana = lockAtMostFor = lockAtLeastFor); sin ventana en memoria")
    void backlogAlertaConLimitador() {
        var srv = respaldoConMocks();
        srv.setFairness(72, 100, 60);
        net.javacrumbs.shedlock.core.LockProvider lp = mock(net.javacrumbs.shedlock.core.LockProvider.class);
        net.javacrumbs.shedlock.core.SimpleLock tomado = mock(net.javacrumbs.shedlock.core.SimpleLock.class);
        when(lp.lock(any())).thenReturn(java.util.Optional.of(tomado), java.util.Optional.empty());
        srv.setLockProvider(lp);
        when(pagoRepository.contarBacklogConciliacion(any(), any())).thenReturn(5000L);
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);

        assertThat(srv.alertarBacklog(ahora)).isTrue();
        assertThat(srv.alertarBacklog(ahora)).as("otra instancia/corrida con la ventana tomada").isFalse();

        ArgumentCaptor<net.javacrumbs.shedlock.core.LockConfiguration> cfg =
            ArgumentCaptor.forClass(net.javacrumbs.shedlock.core.LockConfiguration.class);
        verify(lp, times(2)).lock(cfg.capture());
        assertThat(cfg.getValue().getName()).isEqualTo("alerta_backlog_conciliacion_onvo");
        assertThat(cfg.getValue().getLockAtMostFor()).isEqualTo(java.time.Duration.ofMinutes(60));
        assertThat(cfg.getValue().getLockAtLeastFor()).isEqualTo(java.time.Duration.ofMinutes(60));
        verify(tomado).unlock();
        // Bajo el umbral no se toca el limitador.
        when(pagoRepository.contarBacklogConciliacion(any(), any())).thenReturn(99L);
        assertThat(srv.alertarBacklog(ahora)).isFalse();
        verify(lp, times(2)).lock(any());
        assertThat(java.util.Arrays.stream(OnvoPendientesReconsultaService.class.getDeclaredFields())
            .map(java.lang.reflect.Field::getName)).doesNotContain("ultimaAlertaBacklog");
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setFairness(0, 1, 1));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setFairness(1, 0, 1));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setFairness(1, 1, 0));
    }

    @Test
    @DisplayName("fix2 backlog: sin limitador no hay alerta (sin fallback en memoria), aunque se llame muchas veces")
    void backlogSinLimitadorNoAlerta() {
        var srv = respaldoConMocks();
        when(pagoRepository.contarBacklogConciliacion(any(), any())).thenReturn(5000L);
        for (int i = 0; i < 3; i++) {
            assertThat(srv.alertarBacklog(LocalDateTime.now(Constants.ZONA_CR))).isFalse();
        }
    }

    @Test
    @DisplayName("fix2 backlog: dentro de una transacción activa no se intenta el limitador")
    void backlogDentroDeTransaccionNoIntenta() {
        var srv = respaldoConMocks();
        net.javacrumbs.shedlock.core.LockProvider lp = mock(net.javacrumbs.shedlock.core.LockProvider.class);
        srv.setLockProvider(lp);
        when(pagoRepository.contarBacklogConciliacion(any(), any())).thenReturn(5000L);
        org.springframework.transaction.support.TransactionSynchronizationManager.setActualTransactionActive(true);
        try {
            assertThat(srv.alertarBacklog(LocalDateTime.now(Constants.ZONA_CR))).isFalse();
        } finally {
            org.springframework.transaction.support.TransactionSynchronizationManager.setActualTransactionActive(false);
        }
        verifyNoInteractions(lp);
    }

    @Test
    @DisplayName("fix2 backlog: si el limitador falla, la conciliación ya escrita no cambia ni se propaga el error")
    void backlogFallaLimitadorNoAlteraConciliacion() {
        var srv = respaldoConMocks();
        net.javacrumbs.shedlock.core.LockProvider lp = mock(net.javacrumbs.shedlock.core.LockProvider.class);
        when(lp.lock(any())).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("bd caida"));
        srv.setLockProvider(lp);
        when(pagoRepository.contarBacklogConciliacion(any(), any())).thenReturn(5000L);
        Pago p = cerrado(400L, "cs_bl_falla", Constants.PAGO_CANCELADO);
        when(pagoRepository.reclamarCerradosRecientes(any(), any(), any(), any())).thenReturn(List.of(p), List.of());
        when(onvoPaymentProvider.procesarPagoVerificado(any(), eq("respaldo"))).thenReturn(Verificacion.EN_PROCESO);

        assertThat(srv.revisarCerrados()).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(1, 0));
        verify(pagoRepository).agendarConciliacion(eq(400L), any(), any());
        verify(lp).lock(any());
        assertThat(srv.alertarBacklog(LocalDateTime.now(Constants.ZONA_CR))).as("sin reclamo no hay alerta").isFalse();
        // Recuperado el limitador, el aviso posterior sale (la falla no bloqueó ventanas futuras).
        net.javacrumbs.shedlock.core.SimpleLock tomado = mock(net.javacrumbs.shedlock.core.SimpleLock.class);
        org.mockito.Mockito.doThrow(new IllegalStateException("unlock")).when(tomado).unlock();
        org.mockito.Mockito.reset(lp);
        when(lp.lock(any())).thenReturn(java.util.Optional.of(tomado));
        assertThat(srv.alertarBacklog(LocalDateTime.now(Constants.ZONA_CR))).isTrue();
    }

    @Test
    @DisplayName("fix2 fairness lote 4: con las tres clases saturadas cada una recibe al menos un lugar")
    void fairnessLoteCuatroGarantizaClases() {
        var srv = respaldoConMocks();
        srv.setLoteConciliacion(4);
        List<Pago> recientes = new java.util.ArrayList<>();
        List<Pago> vencidos = new java.util.ArrayList<>();
        List<Pago> nuevos = new java.util.ArrayList<>();
        for (long i = 0; i < 4; i++) {
            recientes.add(cerrado(500 + i, "cs_l4_rec_" + i, Constants.PAGO_CANCELADO));
            vencidos.add(cerrado(600 + i, "cs_l4_ven_" + i, Constants.PAGO_FALLIDO));
            nuevos.add(cerrado(700 + i, "cs_l4_nue_" + i, Constants.PAGO_FALLIDO));
        }
        // Cada reclamo devuelve a lo sumo lo pedido (como el Pageable real).
        when(pagoRepository.reclamarCerradosRecientes(any(), any(), any(), any())).thenAnswer(inv ->
            recientes.subList(0, ((Pageable) inv.getArgument(3)).getPageSize()));
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any(), any())).thenAnswer(inv ->
            vencidos.subList(0, ((Pageable) inv.getArgument(3)).getPageSize()));
        when(pagoRepository.reclamarCerradosNuevos(any(), any(), any())).thenAnswer(inv ->
            nuevos.subList(0, ((Pageable) inv.getArgument(2)).getPageSize()));
        List<String> consultados = new java.util.ArrayList<>();
        when(onvoPaymentProvider.procesarPagoVerificado(any(), eq("respaldo"))).thenAnswer(inv -> {
            consultados.add(inv.getArgument(0));
            return Verificacion.EN_PROCESO;
        });

        assertThat(srv.revisarCerrados().revisados()).isEqualTo(4);
        assertThat(consultados.stream().filter(t -> t.startsWith("cs_l4_rec_")).count()).isEqualTo(2);
        assertThat(consultados.stream().filter(t -> t.startsWith("cs_l4_ven_")).count()).isEqualTo(1);
        assertThat(consultados.stream().filter(t -> t.startsWith("cs_l4_nue_")).count()).isEqualTo(1);
        // Sin relleno: el lote ya se llenó.
        verify(pagoRepository, times(1)).reclamarCerradosRecientes(any(), any(), any(), any());
    }

    @Test
    @DisplayName("fix2 fairness: lote-max < 4 con cerrados habilitados no arranca")
    void loteMaxMenorACuatroNoArranca() {
        OnvoService onvo = mock(OnvoService.class);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () ->
            new OnvoPendientesReconsultaService(pagoRepository, onvo, onvoPaymentProvider, mock(OnvoRechazoService.class),
                tm, 3, 5, 3, true));
        // Sin conciliación de cerrados el tope de pendientes sigue como antes.
        new OnvoPendientesReconsultaService(pagoRepository, onvo, onvoPaymentProvider, mock(OnvoRechazoService.class),
            tm, 3, 5, 3, false);
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
        when(pagoRepository.reclamarCerradosNuevos(any(), any(), any())).thenReturn(List.of(nuevo));
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any(), any())).thenReturn(List.of(yaMarcado));
        when(onvoPaymentProvider.procesarPagoVerificado(any(), eq("respaldo"))).thenReturn(Verificacion.NO_ENCONTRADO);
        when(onvoPaymentProvider.revisarCobro("cs_sinref_nuevo", "respaldo", true)).thenReturn(
            new com.hotclick.payment.OnvoPaymentProvider.RevisionCobro(CobroIntent.EN_DUDA, null, true, true));
        when(onvoPaymentProvider.revisarCobro("cs_sinref_viejo", "respaldo", true)).thenReturn(
            new com.hotclick.payment.OnvoPaymentProvider.RevisionCobro(CobroIntent.EN_DUDA, null, true, false));
        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR);

        assertThat(srv.revisarCerrados()).isEqualTo(new OnvoPendientesReconsultaService.ResumenCerrados(2, 0));

        ArgumentCaptor<LocalDateTime> proxima = ArgumentCaptor.forClass(LocalDateTime.class);
        // Ya marcado: el reclamo lo agenda directo al tope (no 2 min) contando UN intento.
        verify(pagoRepository, times(1)).agendarConciliacion(eq(32L), any(), proxima.capture());
        assertThat(proxima.getValue()).isBetween(antes.plusMinutes(1440).minusSeconds(5), antes.plusMinutes(1440).plusSeconds(5));
        // Nuevo: el reclamo lo agenda a 2 min (un intento) y al quedar sin referencia pasa al tope SIN contar otro.
        verify(pagoRepository, times(1)).agendarConciliacion(eq(31L), any(), any());
        ArgumentCaptor<LocalDateTime> p31 = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(pagoRepository).reagendarSinContar(eq(31L), p31.capture());
        assertThat(p31.getValue()).isBetween(antes.plusMinutes(1440).minusSeconds(5), antes.plusMinutes(1440).plusSeconds(5));
        verify(pagoRepository).reagendarSinContar(eq(32L), any());
        verify(pagoRepository, never()).marcarConciliacionResuelta(any(), any());
    }

    @Test
    @DisplayName("fix2: lote de conciliación configurable y acotado por lote-max")
    void loteConciliacionValidado() {
        var srv = respaldo(mock(OnvoService.class), mock(PlatformTransactionManager.class), true);
        srv.setLoteConciliacion(4);
        srv.setLoteConciliacion(200);
        // fix2 fairness: con 1..3 alguna clase (recientes / vencidos / nunca agendados) se queda sin lugar.
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setLoteConciliacion(3));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalStateException.class, () -> srv.setLoteConciliacion(1));
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
        when(pagoRepository.reclamarCerradosParaReconsulta(any(), any(), any(), any())).thenReturn(List.of(cancelado, abierto));
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
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelarSinLocks(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
        verifyNoInteractions(onvoPaymentProvider, sinpeOnvoMarketplaceService);
    }

    @Test
    @DisplayName("panel: pago en estado PAGADO → 409")
    void panelPagadoNoCancela() {
        pago.setEstadoPago("PAGADO");
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelarSinLocks(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
    }

    @Test
    @DisplayName("cerrarIntentSinpeOnvo: ONVO ya cobró el intent SINPE → 409")
    void sinpeIntentPagadoNoCancela() {
        comoSinpeOnvo();
        when(sinpeOnvoMarketplaceService.cerrarIntentParaComprador(pago))
            .thenReturn(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador.PAGADO);
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelarSinLocks(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
    }

    @Test
    @DisplayName("cerrarIntentSinpeOnvo: ONVO no confirma el cierre → 409")
    void sinpeIntentNoConfirmadoNoCancela() {
        comoSinpeOnvo();
        when(sinpeOnvoMarketplaceService.cerrarIntentParaComprador(pago))
            .thenReturn(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador.NO_CONFIRMADO);
        assertThatThrownBy(() -> service.cerrarPagoOnvoAntesDeCancelarSinLocks(pedidoPanel()))
            .isInstanceOf(com.hotclick.exception.CancelacionPagoNoCerradaException.class);
    }

    @Test
    @DisplayName("cerrarIntentSinpeOnvo: intent cancelado en ONVO → se puede cancelar")
    void sinpeIntentCanceladoPermite() {
        comoSinpeOnvo();
        when(sinpeOnvoMarketplaceService.cerrarIntentParaComprador(pago))
            .thenReturn(com.hotclick.service.sinpe.SinpeOnvoMarketplaceService.CierreComprador.CANCELADO);
        service.cerrarPagoOnvoAntesDeCancelarSinLocks(pedidoPanel());
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

    @Test
    @DisplayName("fix2 fail-closed: sin EntityManager (fuera de Spring) no se cancela con una copia sin lock")
    void sinEntityManagerNoCancela() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "entityManager", null);
        when(onvoPaymentProvider.expirarSesionParaCancelar("cs_test_b1")).thenReturn(true);
        when(onvoPaymentProvider.revisarCobro("cs_test_b1", "cancelacion", false))
            .thenReturn(new OnvoPaymentProvider.RevisionCobro(OnvoPaymentProvider.CobroIntent.SIN_COBRO, "canceled"));

        assertThatThrownBy(() -> service.cancelarAnon("ORD-B1", "ok")).isInstanceOf(IllegalStateException.class);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }

    @Test
    @DisplayName("fix2 fail-closed: el pago desapareció al bloquearlo → no se sigue con la copia sin lock")
    void pagoInexistenteAlBloquearNoCancela() {
        when(pagoRepository.findByIdForUpdate(16L)).thenReturn(Optional.empty());
        when(onvoPaymentProvider.expirarSesionParaCancelar("cs_test_b1")).thenReturn(true);
        when(onvoPaymentProvider.revisarCobro("cs_test_b1", "cancelacion", false))
            .thenReturn(new OnvoPaymentProvider.RevisionCobro(OnvoPaymentProvider.CobroIntent.SIN_COBRO, "canceled"));

        assertThatThrownBy(() -> service.cancelarAnon("ORD-B1", "ok")).isInstanceOf(IllegalStateException.class);
        verify(paymentFailureHandler, never()).marcarFallido(any(), any());
    }
}
