package com.hotclick.service.pedido;

import com.hotclick.controller.AdminAsignarController;
import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.dto.ResponseDTO;
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
import com.hotclick.service.N8nWebhookService;
import com.hotclick.service.PedidoService;
import com.hotclick.service.VentaService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Matriz de la política compartida de método y estado en los caminos de alta manual:
 * venta del panel, pedido manual (PedidoManualFactory) y asignación de compras (AdminAsignarController).
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Política de método y estado: matriz de caminos de alta manual")
class MetodoPagoManualMatrizTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private BodegaRepository bodegaRepository;
    @Mock private ProductoRepository productoRepository;
    @Mock private PedidoRepository pedidoRepository;
    @Mock private N8nWebhookService n8nWebhookService;
    @Mock private PedidoPagoManualService pedidoPagoManualService;
    @InjectMocks private PedidoManualFactory factory;

    private Empresa empresa;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setId(7L);
        Usuario cliente = new Usuario();
        cliente.setId(1L);
        Bodega bodega = new Bodega();
        bodega.setId(5L);
        bodega.setEmpresa(empresa);
        Producto producto = new Producto();
        producto.setId(10L);
        producto.setPrecioVenta(1000);
        producto.setPrecioCompra(500);
        producto.setEmpresa(empresa);
        lenient().when(usuarioRepository.findById(1L)).thenReturn(Optional.of(cliente));
        lenient().when(usuarioRepository.esClienteDeEmpresa(1L, 7L)).thenReturn(true);
        lenient().when(bodegaRepository.findById(anyLong())).thenReturn(Optional.of(bodega));
        lenient().when(productoRepository.findAllById(anyList())).thenReturn(List.of(producto));
        lenient().when(pedidoRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private static ManualPedidoDTO dto(String metodo, String estado) {
        ManualPedidoDTO dto = new ManualPedidoDTO();
        dto.setUsuarioId(1L);
        dto.setBodegaId(5L);
        dto.setMetodoEnvio(Constants.ENVIO_RETIRO);
        dto.setMetodoPago(metodo);
        dto.setEstadoPedido(estado);
        ManualPedidoDTO.ItemDTO item = new ManualPedidoDTO.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(1);
        dto.setItems(List.of(item));
        return dto;
    }

    @ParameterizedTest(name = "pedido manual: {0} + {1} nace {2}")
    @CsvSource({
        "EFECTIVO,PAGADO,PAGADO",
        "EFECTIVO,EN_PREPARACION,EN_PREPARACION",
        "EFECTIVO,PENDIENTE,PENDIENTE",
        "efectivo,PAGADO,PAGADO",
        "SINPE,PAGADO,PENDIENTE",
        "SINPE,EN_PREPARACION,PENDIENTE",
        "TARJETA,PAGADO,PENDIENTE",
        "TRANSFERENCIA,PAGADO,PENDIENTE",
        "CONTRA_ENTREGA,PAGADO,PENDIENTE",
        "EXTERNO,PAGADO,PENDIENTE",
        "SINPE,PENDIENTE,PENDIENTE",
        "texto libre,PAGADO,PENDIENTE"
    })
    void pedidoManualMatriz(String metodo, String estadoPedido, String esperado) {
        Pedido nuevo = factory.crearPedidoManual(dto(metodo, estadoPedido), empresa);
        assertThat(nuevo.getEstadoPedido()).isEqualTo(esperado);
    }

    @Test
    @DisplayName("pedido manual sin estado nace PENDIENTE sea cual sea el método")
    void pedidoManualSinEstado() {
        assertThat(factory.crearPedidoManual(dto("EFECTIVO", null), empresa).getEstadoPedido())
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(factory.crearPedidoManual(dto("SINPE", null), empresa).getEstadoPedido())
            .isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @ParameterizedTest(name = "asignación: {0} + ENTREGADO nace {1}")
    @CsvSource({
        "EXTERNO,ENTREGADO",
        "EFECTIVO,ENTREGADO",
        "SINPE,PENDIENTE",
        "TRANSFERENCIA,PENDIENTE",
        "CONTRA_ENTREGA,PENDIENTE",
        "TARJETA,PENDIENTE"
    })
    void asignacionMatriz(String metodo, String esperado) {
        PedidoService pedidoService = mock(PedidoService.class);
        when(pedidoService.crearCompraExterna(any(), any())).thenAnswer(inv ->
            factory.crearPedidoManual(inv.getArgument(0), inv.getArgument(1), true));
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(7L);
        EmpresaRepository empresaRepository = mock(EmpresaRepository.class);
        when(empresaRepository.findById(7L)).thenReturn(Optional.of(empresa));
        UsuarioRepository usuarios = mock(UsuarioRepository.class);
        when(usuarios.esClienteDeEmpresa(1L, 7L)).thenReturn(true);

        AdminAsignarController c = new AdminAsignarController();
        ReflectionTestUtils.setField(c, "pedidoService", pedidoService);
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "empresaRepository", empresaRepository);
        ReflectionTestUtils.setField(c, "usuarioRepository", usuarios);

        Map<String, Object> body = Map.of(
            "usuarioId", 1,
            "metodoPago", metodo,
            "items", List.of(Map.of("productoId", 10, "cantidad", 1, "precioUnitario", 1000)));
        ResponseEntity<ResponseDTO> res = c.asignarCompra(body);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        Pedido pedido = (Pedido) res.getBody().getData();
        assertThat(pedido.getEstadoPedido()).isEqualTo(esperado);
    }

    @ParameterizedTest(name = "venta del panel: {0} + {1} + {2} nace {3}")
    @CsvSource({
        "EFECTIVO,RETIRO_EN_TIENDA,COMPLETADO,COMPLETADO",
        "EFECTIVO,RETIRO_EN_TIENDA,ENTREGADO,ENTREGADO",
        "EFECTIVO,ENVIO_A_DOMICILIO,COMPLETADO,PENDIENTE",
        "EFECTIVO,RETIRO_EN_TIENDA,PAGADO,PENDIENTE",
        "EFECTIVO,RETIRO_EN_TIENDA,,COMPLETADO"
    })
    void ventaPanelMatriz(String metodo, String envio, String estado, String esperado) {
        assertThat(VentaService.resolverEstadoInicial(metodo, envio, estado)).isEqualTo(esperado);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SINPE", "TARJETA", "TRANSFERENCIA", "CONTRA_ENTREGA", "EXTERNO"})
    @DisplayName("venta del panel: ningún método distinto de efectivo se acepta")
    void ventaPanelRechazaMetodos(String metodo) {
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> VentaService.exigirMetodoVenta(metodo))
            .isInstanceOf(com.hotclick.exception.VentaMetodoRequierePasarelaException.class);
    }
}
