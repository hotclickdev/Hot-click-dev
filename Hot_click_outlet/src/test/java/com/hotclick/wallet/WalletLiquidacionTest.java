package com.hotclick.wallet;

import com.hotclick.model.Empresa;
import com.hotclick.model.MetodoCobro;
import com.hotclick.model.PayoutRequest;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.scheduler.LiquidacionWalletScheduler;
import com.hotclick.service.wallet.WalletLiquidacionService;
import com.hotclick.service.wallet.WalletPayoutRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Liquidación contra entrega (día siguiente) separada de la periódica de tarjeta. */
class WalletLiquidacionTest {

    private static final Long EMP = 7L;
    private static final LocalDateTime CORTE = LocalDate.of(2026, 10, 16).atStartOfDay();

    private WalletTransaccionRepository txRepo;
    private WalletRepository walletRepo;
    private WalletPayoutRequestService payoutService;
    private WalletLiquidacionService service;
    private final MetodoCobro cuenta = new MetodoCobro();

    @BeforeEach
    void setUp() {
        txRepo = mock(WalletTransaccionRepository.class);
        walletRepo = mock(WalletRepository.class);
        payoutService = mock(WalletPayoutRequestService.class);
        service = new WalletLiquidacionService(txRepo, walletRepo, payoutService);
        cuenta.setTipo(MetodoCobro.TIPO_SINPE);
        when(payoutService.buscarCuentaVerificada(EMP)).thenReturn(Optional.of(cuenta));
        when(walletRepo.findSaldoDisponible(EMP)).thenReturn(Optional.of(100_000L));
        when(payoutService.retenerYCrear(eq(EMP), anyLong(), anyString(), eq(cuenta), anyString()))
            .thenAnswer(inv -> { PayoutRequest p = new PayoutRequest(); p.setMonto(inv.getArgument(1));
                p.setTipoLiquidacion(inv.getArgument(2)); return p; });
        // pedido 1 = contra entrega (₡9.100 neto), pedido 2 = tarjeta (₡18.200 neto), devolución -₡1.000
        when(txRepo.findSinLiquidar(eq(EMP), anyCollection(), eq(CORTE))).thenReturn(List.of(
            tx(WalletTransaccion.CREDITO_VENTA, 9_100, 1L),
            tx(WalletTransaccion.CREDITO_VENTA, 18_200, 2L),
            tx(WalletTransaccion.DEVOLUCION, -1_000, 3L)));
        when(txRepo.findPedidosContraEntrega(anyCollection())).thenReturn(List.of(1L));
    }

    private static WalletTransaccion tx(String tipo, long monto, Long ref) {
        WalletTransaccion t = new WalletTransaccion();
        t.setEmpresaId(EMP); t.setTipo(tipo); t.setMonto(monto); t.setReferenciaId(ref);
        return t;
    }

    @Test
    void contraEntrega_soloVentasCod_menosLoAdeudado() {
        PayoutRequest pr = service.liquidar(EMP, PayoutRequest.LIQ_CONTRA_ENTREGA, CORTE).orElseThrow();
        assertThat(pr.getMonto()).isEqualTo(8_100L);
        assertThat(pr.getTipoLiquidacion()).isEqualTo(PayoutRequest.LIQ_CONTRA_ENTREGA);
    }

    @Test
    void tarjeta_excluyeVentasCod() {
        PayoutRequest pr = service.liquidar(EMP, PayoutRequest.LIQ_TARJETA, CORTE).orElseThrow();
        assertThat(pr.getMonto()).isEqualTo(17_200L);
    }

    @Test
    void efectivoPos_noEntraEnNingunPayout() {
        when(txRepo.findPedidosPosEfectivo(anyCollection())).thenReturn(List.of(2L));
        assertThat(service.liquidar(EMP, PayoutRequest.LIQ_TARJETA, CORTE)).isEmpty(); // solo quedaba la devolución
        assertThat(service.liquidar(EMP, PayoutRequest.LIQ_CONTRA_ENTREGA, CORTE).orElseThrow().getMonto()).isEqualTo(8_100L);
    }

    @Test
    void aggregator_noAcreditaEfectivoPos() {
        com.hotclick.model.Pedido p = new com.hotclick.model.Pedido();
        p.setOrigen("POS"); p.setMetodoPago("EFECTIVO");
        assertThat(com.hotclick.service.AggregatorService.esEfectivoPos(p)).isTrue();
        p.setMetodoPago("SINPE");
        assertThat(com.hotclick.service.AggregatorService.esEfectivoPos(p)).isFalse();
    }

    @Test
    void nuncaMasQueElSaldoDisponible() {
        when(walletRepo.findSaldoDisponible(EMP)).thenReturn(Optional.of(5_000L));
        assertThat(service.liquidar(EMP, PayoutRequest.LIQ_CONTRA_ENTREGA, CORTE).orElseThrow().getMonto())
            .isEqualTo(5_000L);
    }

    @Test
    void sinCuentaVerificada_noLiquida() {
        when(payoutService.buscarCuentaVerificada(EMP)).thenReturn(Optional.empty());
        assertThat(service.liquidar(EMP, PayoutRequest.LIQ_CONTRA_ENTREGA, CORTE)).isEmpty();
        verify(payoutService, never()).retenerYCrear(any(), anyLong(), any(), any(), any());
    }

    @Test
    void scheduler_tarjetaSoloEnDiasDeCorte_contraEntregaDiario() {
        WalletLiquidacionService liq = mock(WalletLiquidacionService.class);
        EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
        Empresa e = new Empresa();
        e.setFrecuenciaPayout("MENSUAL");
        when(empresaRepo.findById(EMP)).thenReturn(Optional.of(e));
        when(liq.empresasConVentasSinLiquidar(any())).thenReturn(List.of(EMP));
        LiquidacionWalletScheduler s = new LiquidacionWalletScheduler(liq, empresaRepo, "1,16", "1");

        s.ejecutarPara(LocalDate.of(2026, 10, 16));
        verify(liq).liquidar(eq(EMP), eq(PayoutRequest.LIQ_CONTRA_ENTREGA), any());
        verify(liq, never()).liquidar(eq(EMP), eq(PayoutRequest.LIQ_TARJETA), any());

        e.setFrecuenciaPayout("QUINCENAL");
        s.ejecutarPara(LocalDate.of(2026, 10, 16));
        verify(liq).liquidar(eq(EMP), eq(PayoutRequest.LIQ_TARJETA), any());
    }

    @Test
    void scheduler_sinFrecuenciaElegida_noAsumeQuincenal() {
        WalletLiquidacionService liq = mock(WalletLiquidacionService.class);
        EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
        Empresa e = new Empresa();
        assertThat(e.getFrecuenciaPayout()).isNull();
        when(empresaRepo.findById(EMP)).thenReturn(Optional.of(e));
        when(liq.empresasConVentasSinLiquidar(any())).thenReturn(List.of(EMP));
        LiquidacionWalletScheduler s = new LiquidacionWalletScheduler(liq, empresaRepo, "1,16", "1");

        s.ejecutarPara(LocalDate.of(2026, 10, 16)); // día de corte quincenal
        verify(liq).liquidar(eq(EMP), eq(PayoutRequest.LIQ_CONTRA_ENTREGA), any());
        verify(liq, never()).liquidar(eq(EMP), eq(PayoutRequest.LIQ_TARJETA), any());
    }
}
