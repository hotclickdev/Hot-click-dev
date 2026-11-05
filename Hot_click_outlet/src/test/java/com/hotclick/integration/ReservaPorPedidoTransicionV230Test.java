package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.OrigenPedido;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.PedidoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ALTO-01 transición: pedidos vivos creados ANTES de V229/V230 (sin marca). Se ejecuta el SQL real de V229 y V230
 * sobre la base de la suite; después, cancelar por PedidoService libera solo lo de checkout/tienda y nada de manuales.
 */
@DisplayName("[ALTO-01] V229+V230: backfill por camino; cancelar checkout/tienda libera, manual no")
class ReservaPorPedidoTransicionV230Test extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PedidoService pedidoService;
    @Autowired private JdbcTemplate jdbc;

    private Empresa empresa;
    private Bodega bodega;
    private Producto producto;

    @BeforeEach
    void armar() {
        String slug = "alto01-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("ALTO01");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);
        Categoria categoria = new Categoria();
        categoria.setNombreCategoria("Cat-" + slug);
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega " + slug);
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
        producto = new Producto();
        producto.setNombreProducto("Producto " + slug);
        producto.setSku("SKU-" + slug);
        producto.setPrecioVenta(10000);
        producto.setPrecioCompra(7000);
        producto.setStockActual(20);
        producto.setStockReservado(6); // 2 checkout + 1 SINPE + 3 tienda; los manuales no reservaron
        producto.setStockMinimo(1);
        producto.setEstado(Constants.ESTADO_ACTIVO);
        producto.setVisibleCatalogo(true);
        producto.setCategoria(categoria);
        producto.setEmpresa(empresa);
        producto.setBodega(bodega);
        producto.setAdminCliente(adminUser);
        producto.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        producto = productoRepository.saveAndFlush(producto);
    }

    @AfterEach
    void limpiar() {
        jdbc.update("DELETE FROM hot_click_movimiento_stock_tb");
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    private Pedido pedido(String estado, String origen, String envio, String grupo, String cliente, int cant) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-A01-" + System.nanoTime() % 10_000_000);
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR).minusHours(1));
        p.setEstadoPedido(estado);
        p.setOrigen(origen);
        p.setGrupoPago(grupo);
        p.setClienteNombre(cliente);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000 * cant);
        p.setTotalPedido(10000 * cant);
        p.setCostoTotalProductos(7000 * cant);
        p.setUtilidadBruta(3000 * cant);
        p.setMetodoPago("SINPE_MOVIL");
        p.setMetodoEnvio(envio);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        PedidoItem item = new PedidoItem();
        item.setPedido(p);
        item.setProducto(producto);
        item.setCantidad(cant);
        item.setPrecioUnitarioMomento(10000);
        item.setCostoUnitarioMomento(7000);
        item.setSubtotalItem(10000 * cant);
        item.setUtilidadItem(3000 * cant);
        item.setDescuentoAplicado(0);
        item.setEstado(Constants.ESTADO_ACTIVO);
        p.getItems().add(item);
        return pedidoRepository.saveAndFlush(p);
    }

    private void ejecutarMigracion(String archivo) throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/" + archivo)).lines()
            .filter(l -> !l.trim().startsWith("--")).collect(Collectors.joining("\n"));
        for (String sentencia : sql.split(";")) {
            if (!sentencia.isBlank()) jdbc.execute(sentencia);
        }
    }

    private boolean marcado(Pedido p) {
        return jdbc.queryForObject("SELECT stock_reservado_en FROM hot_click_pedido_tb WHERE id_pedido = ?",
            LocalDateTime.class, p.getId()) != null;
    }

    private int reservado() {
        return productoRepository.findById(producto.getId()).orElseThrow().getStockReservado();
    }

    @Test
    void backfillPorCaminoYCancelacion() throws Exception {
        String online = OrigenPedido.ONLINE.codigo();
        Pedido checkout = pedido(Constants.PEDIDO_PENDIENTE, online, Constants.ENVIO_RETIRO, "GP-a01chk", null, 2);
        Pedido sinpe = pedido(Constants.PEDIDO_PENDIENTE_COMPROBANTE, online, Constants.ENVIO_DOMICILIO, "GP-a01snp", null, 1);
        Pedido tienda = pedido(Constants.PEDIDO_PENDIENTE, online, "DOMICILIO", null, "Cliente Prueba", 3);
        Pedido manual = pedido(Constants.PEDIDO_PENDIENTE, OrigenPedido.MANUAL.codigo(), Constants.ENVIO_RETIRO, null, null, 1);
        // /pedidos/manual antes de 3060b2a11: origen quedaba en el default ONLINE.
        Pedido manualLegado = pedido(Constants.PEDIDO_PENDIENTE_APROBACION, online, Constants.ENVIO_RETIRO, null, null, 1);
        Pedido checkoutPagado = pedido(Constants.PEDIDO_PAGADO, online, Constants.ENVIO_RETIRO, "GP-a01pag", null, 1);
        // Estado previo a la migración: nadie tiene marca.
        jdbc.update("UPDATE hot_click_pedido_tb SET stock_reservado_en = NULL WHERE fk_id_empresa = ?", empresa.getId());

        ejecutarMigracion("V229__pedido_stock_reservado_en.sql");
        assertThat(marcado(manualLegado)).as("V229 sola marcaba el manual legado ONLINE").isTrue();
        ejecutarMigracion("V230__pedido_stock_reservado_backfill_por_camino.sql");

        assertThat(marcado(checkout)).isTrue();
        assertThat(marcado(sinpe)).isTrue();
        assertThat(marcado(tienda)).isTrue();
        assertThat(marcado(manual)).isFalse();
        assertThat(marcado(manualLegado)).isFalse();
        assertThat(marcado(checkoutPagado)).isFalse();

        // Cancelar manuales (dos veces cada uno): la reserva de los demás queda intacta.
        for (int i = 0; i < 2; i++) {
            pedidoService.cambiarEstado(manual.getId(), Constants.PEDIDO_CANCELADO, null);
            pedidoService.cambiarEstado(manualLegado.getId(), Constants.PEDIDO_CANCELADO, null);
            assertThat(reservado()).isEqualTo(6);
        }
        pedidoService.cambiarEstado(checkout.getId(), Constants.PEDIDO_CANCELADO, null);
        assertThat(reservado()).isEqualTo(4);
        pedidoService.cambiarEstado(checkout.getId(), Constants.PEDIDO_CANCELADO, null);
        assertThat(reservado()).isEqualTo(4);
        pedidoService.cambiarEstado(sinpe.getId(), Constants.PEDIDO_CANCELADO, null);
        assertThat(reservado()).isEqualTo(3);
        pedidoService.cambiarEstado(tienda.getId(), Constants.PEDIDO_CANCELADO, null);
        assertThat(reservado()).isZero();
        assertThat(marcado(checkout)).isFalse();
        assertThat(marcado(tienda)).isFalse();

        // Re-ejecutar V230 es idempotente: los cancelados no vuelven a marcarse.
        ejecutarMigracion("V230__pedido_stock_reservado_backfill_por_camino.sql");
        assertThat(marcado(checkout)).isFalse();
        assertThat(marcado(manual)).isFalse();
    }
}
