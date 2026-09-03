package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Plan;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * [IDEMPOTENCIA] AggregatorService — Deduplicación de Webhooks y Resiliencia DLQ.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("[IDEMPOTENCIA] AggregatorService — Webhook dedup y resiliencia DLQ")
class WebhookIdempotencyTest {

    @InjectMocks private AggregatorService service;
    @Mock        private WalletService     walletService;
    @Mock        private WalletDlqTxOps    dlqTxOps;
    @Mock        private EmpresaRepository empresaRepo;

    private Pedido pedido;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "pctGateway", 4);
        ReflectionTestUtils.setField(service, "pctFallback", new BigDecimal("8"));
        ReflectionTestUtils.setField(service, "minimoEmprendedorCrc", 400L);

        Plan plan = new Plan();
        plan.setNombre("EMPRENDEDOR");
        plan.setComisionPorcentaje(new BigDecimal("8.00"));
        Empresa empresa = new Empresa();
        empresa.setPlan(plan);
        empresa.setPlanSaas("EMPRENDEDOR");
        when(empresaRepo.findByIdWithPlan(99L)).thenReturn(Optional.of(empresa));

        pedido = mock(Pedido.class);
        when(pedido.getId()).thenReturn(101L);
        when(pedido.getEmpresaId()).thenReturn(99L);
        when(pedido.getTotalPedido()).thenReturn(50000);
    }

    @Test
    @DisplayName("IDEM-01 | CRÍTICO — Primera acreditación exitosa → wallet acreditado, no DLQ")
    void primeraAcreditacion_exitosa_walletLlamado_noDlq() {
        service.acreditarVentaAsync(pedido);

        // 8% de 50000 = 4000; gw 4% = 2000; saas = 2000; neto = 46000
        verify(walletService, times(1))
            .acreditarVenta(eq(99L), eq(46_000L), eq(50_000L), eq(2_000L), eq(2_000L), eq(101L));
        verify(dlqTxOps, never())
            .encolar(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyString());
    }

    @Test
    @DisplayName("IDEM-02 | CRÍTICO — Webhook duplicado lanza DIV → capturado como benigno, NO va a DLQ")
    void webhookDuplicado_divCapturadaSilenciosamente_noDlq() {
        doThrow(new DataIntegrityViolationException(
            "duplicate key value violates unique constraint uq_wallet_tx_credito_por_pedido"))
            .when(walletService)
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());

        assertThatNoException().isThrownBy(() -> service.acreditarVentaAsync(pedido));

        verify(walletService, times(1))
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
        verify(dlqTxOps, never())
            .encolar(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyString());
    }

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

    @Test
    @DisplayName("IDEM-04 | HIGH — DLQ.encolar también falla → excepción absorbida, no propaga al llamador")
    void falloTransitorio_dlqTambienFalla_noPropaga() {
        doThrow(new RuntimeException("wallet error"))
            .when(walletService)
            .acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
        doThrow(new RuntimeException("dlq table unreachable"))
            .when(dlqTxOps)
            .encolar(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyString());

        assertThatNoException().isThrownBy(() -> service.acreditarVentaAsync(pedido));
    }

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
