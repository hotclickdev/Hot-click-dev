package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Cancelación de venta manual sin cobro | stock")
class CancelacionVentaStockTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private MovimientoStockRepository movimientoStockRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private com.hotclick.service.payment.ReservaTiendaVencidaService reservaTiendaVencida;

    private Empresa emp;
    private Bodega bod;
    private Categoria categoria;
    private Producto prod1;
    private Producto prod2;
    private String token;

    @BeforeEach
    void setUp() {
        emp = new Empresa();
        emp.setNombreEmpresa("Cancel Stock");
        emp.setNombreComercial("Cancel Stock");
        emp.setSlug("cancel-stock");
        emp.setCorreoEmpresa("cancel-stock@test.cr");
        emp.setEstadoEmpresa("ACTIVO");
        emp.setFechaRegistro(LocalDateTime.now());
        emp = empresaRepository.saveAndFlush(emp);
        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-CancelStock");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
        bod = new Bodega();
        bod.setNombreBodega("Bodega cancel");
        bod.setDireccionExacta("Calle 1");
        bod.setTelefono("22223333");
        bod.setAdminCliente(adminUser);
        bod.setEmpresa(emp);
        bod.setEstado(Constants.ESTADO_ACTIVO);
        bod = bodegaRepository.saveAndFlush(bod);
        prod1 = producto("CS-1");
        prod2 = producto("CS-2");
        Usuario vend = crearUsuario("cs-vend@test.cr", "Vend", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        token = "Bearer " + jwtUtil.generateToken(vend.getCorreo(), vend.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.delete(categoria);
        usuarioRepository.findAll().forEach(u -> { u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Producto producto(String sku) {
        Producto p = new Producto();
        p.setNombreProducto("Prod " + sku);
        p.setDescripcionCorta("x");
        p.setSku(sku);
        p.setPrecioVenta(5000);
        p.setPrecioCompra(2000);
        p.setStockActual(10);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(emp);
        p.setBodega(bod);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private void reservadoAjeno(Producto p, int unidades) {
        Producto actual = productoRepository.findById(p.getId()).orElseThrow();
        actual.setStockReservado(unidades);
        productoRepository.saveAndFlush(actual);
    }

    private Pedido ventaDelPanel(String estado, long[] productos, int[] cantidades) throws Exception {
        StringBuilder items = new StringBuilder();
        for (int i = 0; i < productos.length; i++) {
            if (i > 0) items.append(',');
            items.append("{\"productoId\":").append(productos[i]).append(",\"cantidad\":").append(cantidades[i]).append('}');
        }
        String body = "{\"bodegaId\":" + bod.getId() + ",\"metodoPago\":\"EFECTIVO\",\"metodoEnvio\":\"RETIRO\","
            + "\"estadoInicial\":\"" + estado + "\",\"items\":[" + items + "]}";
        mockMvc.perform(post("/api/ventas").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
        return pedidoRepository.findAll().get(0);
    }

    private org.springframework.test.web.servlet.ResultActions cancelar(Long pedidoId) throws Exception {
        return mockMvc.perform(put("/api/pedidos/" + pedidoId + "/estado").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"CANCELADO\"}"));
    }

    private Producto recargar(Producto p) {
        return productoRepository.findById(p.getId()).orElseThrow();
    }

    private long movimientos(Producto p, String tipo) {
        return movimientoStockRepository.findByProductoIdOrderByFechaMovimientoDesc(p.getId()).stream()
            .filter(m -> tipo.equals(m.getTipoMovimiento())).count();
    }

    @Test
    void cancelarVentaPendienteDevuelveElStockSinTocarReservasAjenas() throws Exception {
        reservadoAjeno(prod1, 3);
        Pedido venta = ventaDelPanel("PENDIENTE", new long[]{prod1.getId()}, new int[]{4});
        assertThat(recargar(prod1).getStockActual()).isEqualTo(6);

        cancelar(venta.getId()).andExpect(status().isOk());

        Producto despues = recargar(prod1);
        assertThat(despues.getStockActual()).isEqualTo(10);
        assertThat(despues.getStockReservado()).isEqualTo(3);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isEqualTo(1);
        MovimientoStock mov = movimientoStockRepository.findByProductoIdOrderByFechaMovimientoDesc(prod1.getId()).stream()
            .filter(m -> MovimientoStock.CANCELACION_VENTA.equals(m.getTipoMovimiento())).findFirst().orElseThrow();
        assertThat(mov.getReferencia()).isEqualTo(venta.getNumeroPedido());
        assertThat(mov.getCantidad()).isEqualTo(4);
    }

    @Test
    void cancelarDosVecesNoRepone2Veces() throws Exception {
        Pedido venta = ventaDelPanel("PENDIENTE", new long[]{prod1.getId()}, new int[]{4});
        cancelar(venta.getId()).andExpect(status().isOk());
        cancelar(venta.getId()).andExpect(status().isOk());

        assertThat(recargar(prod1).getStockActual()).isEqualTo(10);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isEqualTo(1);
    }

    @Test
    void cancelacionesConcurrentesReponenUnaSolaVez() throws Exception {
        Pedido venta = ventaDelPanel("PENDIENTE", new long[]{prod1.getId(), prod2.getId()}, new int[]{4, 2});
        java.util.concurrent.ExecutorService pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        java.util.concurrent.CountDownLatch salida = new java.util.concurrent.CountDownLatch(1);
        try {
            List<java.util.concurrent.Future<Integer>> resultados = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                resultados.add(pool.submit(() -> {
                    salida.await();
                    return cancelar(venta.getId()).andReturn().getResponse().getStatus();
                }));
            }
            salida.countDown();
            for (java.util.concurrent.Future<Integer> r : resultados) {
                assertThat(r.get(60, java.util.concurrent.TimeUnit.SECONDS)).isEqualTo(200);
            }
        } finally {
            pool.shutdownNow();
        }
        assertThat(recargar(prod1).getStockActual()).isEqualTo(10);
        assertThat(recargar(prod2).getStockActual()).isEqualTo(10);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isEqualTo(1);
        assertThat(movimientos(prod2, MovimientoStock.CANCELACION_VENTA)).isEqualTo(1);
    }

    @Test
    void elJobDe72HorasReponeLaVentaManualSinCobroYNoRepiteSiYaSeCancelo() throws Exception {
        Pedido venta = ventaDelPanel("PENDIENTE", new long[]{prod1.getId()}, new int[]{4});
        assertThat(recargar(prod1).getStockActual()).isEqualTo(6);

        int canceladas = reservaTiendaVencida.ejecutar(LocalDateTime.now(Constants.ZONA_CR).plusHours(73));

        assertThat(canceladas).isEqualTo(1);
        assertThat(recargar(prod1).getStockActual()).isEqualTo(10);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isEqualTo(1);
        assertThat(pedidoRepository.findById(venta.getId()).orElseThrow().getEstadoPedido())
            .isEqualTo(Constants.PEDIDO_CANCELADO);
        // Ya cancelada: el job no la vuelve a tomar ni repone otra vez.
        assertThat(reservaTiendaVencida.ejecutar(LocalDateTime.now(Constants.ZONA_CR).plusHours(80))).isZero();
        assertThat(recargar(prod1).getStockActual()).isEqualTo(10);
    }

    @Test
    void ventaDeVariasLineasReponeCadaProducto() throws Exception {
        reservadoAjeno(prod2, 2);
        Pedido venta = ventaDelPanel("PENDIENTE", new long[]{prod1.getId(), prod2.getId()}, new int[]{2, 5});
        assertThat(recargar(prod1).getStockActual()).isEqualTo(8);
        assertThat(recargar(prod2).getStockActual()).isEqualTo(5);

        cancelar(venta.getId()).andExpect(status().isOk());

        assertThat(recargar(prod1).getStockActual()).isEqualTo(10);
        assertThat(recargar(prod2).getStockActual()).isEqualTo(10);
        assertThat(recargar(prod2).getStockReservado()).isEqualTo(2);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isEqualTo(1);
        assertThat(movimientos(prod2, MovimientoStock.CANCELACION_VENTA)).isEqualTo(1);
    }

    @Test
    void pedidoDeLaTiendaConReservaSigueLiberandoReservasSinReponer() throws Exception {
        reservadoAjeno(prod1, 5);
        Pedido pedido = pedidoSinMovimientos(prod1, 2);

        cancelar(pedido.getId()).andExpect(status().isOk());

        Producto despues = recargar(prod1);
        assertThat(despues.getStockActual()).isEqualTo(10);
        assertThat(despues.getStockReservado()).isEqualTo(3);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isZero();
    }

    @Test
    void pedidoConCobroMantieneElComportamientoAnterior() throws Exception {
        reservadoAjeno(prod1, 5);
        Pedido venta = ventaDelPanel("PENDIENTE", new long[]{prod1.getId()}, new int[]{2});
        Pago pago = new Pago();
        pago.setMerchantToken("tok-" + java.util.UUID.randomUUID());
        pago.setMonto(venta.getTotalPedido());
        pago.setProveedor(Constants.PROVEEDOR_SINPE);
        pago.setEstadoPago("PENDIENTE");
        pago.setPedido(venta);
        pago.setUsuario(venta.getUsuarioFinal());
        pago.setFechaCreacion(LocalDateTime.now());
        pagoRepository.saveAndFlush(pago);

        cancelar(venta.getId()).andExpect(status().isOk());

        Producto despues = recargar(prod1);
        assertThat(despues.getStockActual()).isEqualTo(8);
        assertThat(despues.getStockReservado()).isEqualTo(3);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isZero();
    }

    @Test
    void cancelacionRechazadaNoDejaEfectosParciales() throws Exception {
        Pedido venta = ventaDelPanel("COMPLETADO", new long[]{prod1.getId()}, new int[]{4});

        cancelar(venta.getId()).andExpect(status().isBadRequest());

        assertThat(recargar(prod1).getStockActual()).isEqualTo(6);
        assertThat(movimientos(prod1, MovimientoStock.CANCELACION_VENTA)).isZero();
        assertThat(pedidoRepository.findById(venta.getId()).orElseThrow().getEstadoPedido())
            .isEqualTo(Constants.PEDIDO_COMPLETADO);
    }

    private Pedido pedidoSinMovimientos(Producto producto, int cantidad) {
        Pedido p = new Pedido();
        p.setNumeroPedido("CSW-" + (System.nanoTime() % 1_000_000_000L));
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(testUser);
        p.setBodega(bod);
        p.setEmpresa(emp);
        p.setSubtotal(5000 * cantidad);
        p.setTotalPedido(5000 * cantidad);
        p.setCostoTotalProductos(2000 * cantidad);
        p.setUtilidadBruta(3000 * cantidad);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        PedidoItem item = new PedidoItem();
        item.setPedido(p);
        item.setProducto(producto);
        item.setCantidad(cantidad);
        item.setPrecioUnitarioMomento(5000);
        item.setCostoUnitarioMomento(2000);
        item.setDescuentoAplicado(0);
        item.setSubtotalItem(5000 * cantidad);
        item.setUtilidadItem(3000 * cantidad);
        item.setEstado(Constants.ESTADO_ACTIVO);
        List<PedidoItem> items = new ArrayList<>();
        items.add(item);
        p.setItems(items);
        return pedidoRepository.saveAndFlush(p);
    }
}
