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
import com.hotclick.service.payment.PagoExpiradoCancelador;
import com.hotclick.service.pedido.PedidoPagoManualService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P-02 (integración): confirmar el pago manual y cancelarlo por TTL al mismo tiempo, cada uno en su
 * transacción y su conexión. Con el FOR UPDATE + relectura gana exactamente uno: el pago queda
 * CAPTURADO (pedido PAGADO) o CANCELADO (pedido CANCELADO), nunca mezclado; el stock no baja de 0 y
 * nadie se queda esperando un lock (timeout = deadlock).
 *
 * <p>Corre en la suite con H2. Contra PostgreSQL real: el repo no usa Testcontainers (no hay Docker en
 * el box ni en CI para la suite); se corre con {@code DB_URL=jdbc:postgresql://…} igual que el resto de
 * BaseIntegrationTest (Flyway arma el esquema).
 */
@DisplayName("[P-02] Confirmar vs cancelar el mismo pago a la vez: estado consistente, sin deadlock")
class ConfirmarVsCancelarPagoConcurrenteTest extends BaseIntegrationTest {

    private static final long TIMEOUT_S = 20;

    @Autowired private PedidoPagoManualService pagoManual;
    @Autowired private PagoExpiradoCancelador cancelador;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;

    @AfterEach
    void limpiar() {
        jdbcTemplate.update("DELETE FROM hot_click_auditoria_admin_tb");
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @RepeatedTest(5)
    void confirmarYCancelarALaVez() throws Exception {
        Producto producto = armarProducto();
        Pedido pedido = armarPedido(producto);
        Long pedidoId = pedido.getId();
        Long pagoId = armarPago(pedido).getId();

        TransactionTemplate tx = new TransactionTemplate(txManager);
        CountDownLatch listos = new CountDownLatch(2);
        CountDownLatch largada = new CountDownLatch(1);

        Callable<Boolean> confirmar = () -> {
            listos.countDown();
            largada.await();
            try {
                tx.executeWithoutResult(s -> {
                    Pedido p = pedidoRepository.findById(pedidoId).orElseThrow();
                    pagoManual.confirmar(p, Constants.PEDIDO_PENDIENTE, "REF-P02");
                });
                return true;
            } catch (IllegalStateException e) {
                return false; // perdió: el pago ya estaba cancelado
            }
        };
        Callable<Boolean> cancelar = () -> {
            listos.countDown();
            largada.await();
            return cancelador.cancelar(pagoId);
        };

        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            Future<Boolean> fConfirmar = pool.submit(confirmar);
            Future<Boolean> fCancelar = pool.submit(cancelar);
            assertThat(listos.await(TIMEOUT_S, TimeUnit.SECONDS)).isTrue();
            largada.countDown();

            boolean confirmo = fConfirmar.get(TIMEOUT_S, TimeUnit.SECONDS); // TimeoutException = deadlock
            boolean cancelo = fCancelar.get(TIMEOUT_S, TimeUnit.SECONDS);

            assertThat(confirmo ^ cancelo).as("gana exactamente uno (confirmó=%s, canceló=%s)", confirmo, cancelo)
                .isTrue();

            Pago pago = pagoRepository.findById(pagoId).orElseThrow();
            Pedido final_ = pedidoRepository.findById(pedidoId).orElseThrow();
            Producto prod = productoRepository.findById(producto.getId()).orElseThrow();
            if (confirmo) {
                assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
                assertThat(final_.getEstadoPedido()).isNotEqualTo(Constants.PEDIDO_CANCELADO);
            } else {
                assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_CANCELADO);
                assertThat(final_.getEstadoPedido()).isEqualTo(Constants.PEDIDO_CANCELADO);
            }
            assertThat(prod.getStockActual()).as("stock actual").isGreaterThanOrEqualTo(0);
            assertThat(prod.getStockReservado()).as("stock reservado").isGreaterThanOrEqualTo(0);
        } finally {
            pool.shutdownNow();
        }
    }

    private Producto armarProducto() {
        String slug = "p02-conc-" + System.nanoTime();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("P02 Conc");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        Categoria categoria = new Categoria();
        categoria.setNombreCategoria("Cat-P02-" + System.nanoTime());
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Bodega P02");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);

        Producto p = new Producto();
        p.setNombreProducto("Producto P02");
        p.setSku("SKU-P02-" + System.nanoTime());
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(1);
        p.setStockReservado(1); // la única unidad está reservada por este pedido
        p.setStockMinimo(0);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        return productoRepository.saveAndFlush(p);
    }

    private Pedido armarPedido(Producto producto) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-P02-" + System.nanoTime() % 1_000_000);
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(40));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setOrigen("POS");
        p.setUsuarioFinal(testUser);
        p.setBodega(producto.getBodega());
        p.setEmpresa(producto.getEmpresa());
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago("EFECTIVO");
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
        return pedidoRepository.saveAndFlush(p);
    }

    private Pago armarPago(Pedido pedido) {
        Pago pago = new Pago();
        pago.setMerchantToken("MANUAL-P02-" + System.nanoTime());
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_MANUAL);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(pedido);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(40));
        return pagoRepository.saveAndFlush(pago);
    }
}
