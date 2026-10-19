package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.TelegramService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Las referencias que acompañan a una venta (cliente y carrito) deben pertenecer al negocio
 * de la sesión. Un rechazo no deja efectos (stock, carrito, pedidos, avisos) y el mensaje es
 * el mismo exista o no la referencia.
 */
@DisplayName("Venta | referencias acotadas al negocio de la sesión")
class VentaReferenciasNegocioTest extends BaseIntegrationTest {

    private static final long ID_INEXISTENTE = 987_654_321L;

    @MockitoBean private TelegramService telegramService;
    @MockitoBean private TelegramNotificacionClienteService telegramClienteService;

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private CarritoRepository carritoRepository;
    @Autowired private MovimientoStockRepository movimientoStockRepository;

    private Empresa empA, empB;
    private Producto prodA, prodB;
    private Bodega bodB;
    private Categoria categoria;
    private Rol rolUser;
    private String tokenB;

    @BeforeEach
    void setUp() {
        empA = empresa("Ref A", "ref-a");
        empB = empresa("Ref B", "ref-b");
        categoria = new Categoria();
        categoria.setNombreCategoria("Cat-Ref");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);
        Bodega bodA = bodega(empA);
        bodB = bodega(empB);
        prodA = producto(empA, bodA, "REF-A");
        prodB = producto(empB, bodB, "REF-B");
        rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario vend = crearUsuario("ref-vend-b@test.cr", "Vend B", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        tokenB = "Bearer " + jwtUtil.generateToken(vend.getCorreo(), vend.getId(),
            Constants.ROL_EMPRENDEDOR, empB.getId(), empB.getSlug());
    }

    @AfterEach
    void tearDown() {
        carritoRepository.deleteAll();
        pedidoRepository.deleteAll();
        movimientoStockRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.delete(categoria);
        usuarioRepository.findAll().forEach(u -> {
            u.setEmpresaRegistro(null);
            u.setEmpresa(null);
            usuarioRepository.save(u);
        });
        empresaRepository.deleteAll();
    }

    // ── Cliente ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("cliente de otro negocio: rechazo uniforme sin efectos")
    void clienteAjenoRechazado() throws Exception {
        Usuario ajeno = cliente("ref-cli-a@test.cr");
        ajeno.setEmpresaRegistro(empA);
        ajeno = usuarioRepository.saveAndFlush(ajeno);
        Estado antes = estado();

        MvcResult r = enviar(ajeno.getId(), null);

        assertThat(r.getResponse().getStatus()).isEqualTo(400);
        assertThat(r.getResponse().getContentAsString()).contains("Cliente no encontrado");
        assertSinEfectos(antes);
    }

    @Test
    @DisplayName("cliente inexistente y ajeno: misma respuesta")
    void clienteInexistenteIgualQueAjeno() throws Exception {
        Usuario ajeno = cliente("ref-cli-a2@test.cr");
        ajeno.setEmpresaRegistro(empA);
        ajeno = usuarioRepository.saveAndFlush(ajeno);
        Estado antes = estado();

        MvcResult rAjeno = enviar(ajeno.getId(), null);
        MvcResult rNoExiste = enviar(ID_INEXISTENTE, null);

        assertThat(rNoExiste.getResponse().getStatus()).isEqualTo(rAjeno.getResponse().getStatus());
        assertThat(sinMarcaDeTiempo(rNoExiste)).isEqualTo(sinMarcaDeTiempo(rAjeno));
        assertThat(rNoExiste.getResponse().getStatus()).isEqualTo(400);
        assertSinEfectos(antes);
    }

    @Test
    @DisplayName("cliente sin vínculo con el negocio: rechazo")
    void clienteSinVinculoRechazado() throws Exception {
        Usuario global = usuarioRepository.saveAndFlush(cliente("ref-cli-global@test.cr"));
        Estado antes = estado();

        MvcResult r = enviar(global.getId(), null);

        assertThat(r.getResponse().getStatus()).isEqualTo(400);
        assertSinEfectos(antes);
    }

    @Test
    @DisplayName("cliente con pedido previo en el negocio: venta ok")
    void clienteConPedidoPrevioOk() throws Exception {
        Usuario comprador = usuarioRepository.saveAndFlush(cliente("ref-cli-previo@test.cr"));
        pedidoPrevio(comprador);

        assertThat(enviar(comprador.getId(), null).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("cliente registrado por el negocio: venta ok")
    void clienteRegistradoPorElNegocioOk() throws Exception {
        Usuario registrado = cliente("ref-cli-crm@test.cr");
        registrado.setEmpresaRegistro(empB);
        registrado = usuarioRepository.saveAndFlush(registrado);

        assertThat(enviar(registrado.getId(), null).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("cuenta del propio negocio: venta ok")
    void cuentaDelNegocioOk() throws Exception {
        Usuario propia = cliente("ref-cli-cuenta@test.cr");
        propia.setEmpresa(empB);
        propia = usuarioRepository.saveAndFlush(propia);

        assertThat(enviar(propia.getId(), null).getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("venta sin cliente y venta rapida: ok")
    void ventaSinClienteOk() throws Exception {
        assertThat(enviar(null, null).getResponse().getStatus()).isEqualTo(200);
        assertThat(enviar(null, null, "Venta rápida").getResponse().getStatus()).isEqualTo(200);
    }

    // ── Carrito ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("carrito de otro negocio: rechazo y el carrito queda intacto")
    void carritoAjenoRechazado() throws Exception {
        prodA.setStockReservado(2);
        prodA = productoRepository.saveAndFlush(prodA);
        Carrito ajeno = carrito(empA, prodA, 2);
        Estado antes = estado();

        MvcResult r = enviar(null, ajeno.getId());

        assertThat(r.getResponse().getStatus()).isEqualTo(400);
        assertThat(r.getResponse().getContentAsString()).contains("Carrito no encontrado");
        assertSinEfectos(antes);
        Carrito despues = carritoRepository.findById(ajeno.getId()).orElseThrow();
        assertThat(despues.getEstadoCarrito()).isEqualTo(Constants.CARRITO_ACTIVO);
        Integer items = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM hot_click_carrito_item_tb WHERE fk_id_carrito = ?", Integer.class, ajeno.getId());
        assertThat(items).isEqualTo(1);
    }

    @Test
    @DisplayName("carrito inexistente: rechazo")
    void carritoInexistenteRechazado() throws Exception {
        Estado antes = estado();

        MvcResult r = enviar(null, ID_INEXISTENTE);

        assertThat(r.getResponse().getStatus()).isEqualTo(400);
        assertSinEfectos(antes);
    }

    @Test
    @DisplayName("carrito ya convertido del propio negocio: rechazo")
    void carritoConvertidoRechazado() throws Exception {
        Carrito propio = carrito(empB, prodB, 1);
        propio.setEstadoCarrito(Constants.CARRITO_CONVERTIDO);
        propio = carritoRepository.saveAndFlush(propio);
        Estado antes = estado();

        MvcResult r = enviar(null, propio.getId());

        assertThat(r.getResponse().getStatus()).isEqualTo(400);
        assertSinEfectos(antes);
    }

    @Test
    @DisplayName("carrito propio activo: venta ok, carrito convertido y reserva liberada")
    void carritoPropioActivoOk() throws Exception {
        prodB.setStockReservado(1);
        prodB = productoRepository.saveAndFlush(prodB);
        Carrito propio = carrito(empB, prodB, 1);

        MvcResult r = enviar(null, propio.getId());

        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        Carrito despues = carritoRepository.findById(propio.getId()).orElseThrow();
        assertThat(despues.getEstadoCarrito()).isEqualTo(Constants.CARRITO_CONVERTIDO);
        Producto p = productoRepository.findById(prodB.getId()).orElseThrow();
        assertThat(p.getStockReservado()).isZero();
        assertThat(p.getStockActual()).isEqualTo(4);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private record Estado(long pedidos, long movimientos, int actualA, int reservadoA, int actualB, int reservadoB) { }

    private Estado estado() {
        Producto a = productoRepository.findById(prodA.getId()).orElseThrow();
        Producto b = productoRepository.findById(prodB.getId()).orElseThrow();
        return new Estado(pedidoRepository.count(), movimientoStockRepository.count(),
            a.getStockActual(), a.getStockReservado(), b.getStockActual(), b.getStockReservado());
    }

    private void assertSinEfectos(Estado antes) {
        assertThat(estado()).isEqualTo(antes);
        verifyNoInteractions(telegramService, telegramClienteService);
    }

    private MvcResult enviar(Long clienteId, Long carritoId) throws Exception {
        return enviar(clienteId, carritoId, null);
    }

    private MvcResult enviar(Long clienteId, Long carritoId, String nombre) throws Exception {
        StringBuilder sb = new StringBuilder("{\"metodoPago\":\"EFECTIVO\",\"items\":[{\"productoId\":")
            .append(prodB.getId()).append(",\"cantidad\":1}]");
        if (clienteId != null) sb.append(",\"clienteId\":").append(clienteId);
        if (carritoId != null) sb.append(",\"carritoId\":").append(carritoId);
        if (nombre != null) sb.append(",\"nombreCliente\":\"").append(nombre).append('"');
        sb.append('}');
        return mockMvc.perform(post("/api/ventas").header("Authorization", tokenB)
            .contentType(MediaType.APPLICATION_JSON).content(sb.toString())).andReturn();
    }

    private static String sinMarcaDeTiempo(MvcResult r) throws Exception {
        return r.getResponse().getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", "");
    }

    private Usuario cliente(String correo) {
        return crearUsuario(correo, "Cliente", rolUser);
    }

    private Carrito carrito(Empresa e, Producto p, int cantidad) {
        Carrito c = new Carrito();
        c.setEmpresa(e);
        c.setUsuarioFinal(testUser);
        c.setEstadoCarrito(Constants.CARRITO_ACTIVO);
        c.setFechaCreacion(LocalDateTime.now());
        c.setTotalCarrito(p.getPrecioVenta() * cantidad);
        CarritoItem it = new CarritoItem();
        it.setCarrito(c);
        it.setProducto(p);
        it.setCantidad(cantidad);
        it.setPrecioUnitarioMomento(p.getPrecioVenta());
        c.getItems().add(it);
        return carritoRepository.saveAndFlush(c);
    }

    private void pedidoPrevio(Usuario comprador) {
        Pedido p = new Pedido();
        p.setNumeroPedido("REF-PREVIO-1");
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
        p.setUsuarioFinal(comprador);
        p.setBodega(bodB);
        p.setEmpresa(empB);
        p.setSubtotal(1000);
        p.setTotalPedido(1000);
        p.setCostoTotalProductos(500);
        p.setUtilidadBruta(500);
        p.setMetodoPago("EFECTIVO");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        pedidoRepository.saveAndFlush(p);
    }

    private Empresa empresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setNombreComercial(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega bodega(Empresa e) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + e.getSlug());
        b.setDireccionExacta("Calle 1");
        b.setTelefono("22223333");
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Producto producto(Empresa e, Bodega b, String sku) {
        Producto p = new Producto();
        p.setNombreProducto("Prod " + sku);
        p.setDescripcionCorta("x");
        p.setSku(sku);
        p.setPrecioVenta(5000);
        p.setPrecioCompra(2000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(e);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
