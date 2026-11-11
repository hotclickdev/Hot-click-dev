package com.hotclick.integration;

import com.hotclick.exception.CancelacionPagoNoCerradaException;
import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.payment.OnvoCapturaService;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.PedidoService;
import com.hotclick.service.TelegramFlujoService;
import com.hotclick.service.payment.CancelacionPendienteOnvoException;
import com.hotclick.service.payment.OnvoPendientesReconsultaService;
import com.hotclick.service.payment.OnvoRechazoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * fix2 sobre PostgreSQL REAL (servicio efímero del job de CI; nunca QA, prod ni un 5432 desconocido).
 * Contexto Spring completo contra un esquema propio ({@value #SCHEMA}) recreado al arrancar; Hibernate crea las tablas
 * (la cadena Flyway completa la cubre PagoConciliacionFlywayPostgresTest con un V236 sintético).
 *
 * Los locks NO se simulan: se miden con una conexión JDBC aparte (FOR UPDATE NOWAIT → SQLState 55P03) y con
 * pg_stat_activity. La red de ONVO sí es un doble (OnvoService), porque está prohibido llamar a ONVO desde tests.
 * Sin HC_PG_TEST_URL JUnit la omite; el gate scripts/ci/fix2-pg-surefire.py falla si queda skipped o faltan casos.
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("fix2 PG | locks, intención antes de red, captura vs liberación, SKIP LOCKED, backoff y fairness")
class PagoOnvoCancelacionLocksPostgresTest extends BaseIntegrationTest {

    static final String SCHEMA = "hc_fix2_locks";
    private static final String SESION = "cs_fix2pg_sesion01";
    private static final String INTENT = "pi_fix2pg_intent01";
    private static final int HISTORICOS = 5000;

    private static String urlBase;
    private static String usuario;
    private static String clave;

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry r) {
        separar(System.getenv("HC_PG_TEST_URL"));
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(urlBase, usuario, clave));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        r.add("spring.datasource.url", PagoOnvoCancelacionLocksPostgresTest::urlEsquema);
        r.add("spring.datasource.username", () -> usuario);
        r.add("spring.datasource.password", () -> clave);
        r.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        r.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        r.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        r.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        r.add("spring.jpa.hibernate.ddl-auto", () -> "create");
        r.add("spring.flyway.enabled", () -> "false");
        r.add("spring.datasource.hikari.maximum-pool-size", () -> "12");
    }

    /** Separa user/password de la URL (no se imprimen) para no pasarlos dos veces al driver. */
    private static void separar(String url) {
        int q = url.indexOf('?');
        StringBuilder resto = new StringBuilder();
        if (q >= 0) {
            for (String par : url.substring(q + 1).split("&")) {
                String[] kv = par.split("=", 2);
                String v = kv.length > 1 ? URLDecoder.decode(kv[1], StandardCharsets.UTF_8) : "";
                if ("user".equals(kv[0])) usuario = v;
                else if ("password".equals(kv[0])) clave = v;
                else resto.append(resto.length() == 0 ? "" : "&").append(par);
            }
        }
        urlBase = (q >= 0 ? url.substring(0, q) : url) + (resto.length() > 0 ? "?" + resto : "");
    }

    private static String urlEsquema() {
        return urlBase + (urlBase.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA;
    }

    private static Connection conexionAparte() throws SQLException {
        Connection c = DriverManager.getConnection(urlEsquema(), usuario, clave);
        c.setAutoCommit(false);
        return c;
    }

    @MockitoBean private OnvoService onvoService;

    @Autowired private PaymentService paymentService;
    @Autowired private PedidoService pedidoService;
    @Autowired private TelegramFlujoService telegramFlujoService;
    @Autowired private OnvoCapturaService onvoCapturaService;
    @Autowired private OnvoRechazoService onvoRechazoService;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Value("${hotclick.billing.lock-timeout-ms}") private int lockTimeoutMs;

    private Empresa empresa;
    private Bodega bodega;
    private Categoria categoria;
    private final ExecutorService hilos = Executors.newFixedThreadPool(4);

    @BeforeEach
    void armar() {
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("test");
        String slug = "fix2pg-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("Fix2 PG");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Fix2 PG");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setProvincia("San José");
        bodega.setCanton("Escazú");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-Fix2PG-" + System.nanoTime());
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
    }

    @AfterEach
    void limpiar() {
        hilos.shutdownNow();
        jdbcTemplate.execute("TRUNCATE hot_click_webhook_event_tb, hot_click_pago_tb, hot_click_pedido_item_tb, "
            + "hot_click_pedido_tb, hot_click_producto_tb, hot_click_categoria_tb, hot_click_bodega_tb, "
            + "hot_click_empresa_tb CASCADE");
    }

    // ── Fixtures ───────────────────────────────────────────────────────────────

    private Producto producto() {
        Producto p = new Producto();
        p.setNombreProducto("Producto Fix2 PG");
        p.setSku("SKU-F2PG-" + System.nanoTime());
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(1);
        p.setStockReservado(1);
        p.setStockMinimo(0);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setEsPersonalizado(false);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    /** Pedido PENDIENTE de 1 unidad reservada (stock 1, reservado 1) con pago ONVO PENDIENTE. */
    private Pedido pedidoConPago(Producto producto, String sesion) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-F2PG-" + (System.nanoTime() % 10_000_000));
        p.setStockReservadoEn(LocalDateTime.now());
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setOrigen("WEB");
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
        List<PedidoItem> items = new ArrayList<>();
        if (producto != null) {
            PedidoItem item = new PedidoItem();
            item.setCantidad(1);
            item.setPrecioUnitarioMomento(10000);
            item.setCostoUnitarioMomento(7000);
            item.setSubtotalItem(10000);
            item.setUtilidadItem(3000);
            item.setProducto(producto);
            item.setPedido(p);
            items.add(item);
        }
        p.setItems(items);
        p = pedidoRepository.saveAndFlush(p);
        pagoRepository.saveAndFlush(pago(p, sesion, Constants.PAGO_PENDIENTE, LocalDateTime.now(Constants.ZONA_CR)));
        return p;
    }

    private Pago pago(Pedido pedido, String sesion, String estado, LocalDateTime creado) {
        Pago pago = new Pago();
        pago.setMerchantToken(sesion);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(estado);
        pago.setPedido(pedido);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(creado);
        return pago;
    }

    /** ONVO (doble): sesión expirada sin cobro en el GET y el intent con el estado dado. */
    private void onvoGet(String estadoIntent, Long pedidoId) {
        doReturn(Map.of("id", SESION, "paymentStatus", "unpaid", "status", "expired", "paymentIntentId", INTENT,
            "mode", "test")).when(onvoService).obtenerCheckoutSession(SESION);
        Map<String, Object> intent = new HashMap<>(Map.of("id", INTENT, "status", estadoIntent, "amount", 1_000_000,
            "currency", "CRC", "mode", "test", "metadata", Map.of("pedidoId", String.valueOf(pedidoId))));
        if ("succeeded".equals(estadoIntent)) intent.put("receivedAmount", 1_000_000);
        doReturn(intent).when(onvoService).obtenerPaymentIntent(INTENT);
    }

    private static OnvoService.ResultadoExpirar expirada() {
        return new OnvoService.ResultadoExpirar(OnvoService.TipoExpirar.RESPUESTA,
            Map.of("id", SESION, "status", "expired", "paymentStatus", "unpaid"));
    }

    private Pago pagoDe(Long pedidoId) { return pagoRepository.findTopByPedidoId(pedidoId).orElseThrow(); }

    private String estadoPedido(Long id) { return pedidoRepository.findById(id).orElseThrow().getEstadoPedido(); }

    private Producto productoEnBase(Long id) { return productoRepository.findById(id).orElseThrow(); }

    /** true si otra conexión puede bloquear la fila YA (FOR UPDATE NOWAIT); false si alguien la tiene (55P03). */
    private static boolean bloqueableYa(String tabla, String pk, long id) throws SQLException {
        try (Connection c = conexionAparte(); Statement st = c.createStatement()) {
            try {
                st.executeQuery("SELECT 1 FROM " + tabla + " WHERE " + pk + " = " + id + " FOR UPDATE NOWAIT").close();
                return true;
            } catch (SQLException e) {
                if ("55P03".equals(e.getSQLState())) return false;
                throw e;
            } finally {
                c.rollback();
            }
        }
    }

    private static int esperandoLock(Connection excluida) throws SQLException {
        int pid;
        try (Statement st = excluida.createStatement(); ResultSet rs = st.executeQuery("SELECT pg_backend_pid()")) {
            rs.next();
            pid = rs.getInt(1);
        }
        try (Connection c = DriverManager.getConnection(urlEsquema(), usuario, clave);
             Statement st = c.createStatement();
             ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() "
                 + "AND wait_event_type = 'Lock' AND pid <> " + pid)) {
            rs.next();
            return rs.getInt(1);
        }
    }

    private static Throwable causa(Future<?> f) throws Exception {
        try {
            f.get(60, TimeUnit.SECONDS);
            return null;
        } catch (ExecutionException e) {
            return e.getCause();
        }
    }

    private OnvoPendientesReconsultaService respaldo(OnvoPaymentProvider provider) {
        return new OnvoPendientesReconsultaService(pagoRepository, onvoService, provider, onvoRechazoService, txManager,
            10, 5, 200, true);
    }

    // ── Casos ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("motorPostgresYEsquemaAislado")
    void motorPostgresYEsquemaAislado() {
        String motor = jdbcTemplate.execute((Connection c) -> c.getMetaData().getDatabaseProductName());
        assertThat(motor).isEqualTo("PostgreSQL");
        assertThat(jdbcTemplate.queryForObject("SELECT current_schema()", String.class)).isEqualTo(SCHEMA);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = ? "
            + "AND table_name = 'hot_click_pago_tb' AND column_name IN ('cancelacion_solicitada_en', "
            + "'conciliacion_proxima_en', 'conciliacion_sin_referencia_en')", Integer.class, SCHEMA)).isEqualTo(3);
    }

    @Test
    @DisplayName("compradorIntencionAntesDeRedFallidaYCapturaReal")
    void compradorIntencionAntesDeRedFallidaYCapturaReal() throws Exception {
        Producto prod = producto();
        Pedido pedido = pedidoConPago(prod, SESION);
        Long pagoId = pagoDe(pedido.getId()).getId();
        CountDownLatch enRed = new CountDownLatch(1);
        CountDownLatch seguir = new CountDownLatch(1);
        when(onvoService.expirarCheckoutSessionTipado(SESION)).thenAnswer(inv -> {
            enRed.countDown();
            seguir.await(30, TimeUnit.SECONDS);
            throw new IllegalStateException("timeout de red simulado");
        });

        Future<?> comprador = hilos.submit(() -> paymentService.cancelarPorUsuario(pedido.getNumeroPedido(), testUser.getCorreo()));
        assertThat(enRed.await(20, TimeUnit.SECONDS)).isTrue();
        // Durante la red: intención YA confirmada (visible desde otra conexión) y ninguna fila bloqueada.
        assertThat(jdbcTemplate.queryForObject("SELECT cancelacion_solicitada_origen FROM hot_click_pago_tb WHERE id_pago = ?",
            String.class, pagoId)).isEqualTo("USUARIO");
        assertThat(bloqueableYa("hot_click_pago_tb", "id_pago", pagoId)).isTrue();
        assertThat(bloqueableYa("hot_click_pedido_tb", "id_pedido", pedido.getId())).isTrue();
        seguir.countDown();

        assertThat(causa(comprador)).isInstanceOf(CancelacionPendienteOnvoException.class);
        assertThat(pagoDe(pedido.getId()).getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(pagoRepository.cancelacionSolicitadaEnBase(pagoId)).isPresent();
        assertThat(estadoPedido(pedido.getId())).isEqualTo(Constants.PEDIDO_PENDIENTE);

        // Captura REAL posterior (webhook): respeta la intención → cancela, libera una vez y queda reembolso.
        assertThat(onvoCapturaService.capturarVerificado(SESION, "succeeded", "webhook"))
            .isEqualTo(OnvoCapturaService.Captura.COBRADO_SOBRE_CANCELADO);
        assertThat(onvoCapturaService.capturarVerificado(SESION, "succeeded", "webhook"))
            .isEqualTo(OnvoCapturaService.Captura.DUPLICADO);
        assertThat(pagoDe(pedido.getId()).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(pedido.getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(productoEnBase(prod.getId()).getStockReservado()).isZero();
        assertThat(productoEnBase(prod.getId()).getStockActual()).isEqualTo(1);
    }

    @Test
    @DisplayName("compradorTimeoutDeIntencionSinRed")
    void compradorTimeoutDeIntencionSinRed() throws Exception {
        Pedido pedido = pedidoConPago(null, SESION);
        Long pagoId = pagoDe(pedido.getId()).getId();
        try (Connection a = conexionAparte(); Statement st = a.createStatement()) {
            st.executeQuery("SELECT 1 FROM hot_click_pago_tb WHERE id_pago = " + pagoId + " FOR UPDATE").close();
            long t0 = System.nanoTime();
            Throwable error = org.assertj.core.api.Assertions.catchThrowable(() ->
                paymentService.cancelarPorUsuario(pedido.getNumeroPedido(), testUser.getCorreo()));
            long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0);
            a.rollback();
            assertThat(error).isInstanceOf(IllegalStateException.class).hasMessageContaining("No pudimos registrar la cancelación");
            assertThat(ms).isBetween(lockTimeoutMs - 500L, lockTimeoutMs + 6000L);
        }
        verify(onvoService, never()).expirarCheckoutSessionTipado(anyString());
        verify(onvoService, never()).obtenerCheckoutSession(anyString());
        assertThat(pagoRepository.cancelacionSolicitadaEnBase(pagoId)).isEmpty();
        assertThat(pagoDe(pedido.getId()).getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("compradorRollbackConservaIntencionYCapturaSinLocks")
    void compradorRollbackConservaIntencionYCapturaSinLocks() throws Exception {
        Producto prod = producto();
        Pedido pedido = pedidoConPago(prod, SESION);
        Long pagoId = pagoDe(pedido.getId()).getId();
        CountDownLatch enRed = new CountDownLatch(1);
        CountDownLatch seguir = new CountDownLatch(1);
        when(onvoService.expirarCheckoutSessionTipado(SESION)).thenAnswer(inv -> {
            enRed.countDown();
            seguir.await(30, TimeUnit.SECONDS);
            return expirada();
        });
        // El GET (sin locks) llega viejo: ve el intent sin cobro; con la fila bloqueada se revalida y gana la captura.
        onvoGet("canceled", pedido.getId());

        Future<?> comprador = hilos.submit(() -> paymentService.cancelarPorUsuario(pedido.getNumeroPedido(), testUser.getCorreo()));
        assertThat(enRed.await(20, TimeUnit.SECONDS)).isTrue();
        // La captura REAL corre mientras el comprador está en la red: no espera ningún lock suyo.
        assertThat(hilos.submit(() -> onvoCapturaService.capturarVerificado(SESION, "succeeded", "webhook"))
            .get(lockTimeoutMs, TimeUnit.MILLISECONDS)).isEqualTo(OnvoCapturaService.Captura.COBRADO_SOBRE_CANCELADO);
        seguir.countDown();

        Throwable error = causa(comprador);
        assertThat(error).isInstanceOf(IllegalStateException.class).isNotInstanceOf(CancelacionPendienteOnvoException.class);
        // El rollback del comprador no deshace la intención (REQUIRES_NEW) ni la captura, y no deja locks.
        assertThat(pagoRepository.cancelacionSolicitadaEnBase(pagoId)).isPresent();
        assertThat(pagoDe(pedido.getId()).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(pedido.getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(productoEnBase(prod.getId()).getStockReservado()).isZero();
        assertThat(productoEnBase(prod.getId()).getStockActual()).isEqualTo(1);
        assertThat(bloqueableYa("hot_click_pago_tb", "id_pago", pagoId)).isTrue();
        assertThat(bloqueableYa("hot_click_pedido_tb", "id_pedido", pedido.getId())).isTrue();
    }

    @Test
    @DisplayName("compradorCobroSinCapturarConservaReembolso")
    void compradorCobroSinCapturarConservaReembolso() throws Exception {
        Producto prod = producto();
        Pedido pedido = pedidoConPago(prod, SESION);
        when(onvoService.expirarCheckoutSessionTipado(SESION)).thenReturn(expirada());
        onvoGet("succeeded", pedido.getId());

        paymentService.cancelarPorUsuario(pedido.getNumeroPedido(), testUser.getCorreo());

        // Item (2) Seguridad: marcarFallido ya no pisa REEMBOLSO_PENDIENTE.
        assertThat(pagoDe(pedido.getId()).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(pedido.getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(productoEnBase(prod.getId()).getStockReservado()).isZero();
    }

    @Test
    @DisplayName("panelTelegramSinLocksDuranteRedYCapturaReal")
    void panelTelegramSinLocksDuranteRedYCapturaReal() throws Exception {
        Producto prod = producto();
        Pedido pedido = pedidoConPago(prod, SESION);
        Long pagoId = pagoDe(pedido.getId()).getId();
        CountDownLatch enRed = new CountDownLatch(1);
        CountDownLatch seguir = new CountDownLatch(1);
        when(onvoService.expirarCheckoutSessionTipado(SESION)).thenAnswer(inv -> {
            enRed.countDown();
            seguir.await(30, TimeUnit.SECONDS);
            return expirada();
        });
        onvoGet("succeeded", pedido.getId());

        Future<?> panel = hilos.submit(() -> telegramFlujoService.cambiarEstadoPedidoTx(pedido.getId(), Constants.PEDIDO_CANCELADO, null));
        assertThat(enRed.await(20, TimeUnit.SECONDS)).isTrue();
        assertThat(jdbcTemplate.queryForObject("SELECT cancelacion_solicitada_origen FROM hot_click_pago_tb WHERE id_pago = ?",
            String.class, pagoId)).isEqualTo("PANEL");
        assertThat(bloqueableYa("hot_click_pago_tb", "id_pago", pagoId)).isTrue();
        assertThat(bloqueableYa("hot_click_pedido_tb", "id_pedido", pedido.getId())).isTrue();
        assertThat(hilos.submit(() -> onvoCapturaService.capturarVerificado(SESION, "succeeded", "webhook"))
            .get(lockTimeoutMs, TimeUnit.MILLISECONDS)).isEqualTo(OnvoCapturaService.Captura.COBRADO_SOBRE_CANCELADO);
        seguir.countDown();

        Throwable error = causa(panel);
        // Sin deadlock (40P01) ni espera eterna: el panel termina (o 409) y el resultado es el de la captura.
        if (error != null) {
            assertThat(error).isInstanceOfAny(IllegalStateException.class, RuntimeException.class);
            assertThat(String.valueOf(error.getMessage())).doesNotContain("deadlock");
        }
        assertThat(pagoDe(pedido.getId()).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(estadoPedido(pedido.getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(productoEnBase(prod.getId()).getStockReservado()).isZero();
        assertThat(productoEnBase(prod.getId()).getStockActual()).isEqualTo(1);
    }

    @Test
    @DisplayName("panelEsperaPagoBloqueadoSinTomarPedidoNiRed")
    void panelEsperaPagoBloqueadoSinTomarPedidoNiRed() throws Exception {
        Pedido pedido = pedidoConPago(null, SESION);
        Long pagoId = pagoDe(pedido.getId()).getId();
        try (Connection a = conexionAparte(); Statement st = a.createStatement()) {
            // A = captura concurrente: bloquea el pago primero (mismo orden pago → pedido que la captura real).
            st.executeQuery("SELECT 1 FROM hot_click_pago_tb WHERE id_pago = " + pagoId + " FOR UPDATE").close();
            Future<?> panel = hilos.submit(() -> pedidoService.cambiarEstado(pedido.getId(), Constants.PEDIDO_CANCELADO, null));
            long hasta = System.currentTimeMillis() + Math.max(1000, lockTimeoutMs - 2000);
            int esperando = 0;
            while (System.currentTimeMillis() < hasta && (esperando = esperandoLock(a)) == 0) Thread.sleep(50);
            assertThat(esperando).as("el panel quedó esperando el lock del pago").isPositive();
            // El panel no tiene el pedido: A lo toma sin esperar → sin deadlock posible.
            st.executeQuery("SELECT 1 FROM hot_click_pedido_tb WHERE id_pedido = " + pedido.getId() + " FOR UPDATE NOWAIT").close();
            st.executeUpdate("UPDATE hot_click_pago_tb SET estado_pago = 'CAPTURADO' WHERE id_pago = " + pagoId);
            st.executeUpdate("UPDATE hot_click_pedido_tb SET estado_pedido = 'PAGADO' WHERE id_pedido = " + pedido.getId());
            a.commit();

            Throwable error = causa(panel);
            assertThat(error).as("409: la venta ya está decidida").isNotNull();
            assertThat(error).isInstanceOfAny(CancelacionPagoNoCerradaException.class, IllegalStateException.class);
        }
        verify(onvoService, never()).expirarCheckoutSessionTipado(anyString());
        assertThat(estadoPedido(pedido.getId())).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(pagoDe(pedido.getId()).getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        assertThat(pagoRepository.cancelacionSolicitadaEnBase(pagoId)).isEmpty();
    }

    @Test
    @DisplayName("guardadoObsoletoNoPisaIntencionNiIntent")
    void guardadoObsoletoNoPisaIntencionNiIntent() {
        Pedido pedido = pedidoConPago(null, SESION);
        Pago viejo = pagoDe(pedido.getId());
        Long pagoId = viejo.getId();
        new TransactionTemplate(txManager).executeWithoutResult(s ->
            pagoRepository.registrarCancelacionSolicitada(pagoId, LocalDateTime.now(Constants.ZONA_CR), "USUARIO"));
        assertThat(onvoCapturaService.guardarIntentId(SESION, INTENT)).isTrue();
        assertThat(onvoCapturaService.guardarIntentId(SESION, "pi_fix2pg_otro")).isFalse();

        viejo.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.saveAndFlush(viejo);

        assertThat(pagoRepository.cancelacionSolicitadaEnBase(pagoId)).isPresent();
        assertThat(jdbcTemplate.queryForObject("SELECT onvo_payment_intent_id FROM hot_click_pago_tb WHERE id_pago = ?",
            String.class, pagoId)).isEqualTo(INTENT);
    }

    @Test
    @DisplayName("skipLockedSaltaFilasRetenidasSinEsperar")
    void skipLockedSaltaFilasRetenidasSinEsperar() throws Exception {
        Pedido pedido = pedidoConPago(null, SESION);
        List<Long> ids = new ArrayList<>();
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        for (int i = 0; i < 6; i++) {
            ids.add(pagoRepository.saveAndFlush(pago(pedido, "cs_fix2pg_skip_" + i, Constants.PAGO_CANCELADO,
                ahora.minusHours(1))).getId());
        }
        OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
        List<String> llamados = new CopyOnWriteArrayList<>();
        when(provider.procesarPagoVerificado(anyString(), eq("respaldo"))).thenAnswer(inv -> {
            llamados.add(inv.getArgument(0));
            return OnvoPaymentProvider.Verificacion.EN_PROCESO;
        });
        try (Connection a = conexionAparte(); Statement st = a.createStatement()) {
            st.executeQuery("SELECT 1 FROM hot_click_pago_tb WHERE id_pago IN (" + ids.get(0) + "," + ids.get(1) + ","
                + ids.get(2) + ") FOR UPDATE").close();
            long t0 = System.nanoTime();
            respaldo(provider).revisarCerrados();
            long ms = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - t0);
            a.rollback();
            assertThat(ms).as("SKIP LOCKED: no espera las filas retenidas").isLessThan(lockTimeoutMs);
        }
        assertThat(llamados).containsExactlyInAnyOrder("cs_fix2pg_skip_3", "cs_fix2pg_skip_4", "cs_fix2pg_skip_5");
    }

    @Test
    @DisplayName("dosInstanciasConcurrentesReclamanDisjuntoConLease")
    void dosInstanciasConcurrentesReclamanDisjuntoConLease() throws Exception {
        Pedido pedido = pedidoConPago(null, SESION);
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        for (int i = 0; i < 12; i++) {
            pagoRepository.saveAndFlush(pago(pedido, "cs_fix2pg_par_" + i, Constants.PAGO_FALLIDO, ahora.minusHours(2)));
        }
        Map<String, AtomicInteger> porToken = new ConcurrentHashMap<>();
        OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
        when(provider.procesarPagoVerificado(anyString(), eq("respaldo"))).thenAnswer(inv -> {
            porToken.computeIfAbsent(inv.getArgument(0), k -> new AtomicInteger()).incrementAndGet();
            return OnvoPaymentProvider.Verificacion.EN_PROCESO;
        });
        CyclicBarrier largada = new CyclicBarrier(2);
        Future<Integer> uno = hilos.submit(() -> { largada.await(10, TimeUnit.SECONDS); return respaldo(provider).revisarCerrados().revisados(); });
        Future<Integer> dos = hilos.submit(() -> { largada.await(10, TimeUnit.SECONDS); return respaldo(provider).revisarCerrados().revisados(); });
        int total = uno.get(60, TimeUnit.SECONDS) + dos.get(60, TimeUnit.SECONDS);

        assertThat(total).isEqualTo(12);
        assertThat(porToken).hasSize(12);
        assertThat(porToken.values()).allSatisfy(n -> assertThat(n.get()).isEqualTo(1));
        // Lease persistido: una tercera corrida inmediata no vuelve a consultar ninguno.
        assertThat(respaldo(provider).revisarCerrados().revisados()).isZero();
    }

    @Test
    @DisplayName("backoffPersisteYSeRecuperaTrasReinicio")
    void backoffPersisteYSeRecuperaTrasReinicio() {
        Pedido pedido = pedidoConPago(null, SESION);
        Long id = pagoRepository.saveAndFlush(pago(pedido, "cs_fix2pg_backoff", Constants.PAGO_CANCELADO,
            LocalDateTime.now(Constants.ZONA_CR).minusHours(3))).getId();
        OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
        when(provider.procesarPagoVerificado(anyString(), eq("respaldo"))).thenReturn(OnvoPaymentProvider.Verificacion.EN_PROCESO);

        LocalDateTime antes = LocalDateTime.now(Constants.ZONA_CR);
        assertThat(respaldo(provider).revisarCerrados().revisados()).isEqualTo(1);
        Map<String, Object> fila = jdbcTemplate.queryForMap(
            "SELECT conciliacion_intentos, conciliacion_proxima_en FROM hot_click_pago_tb WHERE id_pago = ?", id);
        assertThat(((Number) fila.get("conciliacion_intentos")).intValue()).isEqualTo(1);
        LocalDateTime proxima = ((java.sql.Timestamp) fila.get("conciliacion_proxima_en")).toLocalDateTime();
        assertThat(proxima).isBetween(antes.plusMinutes(2).minusSeconds(30), antes.plusMinutes(2).plusSeconds(30));

        // "Reinicio": otra instancia del servicio lee el backoff de la base y no repite la consulta.
        assertThat(respaldo(provider).revisarCerrados().revisados()).isZero();
        jdbcTemplate.update("UPDATE hot_click_pago_tb SET conciliacion_proxima_en = ? WHERE id_pago = ?",
            java.sql.Timestamp.valueOf(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1)), id);
        LocalDateTime antes2 = LocalDateTime.now(Constants.ZONA_CR);
        assertThat(respaldo(provider).revisarCerrados().revisados()).isEqualTo(1);
        fila = jdbcTemplate.queryForMap(
            "SELECT conciliacion_intentos, conciliacion_proxima_en FROM hot_click_pago_tb WHERE id_pago = ?", id);
        assertThat(((Number) fila.get("conciliacion_intentos")).intValue()).isEqualTo(2);
        proxima = ((java.sql.Timestamp) fila.get("conciliacion_proxima_en")).toLocalDateTime();
        assertThat(proxima).isBetween(antes2.plusMinutes(4).minusSeconds(30), antes2.plusMinutes(4).plusSeconds(30));
    }

    @Test
    @DisplayName("fairnessBacklogCincoMilHistoricosYRecientes")
    void fairnessBacklogCincoMilHistoricosYRecientes() {
        Pedido pedido = pedidoConPago(null, SESION);
        LocalDateTime ahora = LocalDateTime.now(Constants.ZONA_CR);
        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            List<Pago> lote = new ArrayList<>(HISTORICOS);
            for (int i = 0; i < HISTORICOS; i++) {
                lote.add(pago(pedido, "cs_fix2pg_hist_" + i, Constants.PAGO_FALLIDO, ahora.minusDays(30).minusMinutes(i)));
            }
            pagoRepository.saveAll(lote);
            for (int i = 0; i < 3; i++) {
                pagoRepository.save(pago(pedido, "cs_fix2pg_rec_" + i, Constants.PAGO_CANCELADO, ahora.minusHours(1)));
            }
        });
        assertThat(pagoRepository.contarBacklogConciliacion(Constants.PROVEEDOR_ONVO, LocalDateTime.now(Constants.ZONA_CR)))
            .isEqualTo(HISTORICOS + 3L);

        Map<Integer, List<String>> corridas = new LinkedHashMap<>();
        AtomicInteger corrida = new AtomicInteger();
        OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
        when(provider.procesarPagoVerificado(anyString(), eq("respaldo"))).thenAnswer(inv -> {
            corridas.computeIfAbsent(corrida.get(), k -> new ArrayList<>()).add(inv.getArgument(0));
            return OnvoPaymentProvider.Verificacion.EN_PROCESO;
        });
        OnvoPendientesReconsultaService srv = respaldo(provider);

        corrida.set(1);
        srv.revisarCerrados();
        List<String> c1 = corridas.getOrDefault(1, List.of());
        assertThat(c1).hasSize(10);
        assertThat(c1).contains("cs_fix2pg_rec_0", "cs_fix2pg_rec_1", "cs_fix2pg_rec_2");
        assertThat(c1.stream().filter(t -> t.startsWith("cs_fix2pg_hist_")).count()).isEqualTo(7);

        corrida.set(2);
        srv.revisarCerrados();
        List<String> c2 = corridas.getOrDefault(2, List.of());
        assertThat(c2).hasSize(10).allMatch(t -> t.startsWith("cs_fix2pg_hist_")).doesNotContainAnyElementsOf(c1);

        // Llegan 2 recientes nuevos y vencen los 3 anteriores: siguen primero y los históricos igual avanzan.
        jdbcTemplate.update("UPDATE hot_click_pago_tb SET conciliacion_proxima_en = ? WHERE merchant_token LIKE 'cs_fix2pg_rec_%'",
            java.sql.Timestamp.valueOf(LocalDateTime.now(Constants.ZONA_CR).minusMinutes(1)));
        for (int i = 3; i < 5; i++) {
            pagoRepository.saveAndFlush(pago(pedido, "cs_fix2pg_rec_" + i, Constants.PAGO_CANCELADO, ahora.minusMinutes(30)));
        }
        corrida.set(3);
        srv.revisarCerrados();
        List<String> c3 = corridas.getOrDefault(3, List.of());
        assertThat(c3).hasSize(10);
        assertThat(c3).contains("cs_fix2pg_rec_0", "cs_fix2pg_rec_1", "cs_fix2pg_rec_2", "cs_fix2pg_rec_3", "cs_fix2pg_rec_4");
        List<String> hist3 = c3.stream().filter(t -> t.startsWith("cs_fix2pg_hist_")).toList();
        assertThat(hist3).hasSize(5).doesNotContainAnyElementsOf(c1).doesNotContainAnyElementsOf(c2);

        Set<String> historicosVistos = new java.util.HashSet<>();
        corridas.values().forEach(l -> l.stream().filter(t -> t.startsWith("cs_fix2pg_hist_")).forEach(historicosVistos::add));
        assertThat(historicosVistos).hasSize(22);
        assertThat(pagoRepository.contarBacklogConciliacion(Constants.PROVEEDOR_ONVO, LocalDateTime.now(Constants.ZONA_CR)))
            .isEqualTo(HISTORICOS - 22L);
        // El pago PENDIENTE del pedido base no es cerrado: nunca entra a esta conciliación.
        assertThat(corridas.values().stream().flatMap(List::stream)).doesNotContain(SESION);
    }
}
