package com.hotclick.service;

import com.hotclick.model.Pedido;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * [IDEMPOTENCIA] AggregatorService — Deduplicación de Webhooks y Resiliencia DLQ.
 *
 * Verifica las garantías de [BUG-1 CORREGIDO] y [BUG-2 CORREGIDO] documentadas
 * en AggregatorService: el unique constraint de WalletService funciona como
 * guard de idempotencia para webhooks duplicados, y los fallos transitorios
 * van a DLQ sin propagarse al llamador.
 *
 * Escenarios cubiertos:
 *   IDEM-01  Primera acreditación exitosa → wallet acreditado, no DLQ
 *   IDEM-02  Webhook duplicado lanza DIV → capturado como benigno, NO a DLQ
 *   IDEM-03  Fallo transitorio → se encola en DLQ
 *   IDEM-04  DLQ.encolar también falla → excepción absorbida, no propaga
 *   IDEM-05  Pedido sin empresa → no acredita, no DLQ (early return)
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[IDEMPOTENCIA] AggregatorService — Webhook dedup y resiliencia DLQ")
class WebhookIdempotencyTest {

    @InjectMocks private AggregatorService service;
    @Mock        private WalletService     walletService;
    @Mock        private WalletDlqTxOps    dlqTxOps;

    private Pedido pedido;

    @BeforeEach
    void setUp() {
        // @Value no se inyecta en tests Mockito puros — establecer explícitamente
        ReflectionTestUtils.setField(service, "pctSaas",    2);
        ReflectionTestUtils.setField(service, "pctGateway", 3);

        pedido = mock(Pedido.class);
        when(pedido.getId()).thenReturn(101L);
        when(pedido.getEmpresaId()).thenReturn(99L);
        when(pedido.getTotalPedido()).thenReturn(50000); // Integer — totalPedido es Integer en Pedido.java
    }

    // ── IDEM-01: primera acreditación exitosa ────────────────────────────────

    @Test
    @DisplayName("IDEM-01 | CRÍTICO — Primera acreditación exitosa → wallet acreditado, no DLQ")
    void primeraAcreditacion_exitosa_walletLlamado_noDlq() {
        service.acreditarVentaAsync(pedido);

        verify(walletService, times(1))
            .acreditarVenta(eq(99L), anyLong(), anyLong(), anyLong(), anyLong(), eq(101L));
        verify(dlqTxOps, never())
            .encolar(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyString());
    }

    // ── IDEM-02: webhook duplicado (DIV) → NO a DLQ ─────────────────────────

    @Test
    @DisplayName("IDEM-02 | CRÍTICO — Webhook duplicado lanza DIV → capturado como benigno, NO va a DLQ")
    void webhookDuplicado_divCapturadaSilenciosamente_noDlq() {
        doThrow(new DataIntegrityViolationException(
            "duplicate key value violates unique constraint uq_wallet_tx_credito_por_pedido"))
            .when(walletService)
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());

        // El segundo webhook para el mismo pedido no debe tirar error ni ir a DLQ
        assertThatNoException().isThrownBy(() -> service.acreditarVentaAsync(pedido));

        verify(walletService, times(1))
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
        verify(dlqTxOps, never())
            .encolar(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyString());
    }

    // ── IDEM-03: fallo transitorio → va a DLQ ───────────────────────────────

    @Test
    @DisplayName("IDEM-03 | HIGH — Fallo transitorio (RuntimeException) → se encola en DLQ")
    void falloTransitorio_RuntimeException_encolaEnDlq() {
        doThrow(new RuntimeException("BD connection timeout"))
            .when(walletService)
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());

        service.acreditarVentaAsync(pedido);

        verify(dlqTxOps, times(1))
            .encolar(eq(99L), eq(101L), anyLong(), anyLong(), anyLong(), anyLong(),
                     contains("BD connection timeout"));
    }

    // ── IDEM-04: DLQ también falla → excepción absorbida ────────────────────

    @Test
    @DisplayName("IDEM-04 | HIGH — DLQ.encolar también falla → excepción absorbida, no propaga al llamador")
    void falloTransitorio_dlqTambienFalla_noPropaga() {
        doThrow(new RuntimeException("wallet error"))
            .when(walletService)
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
        doThrow(new RuntimeException("dlq table unreachable"))
            .when(dlqTxOps)
            .encolar(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyString());

        // CRÍTICO: los fallos en cadena no deben propagarse hacia PaymentService/webhook handler
        assertThatNoException().isThrownBy(() -> service.acreditarVentaAsync(pedido));
    }

    // ── IDEM-05: pedido sin empresa → early return silencioso ────────────────

    @Test
    @DisplayName("IDEM-05 | MEDIUM — Pedido sin empresa → no acredita wallet, no DLQ, no excepción")
    void pedidoSinEmpresa_earlyReturn_noCalls() {
        when(pedido.getEmpresaId()).thenReturn(null);

        service.acreditarVentaAsync(pedido);

        verify(walletService, never())
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
        verify(dlqTxOps, never())
            .encolar(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyString());
    }
}
