package com.hotclick.service;

import com.hotclick.controller.VentaController;
import com.hotclick.dto.ResponseDTO;
import com.hotclick.dto.VentaRequestDTO;
import com.hotclick.exception.VentaMetodoRequierePasarelaException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CarritoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MovimientoStockRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Registro manual de ventas: solo cobro presencial, el resto va por la pasarela")
class VentaSoloEfectivoTest {

    @Mock private PedidoService pedidoService;
    @Mock private StockService stockService;
    @Mock private ProductoRepository productoRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private CarritoRepository carritoRepository;
    @Mock private MovimientoStockRepository movimientoStockRepository;
    @Mock private EmpresaRepository empresaRepository;
    @Mock private TelegramService telegramService;
    @Mock private TelegramNotificacionClienteService telegramNotificacionClienteService;
    @InjectMocks private VentaService service;

    private static VentaRequestDTO dto(String metodo) {
        VentaRequestDTO dto = new VentaRequestDTO();
        dto.setMetodoPago(metodo);
        VentaRequestDTO.ItemVentaDTO item = new VentaRequestDTO.ItemVentaDTO();
        item.setProductoId(10L);
        item.setCantidad(1);
        dto.setItems(List.of(item));
        return dto;
    }

    private void prepararVentaCompleta() {
        Empresa empresa = new Empresa();
        empresa.setId(1L);
        Producto producto = new Producto();
        producto.setId(10L);
        producto.setNombreProducto("Producto de prueba");
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setStockActual(5);
        producto.setStockReservado(0);
        producto.setPrecioVenta(1000);
        producto.setPrecioCompra(600);
        producto.setEmpresa(empresa);
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresa));
        when(usuarioRepository.findByCorreo(anyString())).thenReturn(Optional.of(new Usuario()));
        when(bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(any(), anyInt()))
            .thenReturn(List.of(new Bodega()));
        when(productoRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(producto));
        when(pedidoService.crearPedido(any())).thenAnswer(i -> {
            Pedido p = i.getArgument(0);
            p.setNumeroPedido("P-1");
            return p;
        });
    }

    @ParameterizedTest
    @ValueSource(strings = {"SINPE", "TARJETA", "TRANSFERENCIA", "sinpe", "tarjeta", "  Sinpe  ", "texto libre"})
    @DisplayName("servicio: metodo no efectivo se rechaza antes de cualquier efecto")
    void servicioRechazaSinEfectos(String metodo) {
        assertThatThrownBy(() -> service.crearVenta(dto(metodo), "op@test.cr", 1L))
            .isInstanceOf(VentaMetodoRequierePasarelaException.class);

        verifyNoInteractions(empresaRepository, usuarioRepository, bodegaRepository, productoRepository,
            carritoRepository, movimientoStockRepository, stockService, pedidoService,
            telegramService, telegramNotificacionClienteService);
        verify(stockService, never()).descontarPorVenta(any(), anyInt(), anyBoolean(), anyString(), anyString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"SINPE", "TARJETA", "TRANSFERENCIA", "sinpe", "  Tarjeta ", "texto libre"})
    @DisplayName("controller: 400 con codigo estable")
    void controllerDa400ConCodigo(String metodo) {
        VentaController c = new VentaController();
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.requireEmpresaId()).thenReturn(1L);
        ReflectionTestUtils.setField(c, "ventaService", service);
        ReflectionTestUtils.setField(c, "companyScope", scope);
        UserDetails usuario = mock(UserDetails.class);
        when(usuario.getUsername()).thenReturn("op@test.cr");

        ResponseEntity<ResponseDTO> res = c.crearVenta(dto(metodo), usuario);

        assertThat(res.getStatusCode().value()).isEqualTo(400);
        assertThat(res.getBody().isSuccess()).isFalse();
        assertThat(res.getBody().getData()).isEqualTo(Map.of("codigo", "VENTA_METODO_REQUIERE_PASARELA"));
        verifyNoInteractions(pedidoService, stockService);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"EFECTIVO", "efectivo", " efectivo ", "   "})
    @DisplayName("servicio: efectivo (o sin metodo) se acepta y se persiste exactamente EFECTIVO")
    void efectivoSePersisteCanonico(String metodo) {
        prepararVentaCompleta();

        service.crearVenta(dto(metodo), "op@test.cr", 1L);

        ArgumentCaptor<Pedido> pedido = ArgumentCaptor.forClass(Pedido.class);
        verify(pedidoService).crearPedido(pedido.capture());
        assertThat(pedido.getValue().getMetodoPago()).isEqualTo("EFECTIVO");
    }

    @Test
    @DisplayName("null, vacio y blanco siguen significando EFECTIVO")
    void nuloYVacioSiguenSiendoEfectivo() {
        assertThat(VentaService.exigirMetodoVenta(null)).isEqualTo("EFECTIVO");
        assertThat(VentaService.exigirMetodoVenta("")).isEqualTo("EFECTIVO");
        assertThat(VentaService.exigirMetodoVenta("   ")).isEqualTo("EFECTIVO");
        assertThat(VentaService.exigirMetodoVenta(" efectivo ")).isEqualTo("EFECTIVO");
    }

    @Test
    @DisplayName("candado de reversibilidad: con la restriccion apagada vuelve el comportamiento anterior")
    void restriccionApagadaAceptaTodo() {
        assertThatCode(() -> VentaService.exigirMetodoVenta("SINPE", false)).doesNotThrowAnyException();
        assertThat(VentaService.exigirMetodoVenta("TARJETA", false)).isEqualTo("TARJETA");
        assertThat(VentaService.exigirMetodoVenta(null, false)).isEqualTo("EFECTIVO");
        assertThatThrownBy(() -> VentaService.exigirMetodoVenta("SINPE", true))
            .isInstanceOf(VentaMetodoRequierePasarelaException.class);
    }

    @Test
    @DisplayName("la constante de produccion queda en true")
    void constanteEnTrue() throws ReflectiveOperationException {
        Field f = VentaService.class.getDeclaredField("METODOS_VENTA_RESTRINGIDOS");
        f.setAccessible(true);
        assertThat(Modifier.isStatic(f.getModifiers())).isTrue();
        assertThat(f.getBoolean(null)).isTrue();
    }
}
