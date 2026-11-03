package com.hotclick.integration;
// QA LOCAL — NO COMMITEAR. Carrera real (H2, dos hilos) confirmar manual vs limpieza TTL.
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.service.payment.PagoExpiradoCancelador;
import com.hotclick.service.pedido.PedidoPagoManualService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class QaLocalP02CarreraTest extends BaseIntegrationTest {
    @MockitoBean StockReservationService stock;
    @MockitoBean PaymentService paymentService;
    @MockitoBean CompanyScope companyScope;
    @Autowired PagoExpiradoCancelador cancelador;
    @Autowired PedidoPagoManualService manual;
    @Autowired EmpresaRepository empresaRepository;
    @Autowired BodegaRepository bodegaRepository;
    @Autowired PedidoRepository pedidoRepository;
    @Autowired PagoRepository pagoRepository;
    @Autowired TransactionTemplate tx;

    @Test
    void confirmarVsCancelar_nuncaCanceladoACapturado_stockUnaVez() throws Exception {
        when(companyScope.isAdminIT()).thenReturn(true);
        String slug = "qa-p02-" + System.nanoTime();
        Empresa e = new Empresa(); e.setNombreEmpresa("QA P02"); e.setSlug(slug); e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR)); e = empresaRepository.saveAndFlush(e);
        Bodega b = new Bodega(); b.setNombreBodega("B"); b.setDireccionExacta("x"); b.setTelefono("00000000"); b.setProvincia("San José");
        b.setCanton("Escazú"); b.setHorarioApertura(LocalTime.of(8,0)); b.setHorarioCierre(LocalTime.of(18,0)); b.setAdminCliente(adminUser);
        b.setEmpresa(e); b.setEstado(Constants.ESTADO_ACTIVO); b = bodegaRepository.saveAndFlush(b);
        int n = 30, ganaCancel = 0, ganaConfirm = 0;
        ExecutorService ex = Executors.newFixedThreadPool(2);
        for (int i = 0; i < n; i++) {
            clearInvocations(stock);
            Pedido p = new Pedido(); p.setNumeroPedido("QA-P02-" + i + "-" + (System.nanoTime() % 100000)); p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
            p.setEstadoPedido(Constants.PEDIDO_PENDIENTE); p.setUsuarioFinal(testUser); p.setBodega(b); p.setEmpresa(e);
            p.setSubtotal(1000); p.setTotalPedido(1000); p.setCostoTotalProductos(700); p.setUtilidadBruta(300);
            p.setMetodoPago("EFECTIVO"); p.setOrigen("POS"); p.setMetodoEnvio(Constants.ENVIO_RETIRO); p.setCostoEnvio(0); p.setDescuentoTotal(0);
            p.setMontoImpuesto(0); p.setAplicaImpuesto(false); p.setEstado(Constants.ESTADO_ACTIVO); p.setItems(new ArrayList<>());
            final Pedido ped = pedidoRepository.saveAndFlush(p);
            Pago pg = new Pago(); pg.setMerchantToken("QA-P02-" + ped.getId()); pg.setMonto(1000); pg.setMoneda("CRC");
            pg.setProveedor(Constants.PROVEEDOR_MANUAL); pg.setEstadoPago(Constants.PAGO_PENDIENTE); pg.setPedido(ped); pg.setUsuario(testUser);
            pg.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR)); final Pago pago = pagoRepository.saveAndFlush(pg);
            CyclicBarrier bar = new CyclicBarrier(2);
            final int it = i; Future<Boolean> fc = ex.submit(() -> { bar.await(); if (it % 2 == 1) Thread.sleep(it % 7 * 4L); return cancelador.cancelar(pago.getId()); });
            Future<Boolean> fm = ex.submit(() -> { bar.await(); try { tx.executeWithoutResult(s -> manual.confirmar(
                pedidoRepository.findById(ped.getId()).orElseThrow(), Constants.PEDIDO_PENDIENTE, "REF-QA")); return true; }
                catch (RuntimeException r) { return false; } });
            boolean c = fc.get(30, TimeUnit.SECONDS), m = fm.get(30, TimeUnit.SECONDS);
            String ep = pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago();
            String eo = pedidoRepository.findById(ped.getId()).orElseThrow().getEstadoPedido();
            assertThat(c ^ m).as("exactamente uno gana, iter %d (c=%s m=%s)", i, c, m).isTrue();
            if (c) { ganaCancel++; assertThat(ep).isEqualTo(Constants.PAGO_CANCELADO); assertThat(eo).isEqualTo(Constants.PEDIDO_CANCELADO);
                     verify(stock, times(1)).liberarReservas(any()); }
            else   { ganaConfirm++; assertThat(ep).isEqualTo(Constants.PAGO_CAPTURADO); assertThat(eo).isEqualTo(Constants.PEDIDO_PAGADO);
                     verify(stock, never()).liberarReservas(any()); }
            assertThat(cancelador.cancelar(pago.getId())).isFalse();   // segunda cancelación: no libera de nuevo
            verify(stock, times(c ? 1 : 0)).liberarReservas(any());
        }
        ex.shutdown();
        System.out.println("QA-P02 iteraciones=" + n + " ganaCancelar=" + ganaCancel + " ganaConfirmar=" + ganaConfirm);
        pagoRepository.deleteAll(); pedidoRepository.deleteAll(); bodegaRepository.delete(b); empresaRepository.delete(e);
    }
}
