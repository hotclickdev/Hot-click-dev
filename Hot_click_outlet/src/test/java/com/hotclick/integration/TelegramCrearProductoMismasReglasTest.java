package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import com.hotclick.service.producto.ProductoApprovalService;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Alta de producto por Telegram (TelegramFlujoService.crearProductoTx): mismo pipeline que el panel
 * (moderación, campos solo-admin y reglas de publicación en una sola transacción).
 */
@DisplayName("[BAJO] Telegram: el alta de producto pasa por ProductoAltaService.crearYPublicar")
class TelegramCrearProductoMismasReglasTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @MockitoSpyBean private ProductoApprovalService productoApprovalService;
    @Autowired private com.hotclick.service.TelegramFlujoService telegramFlujoService;

    private Categoria categoria;
    private Empresa   aprobada;
    private Empresa   pendiente;
    private Bodega    bodegaAprobada;
    private Bodega    bodegaPendiente;
    private String    tokenAprobada;
    private String    tokenPendiente;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Tg");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        aprobada  = crearEmpresa("Tg Aprobada", "tg-aprobada", "tg-ap@test.cr", "ACTIVO", true);
        pendiente = crearEmpresa("Tg Pendiente", "tg-pendiente", "tg-pe@test.cr", "PENDIENTE_APROBACION", false);
        bodegaAprobada  = crearBodega("Bodega Tg A", aprobada);
        bodegaPendiente = crearBodega("Bodega Tg P", pendiente);
        tokenAprobada  = tokenEmprendedor("tg-emp-a@test.cr", rolEmp, aprobada);
        tokenPendiente = tokenEmprendedor("tg-emp-p@test.cr", rolEmp, pendiente);
    }

    @AfterEach
    void tearDown() {
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private com.hotclick.dto.TelegramFlujoEstado.ProductoBorrador borrador(String nombre) {
        var d = new com.hotclick.dto.TelegramFlujoEstado.ProductoBorrador();
        d.setNom(nombre);
        d.setDesc("Descripción de prueba");
        d.setPv(12000);
        d.setPc(8000);
        d.setStk(3);
        d.setCat(categoria.getId());
        return d;
    }

    private long contar(String nombre) {
        return productoRepository.findAll().stream().filter(p -> nombre.equals(p.getNombreProducto())).count();
    }

    @Test
    @DisplayName("Texto no permitido: no se crea el producto (moderación en el mismo pipeline)")
    void textoNoPermitido_noCreaProducto() {
        assertThrows(RuntimeException.class,
            () -> telegramFlujoService.crearProductoTx(borrador("Video porno xxx"), aprobada.getId(), adminUser));

        assertEquals(0, contar("Video porno xxx"));
    }

    @Test
    @DisplayName("Si fallan las reglas de publicación no queda producto (atómico)")
    void falloReglas_noDejaProducto() {
        doThrow(new IllegalStateException("fallo simulado en las reglas de publicación"))
            .when(productoApprovalService).aplicarReglasPublicacion(any(), any());

        assertThrows(RuntimeException.class,
            () -> telegramFlujoService.crearProductoTx(borrador("Tg Atomico"), pendiente.getId(), adminUser));

        assertEquals(0, contar("Tg Atomico"));
    }

    @Test
    @DisplayName("Camino normal: pasa por aplicarReglasPublicacion; negocio aprobado publica, pendiente no")
    void caminoNormal_aplicaReglasDePublicacion() {
        telegramFlujoService.crearProductoTx(borrador("Tg Aprobada"), aprobada.getId(), adminUser);
        telegramFlujoService.crearProductoTx(borrador("Tg Pendiente"), pendiente.getId(), adminUser);

        org.mockito.Mockito.verify(productoApprovalService, org.mockito.Mockito.times(2))
            .aplicarReglasPublicacion(any(), any());
        assertTrue(Boolean.TRUE.equals(productoPorNombre("Tg Aprobada").getVisibleCatalogo()));
        assertNotEquals(Boolean.TRUE, productoPorNombre("Tg Pendiente").getVisibleCatalogo());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private org.springframework.test.web.servlet.ResultActions bulk(String token, String json) throws Exception {
        return mockMvc.perform(post("/api/productos/bulk")
            .header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON)
            .content(json));
    }

    private String cuerpo(String nombre, String sku, Bodega bodega, String extra) {
        return String.format(
            "{\"nombreProducto\":\"%s\",\"sku\":\"%s\",\"precioVenta\":12000,\"precioCompra\":8000," +
            "\"stockActual\":3,\"stockMinimo\":1,\"categoriaId\":%d,\"bodegaId\":%d%s}",
            nombre, sku, categoria.getId(), bodega.getId(), extra);
    }

    /** El SKU lo reasigna el sistema al crear: se busca por nombre del producto. */
    private Producto productoPorNombre(String nombre) {
        return productoRepository.findAll().stream()
            .filter(p -> nombre.equals(p.getNombreProducto())).findFirst()
            .orElseThrow(() -> new AssertionError("No se creó el producto " + nombre));
    }

    private String tokenEmprendedor(String correo, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, "Emp Bulk", rol);
        u.setEmpresa(empresa);
        usuarioRepository.saveAndFlush(u);
        return tokenPara(u, Constants.ROL_EMPRENDEDOR);
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo, String estado, boolean visible) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(visible);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega crearBodega(String nombre, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }
}
