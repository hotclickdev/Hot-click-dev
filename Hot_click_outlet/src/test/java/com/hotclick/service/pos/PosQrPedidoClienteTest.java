package com.hotclick.service.pos;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Pedido POS QR: productos y usuario")
class PosQrPedidoClienteTest {

    @Mock UsuarioRepository usuarioRepo;
    @Mock BodegaRepository bodegaRepo;
    @Mock ProductoRepository productoRepo;
    @Mock PedidoRepository pedidoRepo;
    @Mock PosQrSesionRepository posQrRepo;
    @Mock StockService stockService;
    @Mock TurnoCajaService turnoCajaService;
    @Mock TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Mock PosQrSessionService sessionService;
    @InjectMocks PosQrPedidoFactory factory;

    @Test
    @DisplayName("El pedido lleva los productos del QR y el cliente elegido, no el emprendedor como comprador")
    void pedidoConProductosYClienteElegido() {
        Usuario emprendedor = usuario(7L, "Ana Emprendedora", "ana@tienda.cr");
        Usuario cliente     = usuario(42L, "Carlos", "carlos@mail.cr");
        Empresa empresa     = empresa(1L);
        Bodega bodega       = bodega(3L, empresa);
        Producto mouse      = producto(10L, "Mouse", 5, 1000);

        PosQrSesion sesion = new PosQrSesion();
        sesion.setEmpresa(empresa);
        sesion.setUsuario(emprendedor);
        sesion.setClienteId(42L);
        sesion.setBodegaId(3L);
        sesion.setItemsJson("[{\"productoId\":\"10\",\"cantidad\":2,\"precioUnitario\":5000,\"nombre\":\"Mouse\"}]");

        when(sessionService.getMapper()).thenReturn(new com.fasterxml.jackson.databind.ObjectMapper());
        when(usuarioRepo.findById(42L)).thenReturn(Optional.of(cliente));
        when(bodegaRepo.findById(3L)).thenReturn(Optional.of(bodega));
        when(productoRepo.findByIdForUpdate(10L)).thenReturn(Optional.of(mouse));
        when(pedidoRepo.save(any(Pedido.class))).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            p.setId(88L);
            return p;
        });

        factory.crearPedidoPOS(sesion, "TARJETA");

        ArgumentCaptor<Pedido> cap = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepo).save(cap.capture());
        Pedido pedido = cap.getValue();
        assertThat(pedido.getUsuarioFinal().getId()).isEqualTo(42L);
        assertThat(pedido.getUsuarioFinal().getId()).isNotEqualTo(emprendedor.getId());
        assertThat(pedido.getNotas()).contains("Ana Emprendedora");
        assertThat(pedido.getItems()).hasSize(1);
        assertThat(pedido.getItems().get(0).getCantidad()).isEqualTo(2);
        assertThat(pedido.getTotalPedido()).isEqualTo(10_000);
        assertThat(sesion.getEstado()).isEqualTo("PAGADO");
        verify(telegramNotificacionClienteService).notificarVenta(
            eq(1L), anyString(), eq(10_000), eq("TARJETA"), eq("Carlos"), eq("POS"));
        verify(stockService).descontarPorVentaPOS(eq(mouse), eq(2), anyString(), eq("ana@tienda.cr"));
    }

    @Test
    @DisplayName("Sin cliente en el POS usa mostrador")
    void sinClienteUsaMostrador() {
        when(usuarioRepo.findById(Constants.ID_USUARIO_MOSTRADOR))
            .thenReturn(Optional.of(usuario(999L, "Mostrador", "pos@hotclick.lat")));
        Usuario cliente = factory.resolverCliente(null);
        assertThat(cliente.getId()).isEqualTo(999L);
    }

    private static Usuario usuario(Long id, String nombre, String correo) {
        Usuario u = new Usuario();
        u.setId(id);
        u.setNombre(nombre);
        u.setCorreo(correo);
        return u;
    }

    private static Empresa empresa(Long id) {
        Empresa e = new Empresa();
        e.setId(id);
        return e;
    }

    private static Bodega bodega(Long id, Empresa empresa) {
        Bodega b = new Bodega();
        b.setId(id);
        b.setEmpresa(empresa);
        return b;
    }

    private static Producto producto(Long id, String nombre, int stock, int costo) {
        Producto p = new Producto();
        p.setId(id);
        p.setNombreProducto(nombre);
        p.setStockActual(stock);
        p.setStockReservado(0);
        p.setPrecioCompra(costo);
        return p;
    }
}
