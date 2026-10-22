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
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.cache.CacheManager;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("Venta directa del POS: el metodo se persiste en su forma canonica")
class PosVentaMetodoCanonicoTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private ClienteMostradorResolver clienteMostradorResolver;
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

    @BeforeEach
    void setUp() {
        Empresa empresa = new Empresa();
        empresa.setId(1L);
        Bodega bodega = new Bodega();
        bodega.setId(2L);
        bodega.setEmpresa(empresa);
        Producto producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Cable");
        producto.setPrecioVenta(5000);
        producto.setPrecioCompra(2000);
        producto.setStockActual(10);
        producto.setStockReservado(0);
        producto.setEmpresa(empresa);
        Usuario cliente = new Usuario();
        cliente.setId(Constants.ID_USUARIO_MOSTRADOR);
        cliente.setNombre("Mostrador");

        when(clienteMostradorResolver.mostrador()).thenReturn(cliente);
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));
        when(bodegaRepository.findByEmpresaIdAndEstado(1L, Constants.ESTADO_ACTIVO)).thenReturn(List.of(bodega));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(inv -> inv.getArgument(0));
        when(turnoCajaService.getTurnoActivo(any())).thenReturn(Optional.empty());
        when(cacheManager.getCache(anyString())).thenReturn(null);
    }

    private static PosVentaDTO dto(String metodo) {
        PosVentaDTO dto = new PosVentaDTO();
        dto.setMetodoPago(metodo);
        PosVentaDTO.Item item = new PosVentaDTO.Item();
        item.setProductoId(10L);
        item.setCantidad(1);
        dto.setItems(List.of(item));
        return dto;
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "EFECTIVO", "efectivo", " efectivo ", " Efectivo "})
    @DisplayName("se guarda siempre como EFECTIVO")
    void seGuardaCanonico(String metodo) {
        service.crearVenta(dto(metodo), 5L, 1L, "caja@test.cr");

        ArgumentCaptor<Pedido> captor = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoRepository).save(captor.capture());
        assertThat(captor.getValue().getMetodoPago()).isEqualTo("EFECTIVO");
    }

    @Test
    @DisplayName("el helper devuelve el valor canonico")
    void helperDevuelveCanonico() {
        assertThat(PosVentaService.exigirMetodoDirecto(" efectivo ")).isEqualTo("EFECTIVO");
        assertThat(PosVentaService.exigirMetodoDirecto(null)).isEqualTo("EFECTIVO");
        assertThat(PosVentaService.exigirMetodoDirecto("  ")).isEqualTo("EFECTIVO");
    }
}
