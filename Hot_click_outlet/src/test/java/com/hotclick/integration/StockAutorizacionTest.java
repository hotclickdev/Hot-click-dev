package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.StockService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * SEC-02 — /api/stock/** no tenía control de rol ni de empresa: cualquier cuenta con sesión
 * leía el historial (con el correo del operador) y ajustaba el stock de cualquier producto.
 *
 * Ahora: solo ADMIN o el EMPRENDEDOR dueño; otra empresa e id inexistente → 404 idénticos;
 * el correo del operador va enmascarado salvo para ADMIN.
 */
@DisplayName("[SEGURIDAD] SEC-02 — /api/stock/** con rol y aislamiento por empresa")
class StockAutorizacionTest extends BaseIntegrationTest {

    private static final String CORREO_DUENIO = "duenia-stock@test.cr";
    private static final String CORREO_DUENIO_MASCARA = "d***@test.cr";
    private static final String AJUSTE = "{\"cantidad\":1,\"notas\":\"prueba SEC-02\"}";

    @Autowired private EmpresaRepository         empresaRepository;
    @Autowired private ProductoRepository        productoRepository;
    @Autowired private CategoriaRepository       categoriaRepository;
    @Autowired private BodegaRepository          bodegaRepository;
    @Autowired private MovimientoStockRepository movimientoStockRepository;
    @Autowired private StockService              stockService;

    private Producto productoA;
    private String tokenDuenioA;
    private String tokenVendedorB;

    @BeforeEach
    void setUp() {
        Empresa empresaA = crearEmpresa("Stock Alfa", "stock-alfa-" + System.nanoTime());
        Empresa empresaB = crearEmpresa("Stock Beta", "stock-beta-" + System.nanoTime());
        Usuario duenioA = crearEmprendedor(CORREO_DUENIO, empresaA);
        Usuario vendedorB = crearEmprendedor("vendedor-b-stock@test.cr", empresaB);
        tokenDuenioA = tokenPara(duenioA, Constants.ROL_EMPRENDEDOR);
        tokenVendedorB = tokenPara(vendedorB, Constants.ROL_EMPRENDEDOR);

        productoA = crearProducto(empresaA);
        // Movimiento previo hecho por la dueña: deja su correo en el historial.
        stockService.ajustarEntrada(productoA.getId(), 2, "reposición inicial", CORREO_DUENIO);
    }

    @AfterEach
    void tearDown() {
        movimientoStockRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    // ── Ataques del reporte ────────────────────────────────────────────────────

    @Test
    @DisplayName("SEC-02-01 | Comprador: GET historial de producto ajeno → 403, sin datos")
    void comprador_noLeeHistorial() throws Exception {
        mockMvc.perform(get("/api/stock/movimientos/" + productoA.getId())
                .header("Authorization", userToken))
            .andExpect(status().isForbidden())
            .andExpect(content().string(not(containsString(CORREO_DUENIO))))
            .andExpect(content().string(not(containsString("AJUSTE_ENTRADA"))));
    }

    @Test
    @DisplayName("SEC-02-02 | Comprador: POST ajuste-entrada → 403 y el stock no cambia")
    void comprador_noAjustaStock() throws Exception {
        mockMvc.perform(post("/api/stock/ajuste-entrada/" + productoA.getId())
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(AJUSTE))
            .andExpect(status().isForbidden());
        assertStockSinCambios();
    }

    @Test
    @DisplayName("SEC-02-03 | Vendedor de otra empresa: GET historial → 404, sin datos")
    void otraEmpresa_noLeeHistorial() throws Exception {
        mockMvc.perform(get("/api/stock/movimientos/" + productoA.getId())
                .header("Authorization", tokenVendedorB))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Producto no encontrado"))
            .andExpect(content().string(not(containsString("d***"))))
            .andExpect(content().string(not(containsString(CORREO_DUENIO))));
    }

    @Test
    @DisplayName("SEC-02-04 | Vendedor de otra empresa: POST ajuste-entrada → 404 y el stock no cambia")
    void otraEmpresa_noAjustaStock() throws Exception {
        mockMvc.perform(post("/api/stock/ajuste-entrada/" + productoA.getId())
                .header("Authorization", tokenVendedorB)
                .contentType(MediaType.APPLICATION_JSON).content(AJUSTE))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Producto no encontrado"));
        assertStockSinCambios();
    }

    @Test
    @DisplayName("SEC-02-05 | Otra empresa vs id inexistente: misma respuesta (no revela existencia)")
    void ajenoEInexistente_respuestaIdentica() throws Exception {
        String ajeno = mockMvc.perform(get("/api/stock/movimientos/" + productoA.getId())
                .header("Authorization", tokenVendedorB))
            .andExpect(status().isNotFound())
            .andReturn().getResponse().getContentAsString();
        String inexistente = mockMvc.perform(get("/api/stock/movimientos/" + (productoA.getId() + 100_000))
                .header("Authorization", tokenVendedorB))
            .andExpect(status().isNotFound())
            .andReturn().getResponse().getContentAsString();
        assertThat(sinTimestamp(ajeno)).isEqualTo(sinTimestamp(inexistente));
    }

    @Test
    @DisplayName("SEC-02-06 | Sin token → 401")
    void sinToken_401() throws Exception {
        mockMvc.perform(get("/api/stock/movimientos/" + productoA.getId()))
            .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/stock/ajuste-entrada/" + productoA.getId())
                .contentType(MediaType.APPLICATION_JSON).content(AJUSTE))
            .andExpect(status().isUnauthorized());
        assertStockSinCambios();
    }

    // ── Casos legítimos ────────────────────────────────────────────────────────

    @Test
    @DisplayName("SEC-02-07 | Dueña: GET historial → 200 con el correo del operador enmascarado")
    void duenia_leeHistorialConCorreoEnmascarado() throws Exception {
        mockMvc.perform(get("/api/stock/movimientos/" + productoA.getId())
                .header("Authorization", tokenDuenioA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].tipoMovimiento").value(MovimientoStock.AJUSTE_ENTRADA))
            .andExpect(jsonPath("$.data[0].cantidad").value(2))
            .andExpect(jsonPath("$.data[0].operadorCorreo").value(CORREO_DUENIO_MASCARA))
            .andExpect(content().string(not(containsString(CORREO_DUENIO))));
    }

    @Test
    @DisplayName("SEC-02-08 | Dueña: POST ajuste-entrada → 200 y el stock sube")
    void duenia_ajustaStock() throws Exception {
        mockMvc.perform(post("/api/stock/ajuste-entrada/" + productoA.getId())
                .header("Authorization", tokenDuenioA)
                .contentType(MediaType.APPLICATION_JSON).content("{\"cantidad\":3,\"notas\":\"reposición\"}"))
            .andExpect(status().isOk());
        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getStockActual()).isEqualTo(10);
    }

    @Test
    @DisplayName("SEC-02-09 | ADMIN: GET historial de cualquier empresa → 200 con el correo completo")
    void admin_leeHistorialCompleto() throws Exception {
        mockMvc.perform(get("/api/stock/movimientos/" + productoA.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[0].operadorCorreo").value(CORREO_DUENIO));
    }

    @Test
    @DisplayName("SEC-02-10 | ADMIN: POST ajuste-entrada → 200")
    void admin_ajustaStock() throws Exception {
        mockMvc.perform(post("/api/stock/ajuste-entrada/" + productoA.getId())
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content(AJUSTE))
            .andExpect(status().isOk());
        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getStockActual()).isEqualTo(8);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /** Stock inicial 5 + reposición inicial 2 = 7; un solo movimiento. */
    private void assertStockSinCambios() {
        assertThat(productoRepository.findById(productoA.getId()).orElseThrow().getStockActual()).isEqualTo(7);
        assertThat(movimientoStockRepository.findByProductoIdOrderByFechaMovimientoDesc(productoA.getId())).hasSize(1);
    }

    private static String sinTimestamp(String json) {
        return json.replaceAll("\"timestamp\"\\s*:\\s*\"?[^,}\"]*\"?", "");
    }

    private Empresa crearEmpresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearEmprendedor(String correo, Empresa suEmpresa) {
        Usuario u = crearUsuario(correo, "Emp Stock", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setEmpresa(suEmpresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Producto crearProducto(Empresa suEmpresa) {
        Producto p = new Producto();
        p.setNombreProducto("Prod Stock SEC-02");
        p.setSku("SKU-SEC02-" + System.nanoTime());
        p.setPrecioVenta(10000);
        p.setPrecioCompra(6000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(obtenerOCrearCategoria());
        p.setEmpresa(suEmpresa);
        p.setBodega(crearBodega(suEmpresa));
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private Bodega crearBodega(Empresa suEmpresa) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Stock SEC-02");
        b.setDireccionExacta("Calle 1");
        b.setTelefono("61234567");
        b.setProvincia("San José");
        b.setCanton("Escazú");
        b.setPermiteRetiroCliente(false);
        b.setAdminCliente(adminUser);
        b.setEmpresa(suEmpresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Categoria obtenerOCrearCategoria() {
        return categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Stock");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
    }
}
