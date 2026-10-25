package com.hotclick.service.pos;

import com.hotclick.dto.PosVentaDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.TurnoCaja;
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
@DisplayName("PosVentaService — cantidad > 0 y turno abierto (C-01, C-05)")
class PosVentaCantidadTurnoTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock ClienteMostradorResolver clienteMostradorResolver;
    @Mock com.hotclick.repository.PosVentaTurnoRepository ventaTurnoRepository;

    @org.junit.jupiter.api.BeforeEach
    void mostradorDelegaAlRepo() {
        org.mockito.Mockito.lenient().when(clienteMostradorResolver.mostrador())
            .thenAnswer(i -> usuarioRepository.findById(Constants.ID_USUARIO_MOSTRADOR).orElseThrow());
    }
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
    private TurnoCaja turno;

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
        turno = new TurnoCaja();
        turno.setId(77L);
        turno.setEmpresa(empresa);
        when(turnoCajaService.getTurnoActivo(5L)).thenReturn(Optional.of(turno));
        when(cacheManager.getCache(anyString())).thenReturn(null);
    }

    private PosVentaDTO venta(Integer cantidad) {
        PosVentaDTO dto = new PosVentaDTO();
        dto.setMetodoPago("EFECTIVO");
        PosVentaDTO.Item item = new PosVentaDTO.Item();
        item.setProductoId(10L);
        item.setCantidad(cantidad);
        dto.setItems(List.of(item));
        return dto;
    }

    private void sinEfectos() {
        verify(stockService, never()).descontarPorVentaPOS(any(), anyInt(), anyString(), anyString());
        verify(pedidoRepository, never()).save(any());
        verify(turnoCajaService, never()).actualizarTotales(any(), any(), any());
        assertThat(producto.getStockActual()).isEqualTo(10);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(ints = {0, -1, -5})
    @DisplayName("C-01: cantidad <= 0 → IllegalArgumentException (400), sin tocar stock, pedido ni turno")
    void cantidadNoPositiva_rechaza(int cantidad) {
        assertThatThrownBy(() -> service.crearVenta(venta(cantidad), 5L, 1L, "caja@test.cr"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("cantidad");
        sinEfectos();
    }

    @Test
    @DisplayName("C-01: cantidad mayor a 999 → rechazada")
    void cantidadExcesiva_rechaza() {
        assertThatThrownBy(() -> service.crearVenta(venta(1000), 5L, 1L, "caja@test.cr"))
            .isInstanceOf(IllegalArgumentException.class);
        sinEfectos();
    }

    @Test
    @DisplayName("C-05: sin turno abierto → IllegalStateException (400) 'Abrí caja', sin efectos")
    void sinTurnoAbierto_rechaza() {
        when(turnoCajaService.getTurnoActivo(5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.crearVenta(venta(1), 5L, 1L, "caja@test.cr"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Abrí caja");
        sinEfectos();
    }

    @Test
    @DisplayName("C-05: turno abierto de otro negocio → rechazado")
    void turnoDeOtraEmpresa_rechaza() {
        Empresa otra = new Empresa();
        otra.setId(2L);
        turno.setEmpresa(otra);
        assertThatThrownBy(() -> service.crearVenta(venta(1), 5L, 1L, "caja@test.cr"))
            .isInstanceOf(IllegalStateException.class);
        sinEfectos();
    }

    @Test
    @DisplayName("C-05: si falla sumar al turno, la venta falla (no se traga el error)")
    void falloAlActualizarTurno_propaga() {
        org.mockito.Mockito.doThrow(new IllegalStateException("x"))
            .when(turnoCajaService).actualizarTotales(any(), any(), any());
        assertThatThrownBy(() -> service.crearVenta(venta(1), 5L, 1L, "caja@test.cr"))
            .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("feliz: turno abierto y cantidad 2 → suma al turno")
    void ventaValida_sumaAlTurno() {
        Pedido p = service.crearVenta(venta(2), 5L, 1L, "caja@test.cr");
        assertThat(p.getTotalPedido()).isEqualTo(10000);
        verify(turnoCajaService).actualizarTotales(77L, "EFECTIVO", 10000);
    }
}
