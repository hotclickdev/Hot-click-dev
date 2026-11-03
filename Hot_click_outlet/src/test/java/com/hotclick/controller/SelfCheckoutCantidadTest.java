package com.hotclick.controller;

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
import com.hotclick.service.SelfCheckoutService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.cache.CacheManager;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Autoservicio (QR de mesa, cuerpo público): la cantidad se valida (1..MAX) y los totales no desbordan el int. */
@DisplayName("Autoservicio — cantidad pública validada y totales sin overflow")
class SelfCheckoutCantidadTest {

    private final PedidoRepository pedidos = mock(PedidoRepository.class);
    private final Producto p = new Producto();

    private SelfCheckoutController controller() {
        Empresa e = new Empresa(); e.setId(77L); e.setRegimenIva("SIMPLIFICADO");
        Mesa mesa = new Mesa(); mesa.setEmpresa(e); mesa.setActivo(true); mesa.setNombre("Mesa 1");
        MesaRepository mesaRepo = mock(MesaRepository.class);
        when(mesaRepo.findByQrToken("tok")).thenReturn(Optional.of(mesa));
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        when(usuarios.findByEmpresaIdOrderByIdDesc(77L)).thenReturn(List.of(new Usuario()));
        BodegaRepository bodegas = mock(BodegaRepository.class);
        Bodega b = new Bodega(); b.setEmpresa(e);
        when(bodegas.findByEmpresaIdAndEstado(77L, 1)).thenReturn(List.of(b));
        p.setId(3L); p.setEmpresa(e); p.setNombreProducto("Café");
        p.setPrecioVenta(2000); p.setPrecioCompra(500); p.setPorcentajeIva(new BigDecimal("13.00"));
        ProductoRepository productos = mock(ProductoRepository.class);
        when(productos.findById(3L)).thenReturn(Optional.of(p));
        when(pedidos.save(any(Pedido.class))).thenAnswer(i -> i.getArgument(0));
        return new SelfCheckoutController(
            new SelfCheckoutService(mesaRepo, pedidos, productos, bodegas, usuarios, mock(CacheManager.class)));
    }

    private int status(Object cantidad) {
        Map<String, Object> item = new HashMap<>();
        item.put("productoId", 3L);
        item.put("cantidad", cantidad);
        return controller().crearPedido("tok", Map.of("clienteNombre", "Ana", "items", List.of(item)))
            .getStatusCode().value();
    }

    @Test
    void cantidadesFueraDeRango400SinGuardar() {
        for (Object c : new Object[]{0, -1, -2147483648, 101,
                Integer.MAX_VALUE, 4294967297L, 1.5, "3", null}) {
            assertThat(status(c)).as("cantidad=" + c).isEqualTo(400);
        }
        verify(pedidos, never()).save(any());
    }

    @Test
    void limitesValidos200() {
        assertThat(status(1)).isEqualTo(200);
        assertThat(status(100)).isEqualTo(200);
    }

    @Test
    void totalQueDesbordaElInt400() {
        SelfCheckoutController c = controller();
        p.setPrecioVenta(Integer.MAX_VALUE / 2);
        int st = c.crearPedido("tok", Map.of("items", List.of(Map.of("productoId", 3L, "cantidad", 3))))
            .getStatusCode().value();
        assertThat(st).isEqualTo(400);
        verify(pedidos, never()).save(any());
    }

    private int statusItems(Object items) {
        Map<String, Object> body = new HashMap<>();
        body.put("items", items);
        return controller().crearPedido("tok", body).getStatusCode().value();
    }

    private static Map<String, Object> linea(Object productoId) {
        Map<String, Object> m = new HashMap<>();
        m.put("productoId", productoId);
        m.put("cantidad", 1);
        return m;
    }

    @Test
    @DisplayName("BAJO: máximo 50 líneas por pedido; 51 → 400")
    void topeDeLineas() {
        assertThat(statusItems(java.util.Collections.nCopies(50, linea(3L))))
            .isEqualTo(200);
        clearInvocations(pedidos);
        assertThat(statusItems(java.util.Collections.nCopies(51, linea(3L)))).isEqualTo(400);
        verify(pedidos, never()).save(any());
    }

    @Test
    @DisplayName("BAJO: ítem que no es objeto, items que no es lista o productoId decimal → 400 (no 500)")
    void formasInvalidas400() {
        assertThat(statusItems(List.of("x"))).isEqualTo(400);
        assertThat(statusItems(List.of(7))).isEqualTo(400);
        assertThat(statusItems(java.util.Arrays.asList((Object) null))).isEqualTo(400);
        assertThat(statusItems("x")).isEqualTo(400);
        assertThat(statusItems(List.of(linea(3.0)))).isEqualTo(400);
        assertThat(statusItems(List.of(linea(3.7)))).isEqualTo(400);
        assertThat(statusItems(List.of(linea("3")))).isEqualTo(400);
        verify(pedidos, never()).save(any());
    }

    @Test
    @DisplayName("BAJO: el token QR se enmascara en el log del 500")
    void tokenEnmascarado() {
        assertThat(SelfCheckoutController.tokenEnmascarado("abcdef123456")).isEqualTo("****3456").doesNotContain("abcdef");
        assertThat(SelfCheckoutController.tokenEnmascarado("abc")).isEqualTo("****");
        assertThat(SelfCheckoutController.tokenEnmascarado(null)).isEqualTo("****");
    }
}
