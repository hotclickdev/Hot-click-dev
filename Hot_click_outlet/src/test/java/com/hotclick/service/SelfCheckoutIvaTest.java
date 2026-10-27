package com.hotclick.service;

import com.hotclick.model.Bodega;
import com.hotclick.model.ComprobanteFiscal;
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
import com.hotclick.service.pos.PosVentaIvaRegimenTest;
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

@DisplayName("Autoservicio (QR de mesa) — M4: siempre tiquete, sin IVA sumado, y el XML cuadra")
class SelfCheckoutIvaTest {

    @Test
    void autoservicioEsTiqueteSinIvaSumado() {
        Empresa e = new Empresa(); e.setId(77L); e.setRegimenIva("SIMPLIFICADO");
        Mesa mesa = new Mesa(); mesa.setEmpresa(e); mesa.setActivo(true); mesa.setNombre("Mesa 1");
        MesaRepository mesaRepo = mock(MesaRepository.class);
        when(mesaRepo.findByQrToken("tok")).thenReturn(Optional.of(mesa));
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        when(usuarios.findByEmpresaIdOrderByIdDesc(77L)).thenReturn(List.of(new Usuario()));
        BodegaRepository bodegas = mock(BodegaRepository.class);
        Bodega b = new Bodega(); b.setEmpresa(e);
        when(bodegas.findByEmpresaIdAndEstado(77L, 1)).thenReturn(List.of(b));
        Producto p = new Producto(); p.setId(3L); p.setEmpresa(e); p.setNombreProducto("Café");
        p.setPrecioVenta(2000); p.setPrecioCompra(500); p.setPorcentajeIva(new BigDecimal("13.00"));
        p.setCodigoTarifaIva("08"); p.setCodigoCabys("4321150100101");
        ProductoRepository productos = mock(ProductoRepository.class);
        when(productos.findById(3L)).thenReturn(Optional.of(p));
        PedidoRepository pedidos = mock(PedidoRepository.class);
        when(pedidos.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));

        new SelfCheckoutService(mesaRepo, pedidos, productos, bodegas, usuarios, mock(CacheManager.class))
            .crearPedido("tok", "Ana", null, null, List.of(Map.of("productoId", 3L, "cantidad", 2)));

        ArgumentCaptor<Pedido> cap = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidos).save(cap.capture());
        Pedido pedido = cap.getValue();
        assertThat(pedido.getMontoImpuesto()).isZero();
        assertThat(pedido.getTotalPedido()).isEqualTo(4000);
        assertThat(PosVentaIvaRegimenTest.totalXml(pedido, ComprobanteFiscal.TIPO_TIQUETE)).isEqualTo(4000L);
    }
}
