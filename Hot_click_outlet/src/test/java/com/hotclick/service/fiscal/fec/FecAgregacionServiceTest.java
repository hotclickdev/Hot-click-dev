package com.hotclick.service.fiscal.fec;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.AggregatorService.DetalleComision;
import com.hotclick.service.AggregatorService.Liquidacion;
import com.hotclick.service.fiscal.fec.FecModelos.CompraEmpresa;
import com.hotclick.service.fiscal.fec.FecModelos.LineaCompra;
import com.hotclick.service.wallet.AggregatorCommissionMath;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("FEC: agregación por negocio y quincena (ventas menos comisión de HotClick)")
class FecAgregacionServiceTest {

    private static final String CABYS_A = "4321150100101";
    private static final String CABYS_B = "4321150100202";

    private static Empresa empresa(long id, boolean prueba) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setSituacionFiscal("REGIMEN_SIMPLIFICADO");
        e.setCedulaFiscal("101230456");
        e.setNombreFiscal("Tienda " + id);
        return e;
    }

    private static PedidoItem item(String cabys, int precio, int cant) {
        Producto p = new Producto();
        p.setCodigoCabys(cabys);
        PedidoItem it = new PedidoItem();
        it.setProducto(p);
        it.setPrecioUnitarioMomento(precio);
        it.setCantidad(cant);
        return it;
    }

    private static Pedido pedido(Empresa e, int total, int envio, PedidoItem... items) {
        Pedido p = new Pedido();
        p.setEmpresa(e);
        p.setTotalPedido(total);
        p.setCostoEnvio(envio);
        p.setFechaPedido(LocalDateTime.of(2026, 11, 5, 10, 0));
        p.setItems(List.of(items));
        return p;
    }

    /** Liquidación real: 10 % de comisión sobre los productos, sin mínimo. */
    private static AggregatorService agregador() {
        AggregatorService a = mock(AggregatorService.class);
        when(a.liquidar(anyLong(), anyLong(), anyLong())).thenAnswer(inv -> {
            long total = inv.getArgument(1);
            long envio = Math.min(inv.<Long>getArgument(2), total);
            var r = AggregatorCommissionMath.calcular(total - envio, new BigDecimal("10"), false, 0, 0);
            DetalleComision d = new DetalleComision("PLAN", new BigDecimal("10"), 0, r);
            return new Liquidacion(envio, d, r.neto() + envio);
        });
        return a;
    }

    @Test
    @DisplayName("Suma por negocio los pedidos de la quincena: ventas menos comisión, sin envío")
    void agregaPorNegocio() {
        Empresa e1 = empresa(1, false);
        Empresa e2 = empresa(2, false);
        PedidoRepository repo = mock(PedidoRepository.class);
        LocalDate d = LocalDate.of(2026, 11, 1);
        when(repo.findConEmpresaEnPeriodo(any(), any(), anyList())).thenReturn(List.of(
            pedido(e1, 11000, 1000, item(CABYS_A, 10000, 1)),
            pedido(e1, 5000, 0, item(CABYS_A, 5000, 1)),
            pedido(e2, 20000, 0, item(CABYS_B, 20000, 1))));
        List<CompraEmpresa> r = new FecAgregacionService(repo, agregador())
            .compras(new FecPeriodo(d, d.plusDays(14)));

        assertThat(r).hasSize(2);
        CompraEmpresa c1 = r.get(0);
        assertThat(c1.ventas()).isEqualTo(15000);       // productos, sin los 1000 de envío
        assertThat(c1.comision()).isEqualTo(1500);
        assertThat(c1.monto()).isEqualTo(13500);
        assertThat(c1.lineas()).singleElement().satisfies(l -> {
            assertThat(l.cabys()).isEqualTo(CABYS_A);
            assertThat(l.monto()).isEqualTo(13500);
        });
        assertThat(r.get(1).monto()).isEqualTo(18000);
    }

    @Test
    @DisplayName("El monto se reparte por CAByS y lo sin CAByS válido va a una línea genérica; la suma cuadra")
    void repartoPorCabys() {
        List<LineaCompra> l = FecAgregacionService.repartir(List.of(
            item(CABYS_A, 3000, 1), item(CABYS_B, 3000, 1), item(null, 4000, 1)), 9001);
        assertThat(l).hasSize(3);
        assertThat(l.stream().mapToLong(LineaCompra::monto).sum()).isEqualTo(9001);
        assertThat(l.stream().filter(x -> x.cabys() == null)).hasSize(1);
        assertThat(FecAgregacionService.repartir(List.of(), 500)).singleElement()
            .satisfies(x -> assertThat(x.cabys()).isNull());
    }

    @Test
    @DisplayName("Negocios de prueba y pedidos sin monto no generan compra")
    void ignoraPrueba() {
        PedidoRepository repo = mock(PedidoRepository.class);
        Pedido sinMonto = pedido(empresa(3, false), 0, 0, item(CABYS_A, 1, 1));
        when(repo.findConEmpresaEnPeriodo(any(), any(), anyList())).thenReturn(List.of(sinMonto));
        assertThat(new FecAgregacionService(repo, agregador())
            .compras(FecPeriodo.de(LocalDate.of(2026, 11, 3)))).isEmpty();
    }
}
