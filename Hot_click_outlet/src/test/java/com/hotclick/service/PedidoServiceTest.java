package com.hotclick.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.ManualPedidoDTO;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PedidoService — unit tests")
class PedidoServiceTest {

    @Mock private PedidoRepository         pedidoRepository;
    @Mock private NotificacionEmailService  notificacionEmailService;
    @Mock private N8nWebhookService         n8nWebhookService;
    @Mock private UsuarioRepository         usuarioRepository;
    @Mock private BodegaRepository          bodegaRepository;
    @Mock private ProductoRepository        productoRepository;
    @Mock private ObjectMapper              objectMapper;

    @InjectMocks private PedidoService service;

    private Usuario  testUser;
    private Bodega   testBodega;
    private Producto testProducto;

    @BeforeEach
    void setUp() {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setCorreo("user@hotclick.cr");
        testUser.setNombre("Test User");

        testBodega = new Bodega();
        testBodega.setId(1L);
        testBodega.setNombreBodega("Bodega Central");

        testProducto = new Producto();
        testProducto.setId(10L);
        testProducto.setNombreProducto("Audífonos Pro");
        testProducto.setPrecioVenta(25000);
        testProducto.setPrecioCompra(15000);
        testProducto.setStockActual(5);
        testProducto.setStockReservado(0);
        testProducto.setEstado(Constants.ESTADO_ACTIVO);
    }

    // ── crearPedidoManual ─────────────────────────────────────────────────────

    @Test
    @DisplayName("crearPedidoManual → calcula total correctamente (subtotal + envío)")
    void crearPedidoManual_calculatesTotal() {
        setupManualMocks();

        ManualPedidoDTO dto = buildDto(1, 25000, 2000);
        Pedido result = service.crearPedidoManual(dto, null);

        assertThat(result.getSubtotal()).isEqualTo(25000);
        assertThat(result.getCostoEnvio()).isEqualTo(2000);
        assertThat(result.getTotalPedido()).isEqualTo(27000);
        assertThat(result.getEstadoPedido()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(result.getMetodoPago()).isEqualTo("SINPE");
    }

    @Test
    @DisplayName("crearPedidoManual → múltiples items suman correctamente")
    void crearPedidoManual_multipleItems_sumCorrect() {
        Producto p2 = new Producto();
        p2.setId(20L);
        p2.setNombreProducto("Teclado Mecánico");
        p2.setPrecioVenta(15000);
        p2.setPrecioCompra(9000);

        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findAllById(anyList())).thenReturn(List.of(testProducto, p2));
        when(pedidoRepository.save(any())).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            if (p.getId() == null) p.setId(100L);
            return p;
        });

        ManualPedidoDTO dto = new ManualPedidoDTO();
        dto.setUsuarioId(1L);
        dto.setBodegaId(1L);
        dto.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        dto.setMetodoPago("SINPE");
        dto.setCostoEnvio(2000);

        ManualPedidoDTO.ItemDTO i1 = new ManualPedidoDTO.ItemDTO();
        i1.setProductoId(10L);
        i1.setCantidad(2);
        i1.setPrecioUnitario(25000);

        ManualPedidoDTO.ItemDTO i2 = new ManualPedidoDTO.ItemDTO();
        i2.setProductoId(20L);
        i2.setCantidad(1);
        i2.setPrecioUnitario(15000);

        dto.setItems(List.of(i1, i2));
        Pedido result = service.crearPedidoManual(dto, null);

        // 2×25000 + 1×15000 = 65000 subtotal, + 2000 envío = 67000
        assertThat(result.getSubtotal()).isEqualTo(65000);
        assertThat(result.getTotalPedido()).isEqualTo(67000);
    }

    @Test
    @DisplayName("crearPedidoManual → lanza excepción si usuario no existe")
    void crearPedidoManual_usuarioNoExiste_throws() {
        when(usuarioRepository.findById(999L)).thenReturn(Optional.empty());

        ManualPedidoDTO dto = new ManualPedidoDTO();
        dto.setUsuarioId(999L);
        dto.setBodegaId(1L);
        dto.setMetodoEnvio(Constants.ENVIO_RETIRO);
        dto.setMetodoPago("SINPE");
        dto.setItems(List.of());

        assertThatThrownBy(() -> service.crearPedidoManual(dto, null))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("999");
    }

    @Test
    @DisplayName("crearPedidoManual → lanza excepción si producto no existe")
    void crearPedidoManual_productoNoExiste_throws() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findAllById(anyList())).thenReturn(List.of());

        ManualPedidoDTO.ItemDTO item = new ManualPedidoDTO.ItemDTO();
        item.setProductoId(99L);
        item.setCantidad(1);
        item.setPrecioUnitario(5000);

        ManualPedidoDTO dto = new ManualPedidoDTO();
        dto.setUsuarioId(1L);
        dto.setBodegaId(1L);
        dto.setMetodoEnvio(Constants.ENVIO_RETIRO);
        dto.setMetodoPago("SINPE");
        dto.setItems(List.of(item));

        assertThatThrownBy(() -> service.crearPedidoManual(dto, null))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Producto no encontrado");
    }

    // ── cambiarEstado ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("cambiarEstado → actualiza estadoPedido, sin email si no hay nota")
    void cambiarEstado_sinNota_noEnviaEmail() {
        Pedido pedido = buildPedido(Constants.PEDIDO_PENDIENTE);
        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any())).thenReturn(pedido);

        Pedido result = service.cambiarEstado(1L, Constants.PEDIDO_ENVIADO, null);

        assertThat(result.getEstadoPedido()).isEqualTo(Constants.PEDIDO_ENVIADO);
        verify(notificacionEmailService, never()).enviarSeguimientoEstado(any(), any());
    }

    @Test
    @DisplayName("cambiarEstado → con nota envía email de seguimiento")
    @SuppressWarnings("unchecked")
    void cambiarEstado_conNota_enviaEmail() throws Exception {
        Pedido pedido = buildPedido(Constants.PEDIDO_PENDIENTE);
        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any())).thenReturn(pedido);
        when(objectMapper.readValue(anyString(), any(TypeReference.class)))
            .thenReturn(new ArrayList<>());
        when(objectMapper.writeValueAsString(any())).thenReturn("[]");

        service.cambiarEstado(1L, Constants.PEDIDO_ENVIADO, "Tu pedido va en camino");

        verify(notificacionEmailService)
            .enviarSeguimientoEstado(any(Pedido.class), eq("Tu pedido va en camino"));
    }

    @Test
    @DisplayName("cambiarEstado → lanza excepción si pedido no existe")
    void cambiarEstado_pedidoNoExiste_throws() {
        when(pedidoRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cambiarEstado(999L, Constants.PEDIDO_CANCELADO, null))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("no encontrado");
    }

    // ── buscarPorId ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("buscarPorId → lanza excepción si no existe")
    void buscarPorId_noExiste_throws() {
        when(pedidoRepository.findByIdWithDetails(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscarPorId(999L))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("no encontrado");
    }

    // ── asignarGuia ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("asignarGuia → establece guía, URL tracking, estado ENVIADO y envía email")
    void asignarGuia_setsTrackingAndSendsEmail() {
        Pedido pedido = buildPedido(Constants.PEDIDO_PAGADO);
        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any())).thenReturn(pedido);

        Pedido result = service.asignarGuia(1L, "CR123456789CR");

        assertThat(result.getNumeroGuia()).isEqualTo("CR123456789CR");
        assertThat(result.getUrlTracking()).contains("CR123456789CR");
        assertThat(result.getEstadoPedido()).isEqualTo(Constants.PEDIDO_ENVIADO);
        verify(notificacionEmailService).enviarNotificacionGuia(any(Pedido.class));
    }

    // ── procesarEnvio ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("procesarEnvio → actualiza costoEnvio y estado ENVIADO")
    void procesarEnvio_updatesCostoEnvio() {
        Pedido pedido = buildPedido(Constants.PEDIDO_PAGADO);
        pedido.setCostoEnvio(0);
        when(pedidoRepository.findById(1L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any())).thenReturn(pedido);

        service.procesarEnvio(1L, "GU987654321", 3500);

        assertThat(pedido.getCostoEnvio()).isEqualTo(3500);
        assertThat(pedido.getNumeroGuia()).isEqualTo("GU987654321");
        assertThat(pedido.getEstadoPedido()).isEqualTo(Constants.PEDIDO_ENVIADO);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void setupManualMocks() {
        when(usuarioRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(bodegaRepository.findById(1L)).thenReturn(Optional.of(testBodega));
        when(productoRepository.findAllById(anyList())).thenReturn(List.of(testProducto));
        when(pedidoRepository.save(any())).thenAnswer(inv -> {
            Pedido p = inv.getArgument(0);
            if (p.getId() == null) p.setId(100L);
            return p;
        });
    }

    private ManualPedidoDTO buildDto(int cantidad, int precio, int envio) {
        ManualPedidoDTO dto = new ManualPedidoDTO();
        dto.setUsuarioId(1L);
        dto.setBodegaId(1L);
        dto.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        dto.setMetodoPago("SINPE");
        dto.setCostoEnvio(envio);

        ManualPedidoDTO.ItemDTO item = new ManualPedidoDTO.ItemDTO();
        item.setProductoId(10L);
        item.setCantidad(cantidad);
        item.setPrecioUnitario(precio);
        dto.setItems(List.of(item));
        return dto;
    }

    private Pedido buildPedido(String estado) {
        Pedido p = new Pedido();
        p.setId(1L);
        p.setNumeroPedido("ORD-TEST-001");
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(testUser);
        p.setBodega(testBodega);
        p.setCostoEnvio(0);
        p.setItems(new ArrayList<>());
        return p;
    }
}
