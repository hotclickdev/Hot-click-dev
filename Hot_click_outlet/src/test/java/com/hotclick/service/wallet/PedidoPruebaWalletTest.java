package com.hotclick.service.wallet;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Pedido;
import com.hotclick.model.WalletTransaccion;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.WalletRepository;
import com.hotclick.repository.WalletTransaccionRepository;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.WalletDlqTxOps;
import com.hotclick.service.WalletService;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** P-04 ciclo 2: un pedido es_prueba no entra al wallet ni a una liquidación, y el JSON no lo puede setear. */
class PedidoPruebaWalletTest {

    @Test
    void aggregator_noAcreditaPedidoDePrueba() {
        WalletService wallet = mock(WalletService.class);
        AggregatorService agg = new AggregatorService(wallet, mock(WalletDlqTxOps.class), mock(EmpresaRepository.class));
        Pedido p = new Pedido();
        p.setId(7L);
        p.setTotalPedido(15000);
        p.setMetodoPago("SINPE");
        p.setEsPrueba(true);
        com.hotclick.model.Empresa e = new com.hotclick.model.Empresa();
        e.setId(3L);
        p.setEmpresa(e);

        agg.acreditarVentaEnTransaccion(p);
        agg.acreditarVentaAsync(p);

        verify(wallet, never()).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), any());
    }

    @Test
    void liquidacion_saltaCreditoDePedidoDePrueba() {
        WalletTransaccionRepository txRepo = mock(WalletTransaccionRepository.class);
        WalletRepository walletRepo = mock(WalletRepository.class);
        WalletPayoutRequestService payout = mock(WalletPayoutRequestService.class);
        WalletLiquidacionService svc = new WalletLiquidacionService(txRepo, walletRepo, payout);
        WalletTransaccion t = new WalletTransaccion();
        t.setTipo(WalletTransaccion.CREDITO_VENTA);
        t.setReferenciaId(9L);
        t.setMonto(10000L);
        when(payout.buscarCuentaVerificada(1L)).thenReturn(Optional.of(new com.hotclick.model.MetodoCobro()));
        when(txRepo.findSinLiquidar(eq(1L), any(), any())).thenReturn(List.of(t));
        when(txRepo.findPedidosPrueba(any())).thenReturn(List.of(9L));
        when(walletRepo.findSaldoDisponible(1L)).thenReturn(Optional.of(10000L));

        assertThat(svc.liquidar(1L, com.hotclick.model.PayoutRequest.LIQ_TARJETA, LocalDateTime.now())).isEmpty();
        verify(payout, never()).retenerYCrear(anyLong(), anyLong(), any(), any(), any());
    }

    @Test
    void json_esPruebaEsSoloLectura() throws Exception {
        ObjectMapper om = new ObjectMapper().findAndRegisterModules();
        Pedido p = om.readValue("{\"esPrueba\":true}", Pedido.class);
        assertThat(p.isEsPrueba()).isFalse();
        Pedido marcado = new Pedido();
        marcado.setEsPrueba(true);
        assertThat(om.writeValueAsString(marcado)).contains("\"esPrueba\":true");
    }
}
