package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Decisión del dueño (21-oct-2026): efectivo y contra entrega, de cualquier origen, no acreditan billetera. */
class AggregatorEfectivoOnlineTest {

    private static final Long EMPRESA = 7L;
    private static final Long PEDIDO = 100L;

    private WalletService walletService;
    private AggregatorService aggregator;

    @BeforeEach
    void setUp() {
        walletService = mock(WalletService.class);
        EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
        when(empresaRepo.findByIdWithPlan(EMPRESA)).thenReturn(Optional.empty());
        aggregator = new AggregatorService(walletService, mock(WalletDlqTxOps.class), empresaRepo);
        ReflectionTestUtils.setField(aggregator, "pctGateway", 4);
        ReflectionTestUtils.setField(aggregator, "pctFallback", new BigDecimal("9"));
    }

    private static Pedido pedido(String origen, String metodoPago) {
        Pedido p = new Pedido();
        p.setId(PEDIDO);
        Empresa e = new Empresa(); e.setId(EMPRESA); p.setEmpresa(e);
        p.setOrigen(origen);
        p.setMetodoPago(metodoPago);
        p.setTotalPedido(20_000);
        p.setCostoEnvio(0);
        return p;
    }

    @ParameterizedTest
    @ValueSource(strings = {"EFECTIVO", "CONTRA_ENTREGA", "CONTRAENTREGA", " efectivo ", "contra-entrega", "contra entrega"})
    void pedidoOnlineEnEfectivoOContraEntrega_noAcredita(String metodo) {
        aggregator.acreditarVentaEnTransaccion(pedido("ONLINE", metodo));
        aggregator.acreditarVentaEnTransaccion(pedido(null, metodo));
        verify(walletService, never()).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    @Test
    void efectivoPos_sigueSinAcreditar() {
        aggregator.acreditarVentaEnTransaccion(pedido("POS", "EFECTIVO"));
        verify(walletService, never()).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    @ParameterizedTest
    @ValueSource(strings = {"TARJETA", "ONVO", "TILOPAY", "SINPE"})
    void tarjetaOnvoTilopay_siguenAcreditando(String metodo) {
        aggregator.acreditarVentaEnTransaccion(pedido("ONLINE", metodo));
        verify(walletService).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    @ParameterizedTest
    @ValueSource(strings = {"CONTRA_ENTREGA", "contra-entrega", "contra entrega", "EFECTIVO"})
    void contraEntregaEnvioNormalOnline_siAcredita(String metodo) {
        Pedido p = pedido("ONLINE", metodo);
        p.setMetodoEnvio("ENVIO_NORMAL");
        aggregator.acreditarVentaEnTransaccion(p);
        verify(walletService).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    @Test
    void contraEntregaEnvioNormalEnPos_noAcredita() {
        Pedido p = pedido("POS", "CONTRA_ENTREGA");
        p.setMetodoEnvio("ENVIO_NORMAL");
        aggregator.acreditarVentaEnTransaccion(p);
        verify(walletService, never()).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    @Test
    void esCobroEnEfectivo_reconoceLosTresNombres() {
        assertThat(AggregatorService.esCobroEnEfectivo(pedido("ONLINE", "CONTRA_ENTREGA"))).isTrue();
        assertThat(AggregatorService.esCobroEnEfectivo(pedido("ONLINE", "TARJETA"))).isFalse();
        assertThat(AggregatorService.esCobroEnEfectivo(pedido("ONLINE", null))).isFalse();
        assertThat(AggregatorService.esCobroEnEfectivo(null)).isFalse();
    }
}
