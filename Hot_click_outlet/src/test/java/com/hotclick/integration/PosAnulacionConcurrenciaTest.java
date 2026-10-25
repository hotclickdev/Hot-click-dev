package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.pos.PosAnulacionService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

/**
 * Seguridad (NO APTO d66ab5cd, hallazgo 1): dos hilos anulan la misma venta a la vez contra la BD real (H2):
 * exactamente una gana, el stock se repone una vez y el turno se revierte una vez.
 */
@DisplayName("[A3] Anulación POS concurrente: una sola gana")
class PosAnulacionConcurrenciaTest extends BaseIntegrationTest {

    @MockitoBean CompanyScope companyScope;
    @MockitoBean PropietarioGuard propietarioGuard;

    @Autowired PosAnulacionService service;
    @Autowired EmpresaRepository empresaRepository;
    @Autowired PedidoRepository pedidoRepository;
    @Autowired BodegaRepository bodegaRepository;
    @Autowired ProductoRepository productoRepository;
    @Autowired CategoriaRepository categoriaRepository;
    @Autowired TurnoCajaRepository turnoCajaRepository;
    @Autowired PosVentaTurnoRepository ventaTurnoRepository;
    @Autowired PosAnulacionRepository anulacionRepository;
    @Autowired com.hotclick.service.TurnoCajaService turnoCajaService;
    @Autowired org.springframework.transaction.PlatformTransactionManager txManager;

    Empresa empresa;
    Producto producto;
    Pedido venta;
    TurnoCaja turno;

    @BeforeEach
    void datos() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Caja Concurrente SA");
        e.setNombreComercial("Caja Concurrente");
        e.setSlug("caja-concurrente");
        e.setCorreoEmpresa("caja-conc@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(e);

        Categoria c = new Categoria();
        c.setNombreCategoria("Cat-Conc");
        c.setEstado(Constants.ESTADO_ACTIVO);
        c.setAdminCliente(adminUser);
        c = categoriaRepository.saveAndFlush(c);

        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Conc");
        b.setDireccionExacta("Calle 1");
        b.setTelefono("22223333");
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);

        Producto p = new Producto();
        p.setNombreProducto("Taza");
        p.setDescripcionCorta("Cerámica");
        p.setSku("CONC-SKU-1");
        p.setPrecioVenta(1500);
        p.setPrecioCompra(500);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(c);
        p.setEmpresa(empresa);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        producto = productoRepository.saveAndFlush(p);

        TurnoCaja t = new TurnoCaja();
        t.setUsuario(adminUser);
        t.setEmpresa(empresa);
        t.setMontoInicial(0);
        t.setTotalEfectivo(3000);
        t.setTotalSinpe(0);
        t.setTotalTarjeta(0);
        t.setTotalTransferencia(0);
        t.setNumTransacciones(1);
        t.setFechaApertura(LocalDateTime.now());
        t.setEstado("ABIERTO");
        turno = turnoCajaRepository.saveAndFlush(t);

        Pedido v = new Pedido();
        v.setNumeroPedido("POS-CONC-1");
        v.setFechaPedido(LocalDateTime.now());
        v.setEstadoPedido("ENTREGADO");
        v.setOrigen(OrigenPedido.POS.codigo());
        v.setBodega(b);
        v.setUsuarioFinal(testUser);
        v.setEmpresa(empresa);
        v.setSubtotal(3000);
        v.setTotalPedido(3000);
        v.setCostoTotalProductos(1000);
        v.setUtilidadBruta(2000);
        v.setMetodoPago("EFECTIVO");
        v.setMetodoEnvio(Constants.ENVIO_RETIRO);
        v.setCostoEnvio(0);
        v.setDescuentoTotal(0);
        v.setMontoImpuesto(0);
        v.setAplicaImpuesto(false);
        v.setEstado(Constants.ESTADO_ACTIVO);
        v.setItems(new ArrayList<>());
        PedidoItem item = new PedidoItem();
        item.setPedido(v);
        item.setProducto(producto);
        item.setCantidad(2);
        item.setPrecioUnitarioMomento(1500);
        item.setCostoUnitarioMomento(500);
        item.setSubtotalItem(3000);
        item.setUtilidadItem(2000);
        item.setDescuentoAplicado(0);
        item.setEstado(Constants.ESTADO_ACTIVO);
        v.getItems().add(item);
        venta = pedidoRepository.saveAndFlush(v);
        ventaTurnoRepository.saveAndFlush(new PosVentaTurno(venta.getId(), turno.getId()));

        when(companyScope.getCurrentUser()).thenReturn(adminUser);
        when(companyScope.getCurrentUserId()).thenReturn(adminUser.getId());
        // Ensancha la ventana de carrera: cada hilo se demora DESPUÉS de leer el estado de la venta y ANTES de
        // aplicar efectos. Sin bloqueo, ambos ven ENTREGADO y ambos reponen stock / revierten el turno.
        when(companyScope.isAdminIT()).thenAnswer(i -> { Thread.sleep(400); return true; });
        when(propietarioGuard.esPropietario(any(), anyLong())).thenReturn(false);
    }

    @AfterEach
    void limpiar() {
        jdbcTemplate.update("DELETE FROM hot_click_pos_anulacion_tb");
        jdbcTemplate.update("DELETE FROM hot_click_pos_venta_turno_tb");
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        pedidoRepository.deleteAll();
        turnoCajaRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Dos hilos anulan la misma venta: 1 éxito, stock +2 una vez, turno revertido una vez, 1 fila de bitácora")
    void dobleAnulacion_unaSolaGana() throws Exception {
        int hilos = 2;
        CyclicBarrier salida = new CyclicBarrier(hilos);
        ExecutorService pool = Executors.newFixedThreadPool(hilos);
        List<Future<Object>> res = new ArrayList<>();
        for (int i = 0; i < hilos; i++) {
            res.add(pool.submit(() -> {
                salida.await(5, TimeUnit.SECONDS);
                try {
                    return service.anular(venta.getId(), empresa.getId(), "doble clic");
                } catch (RuntimeException e) {
                    return e;
                }
            }));
        }
        pool.shutdown();
        assertThat(pool.awaitTermination(30, TimeUnit.SECONDS)).isTrue();
        List<Object> r = new ArrayList<>();
        for (Future<Object> f : res) r.add(f.get());

        assertThat(r.stream().filter(o -> o instanceof PosAnulacion).count()).as("éxitos %s", r).isEqualTo(1);
        // El perdedor ESPERÓ el bloqueo y vio la venta ya anulada (rechazo de negocio), no un choque de BD.
        assertThat(r).as("resultados %s", r).anySatisfy(o -> assertThat(o)
            .isInstanceOf(IllegalStateException.class)
            .hasFieldOrPropertyWithValue("message", PosAnulacionService.MSG_YA_ANULADA));
        assertThat(anulacionRepository.findAll()).hasSize(1);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isEqualTo(7);
        TurnoCaja t = turnoCajaRepository.findById(turno.getId()).orElseThrow();
        assertThat(t.getTotalEfectivo()).isZero();
        assertThat(t.getNumTransacciones()).isZero();
        assertThat(pedidoRepository.findById(venta.getId()).orElseThrow().getEstadoPedido()).isEqualTo("ANULADO");
    }

    @Test
    @DisplayName("Venta cobrada mientras se anula otra en el mismo turno: total = inicial + venta − anulada, una vez")
    void ventaYAnulacionConcurrentes_totalesCorrectos() throws Exception {
        var tx = new org.springframework.transaction.support.TransactionTemplate(txManager);
        CountDownLatch ventaLeyoTurno = new CountDownLatch(1);
        CountDownLatch anulacionTermino = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(2);
        // Hilo venta: igual que crearVenta, lee el turno activo (queda en su contexto) y luego suma la venta.
        Future<?> venta = pool.submit(() -> tx.executeWithoutResult(s -> {
            turnoCajaService.getTurnoActivo(adminUser.getId()).orElseThrow();
            ventaLeyoTurno.countDown();
            try {
                assertThat(anulacionTermino.await(20, TimeUnit.SECONDS)).isTrue();
            } catch (InterruptedException e) {
                throw new IllegalStateException(e);
            }
            turnoCajaService.actualizarTotales(turno.getId(), "EFECTIVO", 1000);
        }));
        Future<Object> anulacion = pool.submit(() -> {
            assertThat(ventaLeyoTurno.await(20, TimeUnit.SECONDS)).isTrue();
            try {
                return service.anular(venta().getId(), empresa.getId(), "error de cobro");
            } finally {
                anulacionTermino.countDown();
            }
        });
        assertThat(anulacion.get(30, TimeUnit.SECONDS)).isInstanceOf(PosAnulacion.class);
        venta.get(30, TimeUnit.SECONDS);
        pool.shutdown();

        TurnoCaja t = turnoCajaRepository.findById(turno.getId()).orElseThrow();
        assertThat(t.getTotalEfectivo()).as("3000 inicial + 1000 venta − 3000 anulada").isEqualTo(1000);
        assertThat(t.getNumTransacciones()).as("1 inicial + 1 venta − 1 anulada").isEqualTo(1);
        assertThat(anulacionRepository.findAll()).hasSize(1);
        assertThat(productoRepository.findById(producto.getId()).orElseThrow().getStockActual()).isEqualTo(7);
    }

    private Pedido venta() { return venta; }
}
