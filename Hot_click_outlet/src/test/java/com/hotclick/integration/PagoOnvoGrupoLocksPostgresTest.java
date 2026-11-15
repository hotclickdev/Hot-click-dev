package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.payment.OnvoCapturaService;
import com.hotclick.payment.OnvoCapturaService.Captura;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.PaymentService;
import com.hotclick.service.PedidoService;
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
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

/**
 * fix2 (locks entre procesos) sobre PostgreSQL REAL: liberación de reservas del grupo en {@code cancelarPedidosPendientes}
 * (orden Pago → pedidos ORDER BY id → UN lock de productos ORDER BY id → escrituras).
 *
 * Opt-in con HC_PG_TEST_URL igual que {@link PagoOnvoCancelacionLocksPostgresTest}: un Postgres DESECHABLE (nunca el 5432
 * de QA ni producción). Esquema propio {@value #SCHEMA}, recreado al arrancar. ONVO es un doble: no hay red ni tarjetas.
 * Sin la variable JUnit la omite. NO está en la lista del gate scripts/ci/fix2-pg-surefire.py ni en el -Dtest de ci.yml.
 *
 * Panel PAGADO vs captura: la inversión Pedido→Pago del panel es PREEXISTENTE y está fuera de alcance; el contrato solo
 * exige que no quede estado mixto (deadlock o 400 son aceptables como resultado de esa carrera, no como éxito).
 */
@EnabledIfEnvironmentVariable(named = "HC_PG_TEST_URL", matches = ".+")
@DisplayName("fix2 PG | liberación de grupo: multipedido, idempotencia, rollback, carreras y grupos cruzados")
class PagoOnvoGrupoLocksPostgresTest extends BaseIntegrationTest {

    static final String SCHEMA = "hc_pr553_locks";
    private static final String INTENT = "pi_pr553pg_intent01";
    private static final int EXTRA = 2;       // reserva ajena que NO debe tocarse
    private static final int STOCK = 100;
    private static final AtomicLong SEQ = new AtomicLong();

    private static String urlBase;
    private static String usuario;
    private static String clave;

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry r) {
        separar(System.getenv("HC_PG_TEST_URL"));
        JdbcTemplate admin = new JdbcTemplate(new DriverManagerDataSource(urlBase, usuario, clave));
        admin.execute("DROP SCHEMA IF EXISTS " + SCHEMA + " CASCADE");
        admin.execute("CREATE SCHEMA " + SCHEMA);
        r.add("spring.datasource.url", PagoOnvoGrupoLocksPostgresTest::urlEsquema);
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
    @Autowired private OnvoCapturaService onvoCapturaService;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private com.hotclick.service.payment.PagoExpiradoCancelador pagoExpiradoCancelador;
    @Autowired private com.hotclick.service.payment.ReservaTiendaVencidaService reservaTiendaVencidaService;
    @Autowired private com.hotclick.service.payment.PaymentFailureHandler paymentFailureHandler;
    @Value("${hotclick.billing.lock-timeout-ms}") private int lockTimeoutMs;

    private Empresa empresa;
    private Bodega bodega;
    private Categoria categoria;
    private final ExecutorService hilos = Executors.newFixedThreadPool(6);

    /** Grupo creado: sesión, pedidos (el primero lleva el Pago) y cantidades por producto. */
    private record Grupo(String sesion, List<Pedido> pedidos, Map<Long, Integer> cantidades) {
        Pedido principal() { return pedidos.get(0); }
    }

    @BeforeEach
    void armar() {
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("test");
        String slug = "pr553pg-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("PR553 PG");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega PR553 PG");
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
        categoria.setNombreCategoria("Cat-PR553PG-" + System.nanoTime());
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
    }

    @AfterEach
    void limpiar() throws Exception {
        hilos.shutdownNow();
        jdbcTemplate.execute("DROP TRIGGER IF EXISTS trg_falla_pr553 ON hot_click_producto_tb");
        jdbcTemplate.execute("TRUNCATE hot_click_webhook_event_tb, hot_click_movimiento_stock_tb, hot_click_pago_tb, "
            + "hot_click_pedido_item_tb, hot_click_pedido_tb, hot_click_producto_tb, hot_click_categoria_tb, "
            + "hot_click_bodega_tb, hot_click_empresa_tb CASCADE");
    }

    // ── Fixtures ───────────────────────────────────────────────────────────────

    private List<Producto> productos(int n) {
        List<Producto> lista = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            Producto p = new Producto();
            p.setNombreProducto("Producto PR553 PG " + i);
            p.setSku("SKU-P553-" + SEQ.incrementAndGet() + "-" + System.nanoTime());
            p.setPrecioVenta(10000);
            p.setPrecioCompra(7000);
            p.setStockActual(STOCK);
            p.setStockReservado(EXTRA);
            p.setStockMinimo(0);
            p.setEstado(Constants.ESTADO_ACTIVO);
            p.setEsPersonalizado(false);
            p.setCategoria(categoria);
            p.setEmpresa(empresa);
            p.setBodega(bodega);
            p.setAdminCliente(adminUser);
            p.setFechaCreacion(LocalDateTime.now());
            lista.add(productoRepository.saveAndFlush(p));
        }
        return lista;
    }

    /**
     * Grupo PENDIENTE con reserva real: spec[pedido][linea] = {índice de producto, cantidad}. Suma la cantidad a
     * stockReservado de cada producto (queda EXTRA + lo reservado por los grupos creados sobre él).
     */
    private Grupo grupo(List<Producto> prods, int[][][] spec) {
        String sesion = "cs_pr553_" + SEQ.incrementAndGet();
        String grupoPago = "GRP-" + SEQ.get();
        List<Pedido> pedidos = new ArrayList<>();
        Map<Long, Integer> cantidades = new HashMap<>();
        for (int[][] lineas : spec) {
            Pedido p = new Pedido();
            p.setNumeroPedido("P553-" + SEQ.incrementAndGet());
            p.setGrupoPago(grupoPago);
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
            for (int[] l : lineas) {
                Producto prod = prods.get(l[0]);
                PedidoItem item = new PedidoItem();
                item.setCantidad(l[1]);
                item.setPrecioUnitarioMomento(10000);
                item.setCostoUnitarioMomento(7000);
                item.setSubtotalItem(10000);
                item.setUtilidadItem(3000);
                item.setProducto(prod);
                item.setPedido(p);
                items.add(item);
                cantidades.merge(prod.getId(), l[1], Integer::sum);
            }
            p.setItems(items);
            pedidos.add(pedidoRepository.saveAndFlush(p));
        }
        for (Map.Entry<Long, Integer> e : cantidades.entrySet()) {
            jdbcTemplate.update("UPDATE hot_click_producto_tb SET stock_reservado = stock_reservado + ? WHERE id_producto = ?",
                e.getValue(), e.getKey());
        }
        Pago pago = new Pago();
        pago.setMerchantToken(sesion);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(pedidos.get(0));
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.saveAndFlush(pago);
        return new Grupo(sesion, pedidos, cantidades);
    }

    /** Intención durable de cancelar (la que deja el comprador o el panel antes de que llegue el cobro). */
    private void intencion(Grupo g) {
        Long pagoId = pagoRepository.findTopByPedidoId(g.principal().getId()).orElseThrow().getId();
        new TransactionTemplate(txManager).executeWithoutResult(s ->
            pagoRepository.registrarCancelacionSolicitada(pagoId, LocalDateTime.now(Constants.ZONA_CR), "USUARIO"));
    }

    private static String resumen() {
        return "{\"verificado\":\"GET ONVO\",\"paymentIntentId\":\"" + INTENT + "\"}";
    }

    private Captura capturar(Grupo g) {
        return onvoCapturaService.capturarVerificado(g.sesion(), resumen(), "webhook");
    }

    private void onvoCobrado(Grupo g) {
        when(onvoService.expirarCheckoutSessionTipado(g.sesion())).thenReturn(new OnvoService.ResultadoExpirar(
            OnvoService.TipoExpirar.RESPUESTA, Map.of("id", g.sesion(), "status", "expired", "paymentStatus", "unpaid")));
        doReturn(Map.of("id", g.sesion(), "paymentStatus", "unpaid", "status", "expired", "paymentIntentId", INTENT,
            "mode", "test")).when(onvoService).obtenerCheckoutSession(g.sesion());
        Map<String, Object> intent = new HashMap<>(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000,
            "currency", "CRC", "mode", "test", "receivedAmount", 1_000_000,
            "metadata", Map.of("pedidoId", String.valueOf(g.principal().getId()))));
        doReturn(intent).when(onvoService).obtenerPaymentIntent(INTENT);
    }

    private String estadoPedido(Long id) { return pedidoRepository.findById(id).orElseThrow().getEstadoPedido(); }

    private Pago pagoDe(Grupo g) { return pagoRepository.findTopByPedidoId(g.principal().getId()).orElseThrow(); }

    private int reservado(Producto p) {
        return jdbcTemplate.queryForObject("SELECT stock_reservado FROM hot_click_producto_tb WHERE id_producto = ?",
            Integer.class, p.getId());
    }

    private int stockActual(Producto p) {
        return jdbcTemplate.queryForObject("SELECT stock_actual FROM hot_click_producto_tb WHERE id_producto = ?",
            Integer.class, p.getId());
    }

    private int movimientos() {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_movimiento_stock_tb", Integer.class);
    }

    private int eventos(Grupo g) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_webhook_event_tb WHERE merchant_token = ?",
            Integer.class, g.sesion());
    }

    private int pedidosConReserva(Grupo g) {
        return jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_pedido_tb WHERE grupo_pago = ? "
            + "AND stock_reservado_en IS NOT NULL", Integer.class, g.principal().getGrupoPago());
    }

    private void assertLiberado(Grupo g, List<Producto> prods, Map<Long, Integer> reservadoEsperado) {
        for (Pedido p : g.pedidos()) assertThat(estadoPedido(p.getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pagoDe(g).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pedidosConReserva(g)).isZero();
        for (Producto p : prods) {
            assertThat(reservado(p)).as("reservado producto %d", p.getId()).isEqualTo(reservadoEsperado.get(p.getId()));
        }
    }

    private static Throwable causa(Future<?> f) throws Exception {
        try {
            f.get(90, TimeUnit.SECONDS);
            return null;
        } catch (ExecutionException e) {
            return e.getCause();
        }
    }

    private static int esperandoLock(Connection excluida) throws SQLException {
        int pid;
        try (Statement st = excluida.createStatement(); java.sql.ResultSet rs = st.executeQuery("SELECT pg_backend_pid()")) {
            rs.next();
            pid = rs.getInt(1);
        }
        try (Connection c = DriverManager.getConnection(urlEsquema(), usuario, clave);
             Statement st = c.createStatement();
             java.sql.ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database() "
                 + "AND wait_event_type = 'Lock' AND pid <> " + pid)) {
            rs.next();
            return rs.getInt(1);
        }
    }

    private static boolean esDeadlock(Throwable t) {
        for (Throwable c = t; c != null; c = c.getCause()) {
            if (c instanceof SQLException s && "40P01".equals(s.getSQLState())) return true;
        }
        return false;
    }

    private static boolean esLockTimeout(Throwable t) {
        for (Throwable c = t; c != null; c = c.getCause()) {
            if (c instanceof SQLException s && "55P03".equals(s.getSQLState())) return true;
        }
        return false;
    }

    /** Spec 3 pedidos × 3 líneas con productos repetidos entre pedidos (4 productos). */
    private static final int[][][] TRES_POR_TRES = {
        {{0, 2}, {1, 1}, {2, 3}},
        {{1, 2}, {2, 1}, {3, 1}},
        {{0, 1}, {3, 4}, {2, 2}},
    };

    private Map<Long, Integer> extraEsperado(List<Producto> prods) {
        Map<Long, Integer> m = new HashMap<>();
        for (Producto p : prods) m.put(p.getId(), EXTRA);
        return m;
    }

    // ── 1 y 2: multipedido/multiítem, idempotencia ───────────────────────────────

    @Test
    @DisplayName("multipedidoMultiitemLiberaExactoYEsIdempotente")
    void multipedidoMultiitemLiberaExactoYEsIdempotente() {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        intencion(g);
        int mov = movimientos();

        assertThat(capturar(g)).isEqualTo(Captura.COBRADO_SOBRE_CANCELADO);

        assertLiberado(g, prods, extraEsperado(prods));
        for (Producto p : prods) assertThat(stockActual(p)).isEqualTo(STOCK);
        assertThat(movimientos()).isEqualTo(mov);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_movimiento_stock_tb WHERE tipo_movimiento = 'VENTA'",
            Integer.class)).isZero();

        // Webhook repetido y reserva ajena nueva: DUPLICADO, sin doble liberación.
        jdbcTemplate.update("UPDATE hot_click_producto_tb SET stock_reservado = stock_reservado + 1");
        assertThat(capturar(g)).isEqualTo(Captura.DUPLICADO);
        assertThat(capturar(g)).isEqualTo(Captura.DUPLICADO);
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA + 1);
        assertThat(eventos(g)).isEqualTo(1);
    }

    @Test
    @DisplayName("cancelacionPanelConCobroLiberaGrupoUnaVez")
    void cancelacionPanelConCobroLiberaGrupoUnaVez() {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        onvoCobrado(g);

        pedidoService.cambiarEstado(g.principal().getId(), Constants.PEDIDO_CANCELADO, null);

        assertLiberado(g, prods, extraEsperado(prods));
        for (Producto p : prods) assertThat(stockActual(p)).isEqualTo(STOCK);
        assertThat(capturar(g)).isEqualTo(Captura.DUPLICADO);
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA);
    }

    @Test
    @DisplayName("cancelacionCompradorConCobroLiberaGrupoUnaVez")
    void cancelacionCompradorConCobroLiberaGrupoUnaVez() {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        onvoCobrado(g);

        paymentService.cancelarPorUsuario(g.principal().getNumeroPedido(), testUser.getCorreo());

        assertLiberado(g, prods, extraEsperado(prods));
        assertThat(capturar(g)).isEqualTo(Captura.DUPLICADO);
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA);
    }

    // ── 3: fallo intermedio → rollback completo y reintento ──────────────────────

    private void assertSinCambios(Grupo g, List<Producto> prods) {
        for (Pedido p : g.pedidos()) assertThat(estadoPedido(p.getId())).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(pagoDe(g).getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        assertThat(eventos(g)).isZero();
        assertThat(pedidosConReserva(g)).isEqualTo(g.pedidos().size());
        Map<Long, Integer> inicial = new HashMap<>();
        for (Producto p : prods) {
            inicial.put(p.getId(), EXTRA + g.cantidades().getOrDefault(p.getId(), 0));
            assertThat(reservado(p)).isEqualTo(inicial.get(p.getId()));
            assertThat(stockActual(p)).isEqualTo(STOCK);
        }
    }

    @Test
    @DisplayName("falloInyectadoEnSegundoProductoRevierteTodoYReintentoLiberaUnaVez")
    void falloInyectadoEnSegundoProductoRevierteTodoYReintentoLiberaUnaVez() {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        intencion(g);
        List<Long> ids = prods.stream().map(Producto::getId).sorted().toList();
        jdbcTemplate.execute("CREATE OR REPLACE FUNCTION " + SCHEMA + ".falla_pr553() RETURNS trigger AS $$ BEGIN "
            + "IF NEW.id_producto = " + ids.get(1) + " AND NEW.stock_reservado <> OLD.stock_reservado THEN "
            + "RAISE EXCEPTION 'falla inyectada pr553'; END IF; RETURN NEW; END $$ LANGUAGE plpgsql");
        jdbcTemplate.execute("CREATE TRIGGER trg_falla_pr553 BEFORE UPDATE ON hot_click_producto_tb "
            + "FOR EACH ROW EXECUTE FUNCTION " + SCHEMA + ".falla_pr553()");

        assertThatThrownBy(() -> capturar(g)).isInstanceOf(Exception.class);
        assertSinCambios(g, prods);

        jdbcTemplate.execute("DROP TRIGGER trg_falla_pr553 ON hot_click_producto_tb");
        assertThat(capturar(g)).isEqualTo(Captura.COBRADO_SOBRE_CANCELADO);
        assertLiberado(g, prods, extraEsperado(prods));
        assertThat(capturar(g)).isEqualTo(Captura.DUPLICADO);
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA);
    }

    @Test
    @DisplayName("lockTimeoutEnSegundoProductoRevierteTodoYReintentoLiberaUnaVez")
    void lockTimeoutEnSegundoProductoRevierteTodoYReintentoLiberaUnaVez() throws Exception {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        intencion(g);
        List<Long> ids = prods.stream().map(Producto::getId).sorted().toList();
        Future<Captura> captura;
        try (Connection retenedor = conexionAparte(); Statement st = retenedor.createStatement()) {
            st.executeQuery("SELECT 1 FROM hot_click_producto_tb WHERE id_producto = " + ids.get(1) + " FOR UPDATE").close();
            captura = hilos.submit((Callable<Captura>) () -> capturar(g));
            assertThat(causa(captura)).as("lock_timeout en el 2.º producto del lote").isNotNull();
            assertThat(esLockTimeout(causa(captura)) || String.valueOf(causa(captura)).toLowerCase().contains("lock"))
                .isTrue();
            retenedor.rollback();
        }
        assertSinCambios(g, prods);
        assertThat(capturar(g)).isEqualTo(Captura.COBRADO_SOBRE_CANCELADO);
        assertLiberado(g, prods, extraEsperado(prods));
        assertThat(eventos(g)).isEqualTo(1);
    }

    // ── 4: carreras con conexiones reales sobre el mismo grupo ───────────────────

    /** Estado final coherente del grupo: o todo cancelado (reembolso) o todo pagado; nunca mixto. */
    private void assertCoherente(Grupo g, List<Producto> prods) {
        List<String> estados = g.pedidos().stream().map(p -> estadoPedido(p.getId())).toList();
        String pago = pagoDe(g).getEstadoPago();
        assertThat(pedidosConReserva(g)).isZero();
        if (estados.stream().allMatch(Constants.PEDIDO_CANCELADO::equals)) {
            assertThat(pago).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
            for (Producto p : prods) {
                assertThat(reservado(p)).isEqualTo(EXTRA);
                assertThat(stockActual(p)).isEqualTo(STOCK);
            }
        } else {
            assertThat(estados).allMatch(Constants.PEDIDO_PAGADO::equals);
            assertThat(pago).isEqualTo(Constants.PAGO_CAPTURADO);
            for (Producto p : prods) {
                assertThat(reservado(p)).isEqualTo(EXTRA);
                assertThat(stockActual(p)).isEqualTo(STOCK - g.cantidades().getOrDefault(p.getId(), 0));
            }
        }
    }

    private List<Throwable> correrJuntos(List<Callable<?>> tareas) throws Exception {
        CyclicBarrier barrera = new CyclicBarrier(tareas.size());
        List<Future<?>> futuros = new ArrayList<>();
        for (Callable<?> t : tareas) {
            futuros.add(hilos.submit(() -> { barrera.await(20, TimeUnit.SECONDS); return t.call(); }));
        }
        List<Throwable> errores = new ArrayList<>();
        for (Future<?> f : futuros) errores.add(causa(f));
        return errores;
    }

    @Test
    @DisplayName("carreraCapturaVsCapturaMismoGrupoLiberaUnaVez")
    void carreraCapturaVsCapturaMismoGrupoLiberaUnaVez() throws Exception {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        intencion(g);
        Callable<Captura> c = () -> capturar(g);
        Future<Captura> a = hilos.submit(c);
        Future<Captura> b = hilos.submit(c);
        Captura ra = a.get(90, TimeUnit.SECONDS);
        Captura rb = b.get(90, TimeUnit.SECONDS);
        assertThat(List.of(ra, rb)).containsExactlyInAnyOrder(Captura.COBRADO_SOBRE_CANCELADO, Captura.DUPLICADO);
        assertLiberado(g, prods, extraEsperado(prods));
        assertThat(eventos(g)).isEqualTo(1);
    }

    @Test
    @DisplayName("carreraCapturaVsCancelacionPanelYCompradorSinEstadoMixto")
    void carreraCapturaVsCancelacionPanelYCompradorSinEstadoMixto() throws Exception {
        for (boolean panel : new boolean[]{true, false}) {
            List<Producto> prods = productos(4);
            Grupo g = grupo(prods, TRES_POR_TRES);
            onvoCobrado(g);
            List<Throwable> errores = correrJuntos(List.of(
                () -> capturar(g),
                () -> {
                    if (panel) pedidoService.cambiarEstado(g.principal().getId(), Constants.PEDIDO_CANCELADO, null);
                    else paymentService.cancelarPorUsuario(g.principal().getNumeroPedido(), testUser.getCorreo());
                    return null;
                }));
            // Perdedor de deadlock/lock_timeout: se reintenta la captura (webhook) y debe terminar bien.
            if (errores.stream().anyMatch(e -> e != null)) {
                try { capturar(g); } catch (RuntimeException ignorado) { /* cancelación ya decidida */ }
            }
            assertCoherente(g, prods);
        }
    }

    @Test
    @DisplayName("carreraCapturaVsPanelPagadoPanelPierdeCon400SinDeadlock")
    void carreraCapturaVsPanelPagadoPanelPierdeCon400SinDeadlock() throws Exception {
        for (int ronda = 0; ronda < 5; ronda++) {
            List<Producto> prods = productos(4);
            Grupo g = grupo(prods, TRES_POR_TRES);
            intencion(g);
            List<Throwable> errores = correrJuntos(List.of(
                () -> capturar(g),
                () -> { pedidoService.cambiarEstado(g.principal().getId(), Constants.PEDIDO_PAGADO, null); return null; }));
            // Orden Pago → Pedido en el panel: ya no hay inversión. La captura NO cae por esa carrera y el panel
            // pierde siempre con 400 (pasarela), nunca por deadlock.
            assertThat(errores.get(0)).as("ronda %d: la captura termina bien", ronda).isNull();
            assertThat(errores.get(1)).as("ronda %d: panel PAGADO rechazado", ronda).isInstanceOf(IllegalArgumentException.class);
            assertThat(esDeadlock(errores.get(1))).isFalse();
            assertLiberado(g, prods, extraEsperado(prods));
            for (Producto p : prods) assertThat(stockActual(p)).isEqualTo(STOCK);
        }
    }

    @Test
    @DisplayName("panelPagadoBloqueaPagoAntesQuePedidoYRechazaPasarelaSinLockDePedido")
    void panelPagadoBloqueaPagoAntesQuePedidoYRechazaPasarelaSinLockDePedido() throws Exception {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        Long pagoId = pagoDe(g).getId();
        Future<?> panel;
        try (Connection a = conexionAparte(); Statement st = a.createStatement()) {
            st.executeQuery("SELECT 1 FROM hot_click_pago_tb WHERE id_pago = " + pagoId + " FOR UPDATE").close();
            panel = hilos.submit(() -> pedidoService.cambiarEstado(g.principal().getId(), Constants.PEDIDO_PAGADO, null));
            long hasta = System.currentTimeMillis() + Math.max(1000, lockTimeoutMs - 2000);
            int esperando = 0;
            while (System.currentTimeMillis() < hasta && (esperando = esperandoLock(a)) == 0) Thread.sleep(50);
            assertThat(esperando).as("el panel espera el lock del PAGO").isPositive();
            // El panel NO tiene ningún pedido del grupo: otra conexión los toma sin esperar.
            for (Pedido p : g.pedidos()) {
                st.executeQuery("SELECT 1 FROM hot_click_pedido_tb WHERE id_pedido = " + p.getId() + " FOR UPDATE NOWAIT").close();
            }
            a.rollback();
        }
        assertThat(causa(panel)).isInstanceOf(IllegalArgumentException.class);
        for (Pedido p : g.pedidos()) assertThat(estadoPedido(p.getId())).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(pagoDe(g).getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("panelPagadoManualEfectivoSigueFuncionandoConPagoPrimero")
    void panelPagadoManualEfectivoSigueFuncionandoConPagoPrimero() {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        jdbcTemplate.update("UPDATE hot_click_pedido_tb SET metodo_pago = 'EFECTIVO' WHERE grupo_pago = ?",
            g.principal().getGrupoPago());
        jdbcTemplate.update("UPDATE hot_click_pago_tb SET proveedor = ? WHERE id_pago = ?",
            Constants.PROVEEDOR_MANUAL, pagoDe(g).getId());

        pedidoService.cambiarEstado(g.principal().getId(), Constants.PEDIDO_PAGADO, null, "Ref Caja 1");

        for (Pedido p : g.pedidos()) assertThat(estadoPedido(p.getId())).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(pagoDe(g).getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        for (Producto p : prods) {
            assertThat(reservado(p)).isEqualTo(EXTRA);
            assertThat(stockActual(p)).isEqualTo(STOCK - g.cantidades().getOrDefault(p.getId(), 0));
        }
    }

    // ── 5: grupos con productos cruzados ─────────────────────────────────────────

    @Test
    @DisplayName("gruposCruzadosLiberacionVsLiberacionSinDeadlock")
    void gruposCruzadosLiberacionVsLiberacionSinDeadlock() throws Exception {
        for (int ronda = 0; ronda < 8; ronda++) {
            List<Producto> prods = productos(6);
            // Grupo A [p5,p3,...] y grupo B [p3,p5,...]: mismos productos en distinto orden de pedidos.
            Grupo a = grupo(prods, new int[][][]{{{5, 1}, {3, 1}}, {{3, 2}, {1, 1}}, {{5, 2}, {0, 1}}});
            Grupo b = grupo(prods, new int[][][]{{{3, 1}, {5, 1}}, {{5, 3}, {1, 2}}, {{3, 1}, {2, 1}}});
            intencion(a);
            intencion(b);
            List<Throwable> errores = correrJuntos(List.of(() -> capturar(a), () -> capturar(b)));
            assertThat(errores).as("ronda %d sin deadlock entre caminos nuevos", ronda).containsOnlyNulls();
            Map<Long, Integer> esperado = extraEsperado(prods);
            assertLiberado(a, prods, esperado);
            assertLiberado(b, prods, esperado);
        }
    }

    @Test
    @DisplayName("gruposCruzadosLiberacionVsConfirmacionSinDeadlock")
    void gruposCruzadosLiberacionVsConfirmacionSinDeadlock() throws Exception {
        for (int ronda = 0; ronda < 8; ronda++) {
            List<Producto> prods = productos(6);
            Grupo cancela = grupo(prods, new int[][][]{{{5, 1}, {3, 1}}, {{3, 2}, {1, 1}}});
            Grupo confirma = grupo(prods, new int[][][]{{{3, 1}, {5, 1}}, {{5, 2}, {1, 1}}});
            intencion(cancela);
            List<Throwable> errores = correrJuntos(List.of(() -> capturar(cancela), () -> capturar(confirma)));
            assertThat(errores).as("ronda %d sin deadlock liberación vs confirmación", ronda).containsOnlyNulls();
            assertLiberado(cancela, prods, extraEsperado(prods));
            assertCoherente(confirma, prods);
            assertThat(pagoDe(confirma).getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        }
    }

    // ── TTL y marcarFallido con liberación de grupo ──────────────────────────────

    @Test
    @DisplayName("ttlCancelaSoloPendienteYLiberaGrupoExactoUnaVez")
    void ttlCancelaSoloPendienteYLiberaGrupoExactoUnaVez() {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        // El 3.er pedido ya no es PENDIENTE (TTL no lo toca ni libera su reserva).
        Long idTercero = g.pedidos().get(2).getId();
        jdbcTemplate.update("UPDATE hot_click_pedido_tb SET estado_pedido = 'PENDIENTE_COMPROBANTE' WHERE id_pedido = ?", idTercero);
        Long pagoId = pagoDe(g).getId();

        assertThat(pagoExpiradoCancelador.cancelar(pagoId)).isTrue();
        assertThat(pagoExpiradoCancelador.cancelar(pagoId)).isFalse();

        assertThat(estadoPedido(g.pedidos().get(0).getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(estadoPedido(g.pedidos().get(1).getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(estadoPedido(idTercero)).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        // Reserva restante = EXTRA + lo que sigue reservando el 3.er pedido {0:1, 3:4, 2:2}.
        Map<Long, Integer> tercero = Map.of(prods.get(0).getId(), 1, prods.get(3).getId(), 4, prods.get(2).getId(), 2);
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA + tercero.getOrDefault(p.getId(), 0));
        for (Producto p : prods) assertThat(stockActual(p)).isEqualTo(STOCK);
    }

    @Test
    @DisplayName("marcarFallidoCancelaLosTresPendientesYLiberaGrupoExactoUnaVez")
    void marcarFallidoCancelaLosTresPendientesYLiberaGrupoExactoUnaVez() {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        jdbcTemplate.update("UPDATE hot_click_pedido_tb SET estado_pedido = 'PENDIENTE_APROBACION' WHERE id_pedido = ?",
            g.pedidos().get(2).getId());

        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            paymentFailureHandler.marcarFallido(pagoDe(g), "rechazado");
        });
        new TransactionTemplate(txManager).executeWithoutResult(s -> {
            paymentFailureHandler.marcarFallido(pagoDe(g), "rechazado"); // repetido: no libera otra vez
        });

        for (Pedido p : g.pedidos()) assertThat(estadoPedido(p.getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pagoDe(g).getEstadoPago()).isEqualTo(Constants.PAGO_FALLIDO);
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA);
    }

    @Test
    @DisplayName("gruposCruzadosTtlVsFallidoVsLiberacionSinDeadlockNiOptimisticLock")
    void gruposCruzadosTtlVsFallidoVsLiberacionSinDeadlockNiOptimisticLock() throws Exception {
        for (int ronda = 0; ronda < 6; ronda++) {
            List<Producto> prods = productos(6);
            Grupo a = grupo(prods, new int[][][]{{{5, 1}, {3, 1}}, {{3, 2}, {1, 1}}, {{5, 2}, {0, 1}}});
            Grupo b = grupo(prods, new int[][][]{{{3, 1}, {5, 1}}, {{5, 3}, {1, 2}}, {{3, 1}, {2, 1}}});
            Grupo c = grupo(prods, new int[][][]{{{5, 1}, {3, 2}}, {{1, 1}, {3, 1}}});
            intencion(c);
            List<Throwable> errores = correrJuntos(List.of(
                () -> pagoExpiradoCancelador.cancelar(pagoDe(a).getId()),
                () -> { new TransactionTemplate(txManager).executeWithoutResult(s ->
                    paymentFailureHandler.marcarFallido(pagoDe(b), "rechazado")); return null; },
                () -> capturar(c)));
            assertThat(errores).as("ronda %d", ronda).containsOnlyNulls();
            for (Producto p : prods) assertThat(reservado(p)).as("ronda %d producto %d", ronda, p.getId()).isEqualTo(EXTRA);
            for (Producto p : prods) assertThat(stockActual(p)).isEqualTo(STOCK);
        }
    }

    // ── Caminos migrados: cancelación de pedido, rollback de checkout, sobreventa, tienda vencida ──────────

    /** Grupo sin Pago (pedido de tienda/manual o checkout que aún no creó el pago). */
    private void sinPago(Grupo g) {
        jdbcTemplate.update("DELETE FROM hot_click_pago_tb WHERE fk_id_pedido IN "
            + "(SELECT id_pedido FROM hot_click_pedido_tb WHERE grupo_pago = ?)", g.principal().getGrupoPago());
    }

    private static final int[][][] CRUZ_A = {{{5, 1}, {3, 1}}, {{3, 2}, {1, 1}}, {{5, 2}, {0, 1}}};
    private static final int[][][] CRUZ_B = {{{3, 1}, {5, 1}}, {{5, 3}, {1, 2}}, {{3, 1}, {2, 1}}};

    @Test
    @DisplayName("panelCancelarSinPagoLiberaSoloEsePedidoYNoDeadlockeaContraLiberacionNueva")
    void panelCancelarSinPagoLiberaSoloEsePedidoYNoDeadlockeaContraLiberacionNueva() throws Exception {
        for (int ronda = 0; ronda < 6; ronda++) {
            List<Producto> prods = productos(6);
            Grupo a = grupo(prods, CRUZ_A);
            Grupo b = grupo(prods, CRUZ_B);
            sinPago(a);
            intencion(b);
            Long unico = a.pedidos().get(0).getId();
            List<Throwable> errores = correrJuntos(List.of(
                () -> { pedidoService.cambiarEstado(unico, Constants.PEDIDO_CANCELADO, null); return null; },
                () -> capturar(b)));
            assertThat(errores).as("ronda %d", ronda).containsOnlyNulls();
            // Solo ESE pedido de A se cancela y libera; los otros dos de A siguen pendientes con su reserva.
            assertThat(estadoPedido(unico)).isEqualTo(Constants.PEDIDO_CANCELADO);
            assertThat(estadoPedido(a.pedidos().get(1).getId())).isEqualTo(Constants.PEDIDO_PENDIENTE);
            assertThat(estadoPedido(a.pedidos().get(2).getId())).isEqualTo(Constants.PEDIDO_PENDIENTE);
            Map<Long, Integer> restoA = new HashMap<>();
            for (int[][] ped : new int[][][]{CRUZ_A[1], CRUZ_A[2]}) {
                for (int[] l : ped) restoA.merge(prods.get(l[0]).getId(), l[1], Integer::sum);
            }
            for (Producto p : prods) assertThat(reservado(p)).as("ronda %d producto %d", ronda, p.getId())
                .isEqualTo(EXTRA + restoA.getOrDefault(p.getId(), 0));
            assertLiberado(b, prods, mapaReservado(prods, restoA));
        }
    }

    private Map<Long, Integer> mapaReservado(List<Producto> prods, Map<Long, Integer> extra) {
        Map<Long, Integer> m = new HashMap<>();
        for (Producto p : prods) m.put(p.getId(), EXTRA + extra.getOrDefault(p.getId(), 0));
        return m;
    }

    @Test
    @DisplayName("rollbackDeCheckoutLiberaPedidoPorCaminoSeguroSinDeadlockContraLiberacionNueva")
    void rollbackDeCheckoutLiberaPedidoPorCaminoSeguroSinDeadlockContraLiberacionNueva() throws Exception {
        for (int ronda = 0; ronda < 6; ronda++) {
            List<Producto> prods = productos(6);
            Grupo a = grupo(prods, CRUZ_A);
            Grupo b = grupo(prods, CRUZ_B);
            sinPago(a);
            intencion(b);
            List<Throwable> errores = correrJuntos(List.of(
                () -> { for (Pedido p : a.pedidos()) paymentService.liberarReservas(pedidoRepository.findById(p.getId()).orElseThrow()); return null; },
                () -> capturar(b)));
            assertThat(errores).as("ronda %d", ronda).containsOnlyNulls();
            for (Producto p : prods) assertThat(reservado(p)).as("ronda %d producto %d", ronda, p.getId()).isEqualTo(EXTRA);
            assertThat(pedidosConReserva(a)).isZero();
            // Idempotente: repetir no vuelve a liberar.
            for (Pedido p : a.pedidos()) paymentService.liberarReservas(pedidoRepository.findById(p.getId()).orElseThrow());
            for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA);
        }
    }

    @Test
    @DisplayName("sobreventaLiberaGrupoUnaVezYNoDeadlockeaContraLiberacionNueva")
    void sobreventaLiberaGrupoUnaVezYNoDeadlockeaContraLiberacionNueva() throws Exception {
        for (int ronda = 0; ronda < 6; ronda++) {
            List<Producto> prods = productos(6);
            Grupo a = grupo(prods, CRUZ_A);
            Grupo b = grupo(prods, CRUZ_B);
            // Al producto 5 le falta stock para confirmar A: el cobro cae en sobreventa (pedidos a revisión).
            jdbcTemplate.update("UPDATE hot_click_producto_tb SET stock_actual = 1 WHERE id_producto = ?", prods.get(5).getId());
            intencion(b);
            List<Captura> resultados = new ArrayList<>();
            List<Throwable> errores = correrJuntos(List.of(
                () -> { Captura c = capturar(a); synchronized (resultados) { resultados.add(c); } return c; },
                () -> capturar(b)));
            assertThat(errores).as("ronda %d", ronda).containsOnlyNulls();
            assertThat(resultados).containsExactly(Captura.COBRADO_SOBREVENTA);
            for (Pedido p : a.pedidos()) assertThat(estadoPedido(p.getId())).isEqualTo(Constants.PEDIDO_REVISION_SOBREVENTA);
            assertThat(pagoDe(a).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
            assertThat(pedidosConReserva(a)).isZero();
            for (Producto p : prods) assertThat(reservado(p)).as("ronda %d producto %d", ronda, p.getId()).isEqualTo(EXTRA);
            assertLiberado(b, prods, extraEsperado(prods));
            assertThat(stockActual(prods.get(5))).isEqualTo(1);
        }
    }

    @Test
    @DisplayName("tiendaVencidaCancelaSoloPendientesVencidosEnLoteYNoDeadlockeaContraLiberacionNueva")
    void tiendaVencidaCancelaSoloPendientesVencidosEnLoteYNoDeadlockeaContraLiberacionNueva() throws Exception {
        for (int ronda = 0; ronda < 6; ronda++) {
            List<Producto> prods = productos(6);
            Grupo a = grupo(prods, CRUZ_A);
            Grupo b = grupo(prods, CRUZ_B);
            sinPago(a);
            jdbcTemplate.update("UPDATE hot_click_pedido_tb SET metodo_pago = 'SINPE_MOVIL', metodo_envio = 'RETIRO', fecha_pedido = ? WHERE grupo_pago = ?",
                java.sql.Timestamp.valueOf(LocalDateTime.now(Constants.ZONA_CR).minusHours(500)), a.principal().getGrupoPago());
            // El 3.er pedido de A ya fue pagado por otro camino: no es PENDIENTE, no se toca.
            Long pagado = a.pedidos().get(2).getId();
            jdbcTemplate.update("UPDATE hot_click_pedido_tb SET estado_pedido = 'PAGADO' WHERE id_pedido = ?", pagado);
            intencion(b);
            List<Throwable> errores = correrJuntos(List.of(
                () -> reservaTiendaVencidaService.ejecutar(LocalDateTime.now(Constants.ZONA_CR)),
                () -> capturar(b)));
            assertThat(errores).as("ronda %d", ronda).containsOnlyNulls();
            assertThat(estadoPedido(a.pedidos().get(0).getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
            assertThat(estadoPedido(a.pedidos().get(1).getId())).isEqualTo(Constants.PEDIDO_CANCELADO);
            assertThat(estadoPedido(pagado)).isEqualTo(Constants.PEDIDO_PAGADO);
            // Del 3.er pedido de A (PAGADO por fuera) queda su reserva intacta.
            Map<Long, Integer> resto = new HashMap<>();
            for (int[] l : CRUZ_A[2]) resto.merge(prods.get(l[0]).getId(), l[1], Integer::sum);
            for (Producto p : prods) assertThat(reservado(p)).as("ronda %d producto %d", ronda, p.getId())
                .isEqualTo(EXTRA + resto.getOrDefault(p.getId(), 0));
            assertLiberado(b, prods, mapaReservado(prods, resto));
            // Idempotente: otra corrida no libera de nuevo.
            reservaTiendaVencidaService.ejecutar(LocalDateTime.now(Constants.ZONA_CR));
            for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA + resto.getOrDefault(p.getId(), 0));
        }
    }

    @Test
    @DisplayName("lockTimeoutEnRollbackDeCheckoutRevierteYReintentoLibera")
    void lockTimeoutEnRollbackDeCheckoutRevierteYReintentoLibera() throws Exception {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        sinPago(g);
        Pedido uno = g.pedidos().get(0);
        Future<?> futuro;
        try (Connection retenedor = conexionAparte(); Statement st = retenedor.createStatement()) {
            st.executeQuery("SELECT 1 FROM hot_click_pedido_tb WHERE id_pedido = " + uno.getId() + " FOR UPDATE").close();
            futuro = hilos.submit(() -> paymentService.liberarReservas(pedidoRepository.findById(uno.getId()).orElseThrow()));
            Throwable error = causaHasta(futuro, (lockTimeoutMs + 4000) / 1000 + 2);
            assertThat(esLockTimeout(error)).as("55P03 en rollback de checkout, no espera indefinida: %s", error).isTrue();
            retenedor.rollback();
        }
        assertThat(pedidosConReserva(g)).isEqualTo(g.pedidos().size());
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(EXTRA + g.cantidades().getOrDefault(p.getId(), 0));
        paymentService.liberarReservas(pedidoRepository.findById(uno.getId()).orElseThrow());
        assertThat(pedidoRepository.findById(uno.getId()).orElseThrow().getStockReservadoEn()).isNull();
        paymentService.liberarReservas(pedidoRepository.findById(uno.getId()).orElseThrow()); // idempotente
    }

    @Test
    @DisplayName("lockTimeoutEnPanelCancelarSinPagoRevierteYReintentoCancela")
    void lockTimeoutEnPanelCancelarSinPagoRevierteYReintentoCancela() throws Exception {
        List<Producto> prods = productos(4);
        Grupo g = grupo(prods, TRES_POR_TRES);
        sinPago(g);
        Long unico = g.pedidos().get(0).getId();
        Map<Long, Integer> reservadoAntes = new HashMap<>();
        for (Producto p : prods) reservadoAntes.put(p.getId(), reservado(p));
        Future<?> futuro;
        try (Connection retenedor = conexionAparte(); Statement st = retenedor.createStatement()) {
            st.executeQuery("SELECT 1 FROM hot_click_pedido_tb WHERE id_pedido = " + unico + " FOR UPDATE").close();
            futuro = hilos.submit(() -> { pedidoService.cambiarEstado(unico, Constants.PEDIDO_CANCELADO, null); return null; });
            Throwable error = causaHasta(futuro, (lockTimeoutMs + 4000) / 1000 + 2);
            assertThat(esLockTimeout(error)).as("55P03 en cancelación de panel, no espera indefinida: %s", error).isTrue();
            retenedor.rollback();
        }
        assertThat(estadoPedido(unico)).isEqualTo(Constants.PEDIDO_PENDIENTE);
        for (Producto p : prods) assertThat(reservado(p)).isEqualTo(reservadoAntes.get(p.getId()));
        pedidoService.cambiarEstado(unico, Constants.PEDIDO_CANCELADO, null);
        assertThat(estadoPedido(unico)).isEqualTo(Constants.PEDIDO_CANCELADO);
        assertThat(pedidoRepository.findById(unico).orElseThrow().getStockReservadoEn()).isNull();
    }

    private static Throwable causaHasta(Future<?> f, long segundos) throws Exception {
        try {
            f.get(segundos, TimeUnit.SECONDS);
            return null;
        } catch (java.util.concurrent.TimeoutException e) {
            return e;
        } catch (ExecutionException e) {
            return e.getCause();
        }
    }
}
