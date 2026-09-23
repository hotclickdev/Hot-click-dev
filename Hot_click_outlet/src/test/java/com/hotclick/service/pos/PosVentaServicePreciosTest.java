package com.hotclick.service.pos;

import com.hotclick.dto.PosVentaDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.StockService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.service.VentaAvisoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.cache.CacheManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PosVentaService — precios server-side")
class PosVentaServicePreciosTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private StockService stockService;
    @Mock private TurnoCajaService turnoCajaService;
    @Mock private CacheManager cacheManager;
    @Mock private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @Mock private VentaAvisoService ventaAvisoService;
    @Mock private CompanyScope companyScope;

    @InjectMocks private PosVentaService service;

    private Empresa empresa;
    private Bodega bodega;
    private Producto producto;
    private Usuario cliente;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(1L);
        bodega = new Bodega();
        bodega.setId(2L);
        bodega.setEmpresa(empresa);
        producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Cable");
        producto.setPrecioVenta(5000);
        producto.setPrecioCompra(2000);
        producto.setStockActual(10);
        producto.setStockReservado(0);
        producto.setEmpresa(empresa);
        cliente = new Usuario();
        cliente.setId(Constants.ID_USUARIO_MOSTRADOR);
        cliente.setNombre("Mostrador");

        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));
        when(usuarioRepository.findById(Constants.ID_USUARIO_MOSTRADOR)).thenReturn(Optional.of(cliente));
        when(bodegaRepository.findByEmpresaIdAndEstado(1L, Constants.ESTADO_ACTIVO))
            .thenReturn(List.of(bodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            p.setId(99L);
            return p;
        });
        when(turnoCajaService.getTurnoActivo(any())).thenReturn(Optional.empty());
        when(cacheManager.getCache(anyString())).thenReturn(null);
    }

    @Test
    @DisplayName("ignora precioUnitario del cliente y usa precioEfectivo")
    void ignoraPrecioCliente() {
        PosVentaDTO dto = new PosVentaDTO();
        dto.setMetodoPago("EFECTIVO");
        PosVentaDTO.Item item = new PosVentaDTO.Item();
        item.setProductoId(10L);
        item.setCantidad(1);
        item.setPrecioUnitario(1); // intento de manipulación
        dto.setItems(List.of(item));

        Pedido pedido = service.crearVenta(dto, 5L, 1L, "caja@test.cr");

        assertThat(pedido.getItems().get(0).getPrecioUnitarioMomento()).isEqualTo(5000);
        assertThat(pedido.getTotalPedido()).isEqualTo(5000);
    }

    @Test
    @DisplayName("descuento sin permiso → SecurityException")
    void descuentoSinPermiso_rechaza() {
        when(companyScope.hasAuthority("pos.descuento")).thenReturn(false);
        when(companyScope.isAdminIT()).thenReturn(false);

        PosVentaDTO dto = new PosVentaDTO();
        dto.setDescuentoGlobal(1000);
        PosVentaDTO.Item item = new PosVentaDTO.Item();
        item.setProductoId(10L);
        item.setCantidad(1);
        dto.setItems(List.of(item));

        assertThatThrownBy(() -> service.crearVenta(dto, 5L, 1L, "caja@test.cr"))
            .isInstanceOf(SecurityException.class);
        verify(pedidoRepository, never()).save(any());
        verify(stockService, never()).descontarPorVentaPOS(any(), anyInt(), anyString(), anyString());
    }
}
