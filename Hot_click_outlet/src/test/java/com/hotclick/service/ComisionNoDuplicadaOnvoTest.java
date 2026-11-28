package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.MetodoCobro;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoRetencionOnvo;
import com.hotclick.model.Plan;
import com.hotclick.repository.*;
import com.hotclick.service.consola.QuincenaAdminService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@DisplayName("Comisión no duplicada: si ONVO ya la retuvo (marketplaceAppFee), HotClick no la vuelve a descontar")
class ComisionNoDuplicadaOnvoTest {

    private static final Long EMPRESA = 7L;

    private WalletService wallet;
    private PedidoRetencionOnvoRepository retencionRepo;
    private PedidoRepository pedidoRepo;
    private AggregatorService aggregator;
    private QuincenaAdminService quincena;

    @BeforeEach
    void setUp() {
        wallet = mock(WalletService.class);
        retencionRepo = mock(PedidoRetencionOnvoRepository.class);
        EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
        Plan plan = new Plan();
        plan.setNombre("EMPRENDEDOR");
        plan.setComisionPorcentaje(new BigDecimal("9"));
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        e.setPlan(plan);
        when(empresaRepo.findByIdWithPlan(EMPRESA)).thenReturn(Optional.of(e));
        aggregator = new AggregatorService(wallet, mock(WalletDlqTxOps.class), empresaRepo);
        ReflectionTestUtils.setField(aggregator, "pctGateway", 4);
        ReflectionTestUtils.setField(aggregator, "pctFallback", new BigDecimal("9"));
        aggregator.setRetencionRepoParaTest(retencionRepo);

        pedidoRepo = mock(PedidoRepository.class);
        MetodoCobroRepository metodoRepo = mock(MetodoCobroRepository.class);
        MetodoCobro cuenta = mock(MetodoCobro.class);
        when(cuenta.isEnRevision()).thenReturn(false);
        when(cuenta.getFechaCreacion()).thenReturn(LocalDateTime.of(2026, 1, 1, 0, 0));
        when(metodoRepo.findActivosByEmpresaId(EMPRESA)).thenReturn(List.of(cuenta));
        PayoutRequestRepository payoutRepo = mock(PayoutRequestRepository.class);
        SolicitudRecoleccionRepository recoleccionRepo = mock(SolicitudRecoleccionRepository.class);
        quincena = new QuincenaAdminService(pedidoRepo, aggregator, metodoRepo, payoutRepo, recoleccionRepo);
    }

    private Pedido pedido(long id) {
        Pedido p = new Pedido();
        p.setId(id);
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        p.setEmpresa(e);
        p.setMetodoPago("ONVO");
        p.setTotalPedido(34_000);
        p.setCostoEnvio(4_000);
        p.setFechaPedido(LocalDateTime.of(2026, 11, 20, 10, 0));
        return p;
    }

    private void retenido(long pedidoId, String pct) {
        PedidoRetencionOnvo r = new PedidoRetencionOnvo();
        r.setPedidoId(pedidoId);
        r.setOnvoAccountId("cl_abc123");
        r.setFeePct(new BigDecimal(pct));
        when(retencionRepo.findByPedidoId(pedidoId)).thenReturn(Optional.of(r));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> unaLinea() {
        var salida = quincena.periodo(LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 30));
        return ((List<Map<String, Object>>) salida.get("lineas")).get(0);
    }

    @Test
    @DisplayName("Con cuenta conectada y % sincronizado: se informa lo que retuvo ONVO, sin descuento manual y sin giro")
    void quincenaConRetencion() {
        Pedido p = pedido(1L);
        retenido(1L, "15.00");
        when(pedidoRepo.findConEmpresaEnPeriodo(any(), any(), any())).thenReturn(List.of(p));

        Map<String, Object> l = unaLinea();
        assertThat(l.get("retenidoOnvo")).isEqualTo(5_100L);   // 15 % de 34.000, lo que ONVO ya se quedó
        assertThat(l.get("netoOnvo")).isEqualTo(28_900L);      // lo que ONVO le paga al negocio
        assertThat(l.get("operar")).isEqualTo(5_100L);         // reporte: solo lo retenido, sin pasarela aparte
        assertThat(l.get("pasarela")).isEqualTo(0L);
        assertThat(l.get("aGirar")).isEqualTo(0L);            // HotClick no gira lo que ONVO ya pagó
        assertThat(l.get("saleDelBanco")).isEqualTo(false);
    }

    @Test
    @DisplayName("Sin cuenta conectada: la quincena calcula y gira como siempre (9 % del plan sobre productos)")
    void quincenaSinRetencion() {
        Pedido p = pedido(2L);
        when(retencionRepo.findByPedidoId(2L)).thenReturn(Optional.empty());
        when(pedidoRepo.findConEmpresaEnPeriodo(any(), any(), any())).thenReturn(List.of(p));

        Map<String, Object> l = unaLinea();
        assertThat(l.get("retenidoOnvo")).isEqualTo(0L);
        assertThat(l.get("netoOnvo")).isEqualTo(0L);
        assertThat(l.get("comision")).isEqualTo(2_700L);       // 9 % de 30.000 de productos
        assertThat(l.get("neto")).isEqualTo(31_300L);          // 30.000 - 2.700 + 4.000 de envío
        assertThat(l.get("aGirar")).isEqualTo(31_300L);
    }

    @Test
    @DisplayName("Wallet: pedido con comisión retenida por ONVO no se acredita; sin retención se acredita el neto de siempre")
    void walletUnaSolaVez() {
        Pedido retenidoPedido = pedido(3L);
        retenido(3L, "9.00");
        aggregator.acreditarVentaEnTransaccion(retenidoPedido);
        verify(wallet, never()).acreditarVenta(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());

        Pedido normal = pedido(4L);
        when(retencionRepo.findByPedidoId(4L)).thenReturn(Optional.empty());
        aggregator.acreditarVentaEnTransaccion(normal);
        verify(wallet).acreditarVenta(eq7(), eq(31_300L), eq(34_000L), anyLong(), anyLong(), eq(4L));
    }

    private static Long eq7() { return org.mockito.ArgumentMatchers.eq(EMPRESA); }

    @Test
    @DisplayName("liquidarPedido: retenido = comisión de ONVO sobre el total cobrado; no retenido = cálculo del plan")
    void liquidarPedido() {
        Pedido retenidoPedido = pedido(5L);
        retenido(5L, "7.50");
        var r = aggregator.liquidarPedido(retenidoPedido);
        assertThat(r.retenidoOnvo()).isTrue();
        assertThat(r.detalle().resultado().totalComision()).isEqualTo(2_550L);
        assertThat(r.neto()).isEqualTo(31_450L);

        Pedido normal = pedido(6L);
        when(retencionRepo.findByPedidoId(6L)).thenReturn(Optional.empty());
        var n = aggregator.liquidarPedido(normal);
        assertThat(n.retenidoOnvo()).isFalse();
        assertThat(n.detalle().resultado().totalComision()).isEqualTo(2_700L);
    }
}
