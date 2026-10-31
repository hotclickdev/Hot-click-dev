package com.hotclick.service;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Mesa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.MesaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.cache.CacheManager;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** MED-4 Auditor 3: el autoservicio (QR de mesa) cobra y muestra el precio efectivo (oferta), como los demás canales. */
@DisplayName("Autoservicio — MED-4: precio efectivo con oferta en catálogo y en el pedido")
class SelfCheckoutPrecioOfertaTest {

    private final Empresa e = new Empresa();
    private final MesaRepository mesaRepo = mock(MesaRepository.class);
    private final ProductoRepository productos = mock(ProductoRepository.class);
    private final PedidoRepository pedidos = mock(PedidoRepository.class);
    private final BodegaRepository bodegas = mock(BodegaRepository.class);
    private final UsuarioRepository usuarios = mock(UsuarioRepository.class);
    private final Producto p = new Producto();

    private SelfCheckoutService servicio() {
        e.setId(77L); e.setRegimenIva("SIMPLIFICADO");
        Mesa mesa = new Mesa(); mesa.setEmpresa(e); mesa.setActivo(true); mesa.setNombre("Mesa 1");
        when(mesaRepo.findByQrToken("tok")).thenReturn(Optional.of(mesa));
        when(usuarios.findByEmpresaIdOrderByIdDesc(77L)).thenReturn(List.of(new Usuario()));
        Bodega b = new Bodega(); b.setEmpresa(e);
        when(bodegas.findByEmpresaIdAndEstado(77L, 1)).thenReturn(List.of(b));
        p.setId(3L); p.setEmpresa(e); p.setNombreProducto("Café"); p.setStockActual(10);
        p.setPrecioVenta(2000); p.setPrecioOferta(1500); p.setEnOferta(true); p.setPrecioCompra(500);
        p.setPorcentajeIva(new BigDecimal("13.00")); p.setCodigoTarifaIva("08"); p.setCodigoCabys("4321150100101");
        when(productos.findById(3L)).thenReturn(Optional.of(p));
        when(productos.findActivosByEmpresaId(77L)).thenReturn(List.of(p));
        when(pedidos.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));
        return new SelfCheckoutService(mesaRepo, pedidos, productos, bodegas, usuarios, mock(CacheManager.class));
    }

    @Test
    void pedidoCobraPrecioDeOferta() {
        servicio().crearPedido("tok", "Ana", null, null, List.of(Map.of("productoId", 3L, "cantidad", 2)));
        ArgumentCaptor<Pedido> cap = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidos).save(cap.capture());
        assertThat(cap.getValue().getTotalPedido()).isEqualTo(3000);
        assertThat(cap.getValue().getItems()).singleElement()
            .satisfies(i -> assertThat(i.getPrecioUnitarioMomento()).isEqualTo(1500));
    }

    @Test
    void catalogoMuestraPrecioDeOferta() {
        assertThat(servicio().getCatalogo("tok")).singleElement()
            .satisfies(m -> assertThat(m.get("precio")).isEqualTo(1500));
    }

    @Test
    void sinOfertaActivaCobraPrecioVenta() {
        SelfCheckoutService s = servicio();
        p.setEnOferta(false);
        s.crearPedido("tok", "Ana", null, null, List.of(Map.of("productoId", 3L, "cantidad", 1)));
        ArgumentCaptor<Pedido> cap = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidos).save(cap.capture());
        assertThat(cap.getValue().getTotalPedido()).isEqualTo(2000);
    }
}
