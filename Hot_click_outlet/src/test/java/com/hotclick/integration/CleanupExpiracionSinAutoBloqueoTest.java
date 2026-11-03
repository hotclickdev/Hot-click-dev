package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.payment.PaymentExpirationCleanupService;
import com.hotclick.service.payment.ReservaAntiBotService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

/**
 * QA5 ALTO (bloqueo cleanup): el pago 1 vencido se cancela y libera stock del producto (FOR UPDATE);
 * el pago 2 del mismo producto resulta cobrado en ONVO y su captura (REQUIRES_NEW, otra conexión)
 * bloquea el mismo producto. Con la limpieza en una sola transacción, la captura espera un lock de
 * su propio llamador: en Postgres cuelga para siempre; en H2 sale por lock timeout y el cobro no se
 * registra. Con cada pago en su propia transacción la captura entra sin esperar.
 */
@DisplayName("[QA5 ALTO] Cleanup de expiración: ninguna captura espera un lock de su propio llamador")
class CleanupExpiracionSinAutoBloqueoTest extends BaseIntegrationTest {

    private static final String SESION_VENCIDA = "cs_qa5_vencida";
    private static final String SESION_COBRADA = "cs_qa5_cobrada";
    private static final String INTENT = "pi_qa5_cobrada";

    @MockitoBean private OnvoService onvoService;
    @MockitoBean private PaymentService paymentService;
    @MockitoBean private AggregatorService aggregatorService;

    @Autowired private PaymentExpirationCleanupService cleanup;
    @Autowired private ReservaAntiBotService reservaAntiBot;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    private Producto producto;

    @BeforeEach
    void armar() {
        reservaAntiBot.limpiar();
        reservaAntiBot.setClock(Clock.system(Constants.ZONA_CR));
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("live");
        doReturn(Map.of()).when(onvoService).obtenerCheckoutSession(SESION_VENCIDA);
        doReturn(Map.of("paymentStatus", "paid", "status", "open", "paymentIntentId", INTENT, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(SESION_COBRADA);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "live"))
            .when(onvoService).obtenerPaymentIntent(INTENT);

        String slug = "qa5-lock-" + System.nanoTime();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("QA5 Lock");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        Categoria categoria = new Categoria();
        categoria.setNombreCategoria("Cat-QA5-Lock");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Bodega QA5 Lock");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);

        producto = new Producto();
        producto.setNombreProducto("Producto QA5 Lock");
        producto.setSku("SKU-QA5L-" + System.nanoTime());
        producto.setPrecioVenta(10000);
        producto.setPrecioCompra(7000);
        producto.setStockActual(10);
        producto.setStockReservado(2);
        producto.setStockMinimo(1);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        producto.setCategoria(categoria);
        producto.setEmpresa(empresa);
        producto.setBodega(bodega);
        producto.setAdminCliente(adminUser);
        producto.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        producto = productoRepository.saveAndFlush(producto);

        // El orden por id hace que el pago vencido (lock del producto) se procese antes que el cobrado.
        crearPagoVencido(empresa, bodega, SESION_VENCIDA);
        crearPagoVencido(empresa, bodega, SESION_COBRADA);

        // La confirmación real descuenta stock con FOR UPDATE del producto dentro de la captura.
        Long productoId = producto.getId();
        doAnswer(inv -> {
            productoRepository.findByIdForUpdate(productoId).orElseThrow();
            return null;
        }).when(paymentService).confirmarPedido(any(Pago.class));
    }

    private void crearPagoVencido(Empresa empresa, Bodega bodega, String sesion) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-QA5L-" + System.nanoTime() % 1_000_000);
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(40));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago(Constants.PROVEEDOR_ONVO);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        PedidoItem item = new PedidoItem();
        item.setPedido(p);
        item.setProducto(producto);
        item.setCantidad(1);
        item.setPrecioUnitarioMomento(10000);
        item.setCostoUnitarioMomento(7000);
        item.setSubtotalItem(10000);
        item.setUtilidadItem(3000);
        item.setDescuentoAplicado(0);
        item.setEstado(Constants.ESTADO_ACTIVO);
        p.getItems().add(item);
        p = pedidoRepository.saveAndFlush(p);

        Pago pago = new Pago();
        pago.setMerchantToken(sesion);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(40));
        pagoRepository.saveAndFlush(pago);
    }

    @AfterEach
    void limpiar() {
        reservaAntiBot.limpiar();
        webhookEventRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("pago vencido + pago cobrado del mismo producto → cancela uno, captura el otro, sin esperar locks")
    void cancelaYCapturaSinAutoBloqueo() {
        long inicio = System.nanoTime();
        cleanup.ejecutar();
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertThat(pagoRepository.findByMerchantToken(SESION_VENCIDA).orElseThrow().getEstadoPago())
            .isEqualTo(Constants.PAGO_CANCELADO);
        assertThat(pagoRepository.findByMerchantToken(SESION_COBRADA).orElseThrow().getEstadoPago())
            .as("la captura no debe quedar esperando el FOR UPDATE que tiene tomado la limpieza")
            .isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockReservado()).isEqualTo(1);
        assertThat(ms).as("sin esperas de lock").isLessThan(5_000);
    }
}
