package com.hotclick.integration;

import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.StockService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.*;

/**
 * [CONCURRENCIA] Stock Race Condition — Prevención de Doble Gasto.
 *
 * Verifica que findByIdForUpdate (PESSIMISTIC_WRITE / SELECT FOR UPDATE)
 * serializa correctamente el acceso concurrente al stock.
 * H2 con MODE=PostgreSQL honra SELECT FOR UPDATE: los tests son un proxy
 * válido del comportamiento de PostgreSQL en producción.
 *
 * Escenarios cubiertos:
 *   RACE-01  20 hilos vs stock=1   → exactamente 1 gana
 *   RACE-02  10 hilos vs stock=10  → todos ganan (stock justo)
 *   RACE-03  20 hilos vs stock=10  → exactamente 10 ganan, stock ≥ 0 siempre
 */
@DisplayName("[CONCURRENCIA] Stock Race Condition — Prevención de Doble Gasto")
class StockRaceConditionTest extends BaseIntegrationTest {

    @Autowired private StockService             stockService;
    @Autowired private ProductoRepository       productoRepository;
    @Autowired private EmpresaRepository        empresaRepository;
    @Autowired private CategoriaRepository      categoriaRepository;
    @Autowired private BodegaRepository         bodegaRepository;
    @Autowired private PlatformTransactionManager txManager;

    private TransactionTemplate transactionTemplate;
    private Empresa   empresa;
    private Bodega    bodega;
    private Categoria categoria;

    @BeforeEach
    void setUp() {
        transactionTemplate = new TransactionTemplate(txManager);

        empresa = new Empresa();
        empresa.setNombreEmpresa("Stock Race Inc");
        empresa.setSlug("stock-race-" + System.nanoTime());
        empresa.setCorreoEmpresa("race" + System.nanoTime() + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);

        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-Race");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Race");
        bodega.setDireccionExacta("Calle Test Race");
        bodega.setTelefono("88880000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_movimiento_stock_tb");
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── RACE-01: 20 hilos vs stock=1 → exactamente 1 gana ───────────────────

    @Test
    @DisplayName("RACE-01 | CRÍTICO — 20 hilos compiten por stock=1 → exactamente 1 gana (SELECT FOR UPDATE)")
    void veinteHilos_stock1_soloUnoGana() throws InterruptedException {
        Producto producto = crearProducto("Item Único", "SKU-RACE-01", 1);
        Long productoId = producto.getId();
        int N = 20;

        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch done     = new CountDownLatch(N);
        AtomicInteger exitos    = new AtomicInteger(0);
        AtomicInteger fallos    = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(N);
        for (int i = 0; i < N; i++) {
            final int threadId = i;
            pool.submit(() -> {
                try {
                    startGun.await();
                    transactionTemplate.execute(status -> {
                        Producto locked = productoRepository.findByIdForUpdate(productoId).orElseThrow();
                        stockService.reservar(locked, 1, "race-test", "thread-" + threadId + "@test.cr");
                        return null;
                    });
                    exitos.incrementAndGet();
                } catch (StockInsuficienteException e) {
                    fallos.incrementAndGet();
                } catch (Exception e) {
                    fallos.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        startGun.countDown();
        boolean completado = done.await(15, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(completado).as("Todos los hilos deben completar en 15 s").isTrue();
        assertThat(exitos.get())
            .as("Exactamente 1 hilo debe ganar la reserva — PESSIMISTIC_WRITE serializa el acceso")
            .isEqualTo(1);
        assertThat(fallos.get())
            .as("Los 19 hilos perdedores deben recibir StockInsuficienteException")
            .isEqualTo(N - 1);

        // Verificar estado final en BD: stock disponible = 0, reservado = 1
        Producto final_ = productoRepository.findById(productoId).orElseThrow();
        assertThat(final_.getStockReservado()).as("Stock reservado debe ser 1").isEqualTo(1);
        assertThat(final_.getStockDisponible()).as("Stock disponible debe ser 0").isEqualTo(0);
    }

    // ── RACE-02: 10 hilos vs stock=10 → todos ganan (happy path) ────────────

    @Test
    @DisplayName("RACE-02 | HIGH — 10 hilos vs stock=10 (exacto) → todos ganan, stock final=0")
    void diezHilos_stock10_todosGanan() throws InterruptedException {
        Producto producto = crearProducto("Lote Exacto", "SKU-RACE-02", 10);
        Long productoId = producto.getId();
        int N = 10;

        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch done     = new CountDownLatch(N);
        AtomicInteger exitos    = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(N);
        for (int i = 0; i < N; i++) {
            final int threadId = i;
            pool.submit(() -> {
                try {
                    startGun.await();
                    transactionTemplate.execute(status -> {
                        Producto locked = productoRepository.findByIdForUpdate(productoId).orElseThrow();
                        stockService.reservar(locked, 1, "race-happy", "thread-" + threadId + "@test.cr");
                        return null;
                    });
                    exitos.incrementAndGet();
                } catch (Exception ignored) {
                } finally {
                    done.countDown();
                }
            });
        }

        startGun.countDown();
        done.await(15, TimeUnit.SECONDS);
        pool.shutdownNow();

        assertThat(exitos.get())
            .as("Todos los 10 hilos deben obtener su slot cuando el stock es exactamente 10")
            .isEqualTo(N);

        Producto final_ = productoRepository.findById(productoId).orElseThrow();
        assertThat(final_.getStockDisponible())
            .as("Stock disponible debe ser 0 cuando todos los slots se reservaron")
            .isEqualTo(0);
    }

    // ── RACE-03: 20 hilos vs stock=10 → exactamente 10 ganan, nunca negativo ─

    @Test
    @DisplayName("RACE-03 | HIGH — 20 hilos vs stock=10 → exactamente 10 ganan, stock ≥ 0 siempre")
    void veinteHilos_stock10_soloOchoCincoGanan() throws InterruptedException {
        Producto producto = crearProducto("Lote Parcial", "SKU-RACE-03", 10);
        Long productoId = producto.getId();
        int N = 20;

        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch done     = new CountDownLatch(N);
        AtomicInteger exitos    = new AtomicInteger(0);
        AtomicInteger fallos    = new AtomicInteger(0);

        ExecutorService pool = Executors.newFixedThreadPool(N);
        for (int i = 0; i < N; i++) {
            final int threadId = i;
            pool.submit(() -> {
                try {
                    startGun.await();
                    transactionTemplate.execute(status -> {
                        Producto locked = productoRepository.findByIdForUpdate(productoId).orElseThrow();
                        stockService.reservar(locked, 1, "race-partial", "thread-" + threadId + "@test.cr");
                        return null;
                    });
                    exitos.incrementAndGet();
                } catch (StockInsuficienteException e) {
                    fallos.incrementAndGet();
                } catch (Exception e) {
                    fallos.incrementAndGet();
                } finally {
                    done.countDown();
                }
            });
        }

        startGun.countDown();
        done.await(15, TimeUnit.SECONDS);
        pool.shutdownNow();

        // Exactamente 10 de 20 deben ganar
        assertThat(exitos.get()).as("Exactamente 10 hilos deben ganar").isEqualTo(10);
        assertThat(fallos.get()).as("Los 10 hilos restantes deben fallar").isEqualTo(10);

        // El stock nunca puede quedar negativo — garantía de correctitud del bloqueo
        Producto final_ = productoRepository.findById(productoId).orElseThrow();
        assertThat(final_.getStockDisponible())
            .as("CRÍTICO: stock disponible nunca puede ser negativo — indicaría doble gasto")
            .isGreaterThanOrEqualTo(0);
        assertThat(final_.getStockReservado())
            .as("Stock reservado debe coincidir con número de éxitos")
            .isEqualTo(exitos.get());
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Producto crearProducto(String nombre, String sku, int stock) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku + "-" + System.nanoTime());
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(stock);
        p.setStockReservado(0);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
