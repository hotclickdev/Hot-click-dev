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
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguimiento de Seguridad: ni el alta individual (400) ni el import por fila (data.errores) devuelven el texto
 * de una excepción interna (SQL, tablas). Las validaciones propias y el aviso de moderación sí se muestran.
 */
@DisplayName("[Seguridad] Mensajes públicos en alta individual e import por fila")
class MensajesPublicosAltaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @MockitoSpyBean private ProductoApprovalService productoApprovalService;
    @MockitoSpyBean private com.hotclick.service.producto.ProductoAltaService productoAltaService;

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
            c.setNombreCategoria("Test-Cat-Mp");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        aprobada  = crearEmpresa("Mp Aprobada", "mp-aprobada", "mp-ap@test.cr", "ACTIVO", true);
        pendiente = crearEmpresa("Mp Pendiente", "mp-pendiente", "mp-pe@test.cr", "PENDIENTE_APROBACION", false);
        bodegaAprobada  = crearBodega("Bodega Mp A", aprobada);
        bodegaPendiente = crearBodega("Bodega Mp P", pendiente);
        tokenAprobada  = tokenEmprendedor("mp-emp-a@test.cr", rolEmp, aprobada);
        tokenPendiente = tokenEmprendedor("mp-emp-p@test.cr", rolEmp, pendiente);
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

    private static final String SQL_INTERNO = "could not execute statement [SELECT * FROM hot_click_secreto] SQL [x]";

    private String cuerpo(String nombre, Bodega bodega) {
        return String.format(
            "{\"nombreProducto\":\"%s\",\"precioVenta\":12000,\"precioCompra\":8000,\"stockActual\":3," +
            "\"stockMinimo\":1,\"categoriaId\":%d,\"bodegaId\":%d}", nombre, categoria.getId(), bodega.getId());
    }

    private String crear(String nombre) throws Exception {
        return mockMvc.perform(post("/api/productos").header("Authorization", tokenAprobada)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo(nombre, bodegaAprobada)))
            .andExpect(status().isBadRequest())
            .andReturn().getResponse().getContentAsString();
    }

    private String importar(String nombre) throws Exception {
        return mockMvc.perform(post("/api/admin/importar/confirmar").header("Authorization", tokenAprobada)
                .contentType(MediaType.APPLICATION_JSON).content("[" + cuerpo(nombre, bodegaAprobada) + "]"))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
    }

    /**
     * Lanza la excepción ya construida: conserva su traza (el sitio del throw es este test, código com.hotclick).
     * Con doThrow(new ...) Mockito la regenera y el primer frame queda en Spring AOP, algo que no pasa con
     * un throw real de producción.
     */
    private static org.mockito.stubbing.Answer<Object> lanzar(RuntimeException e) {
        return inv -> { throw e; };
    }

    @Test
    @DisplayName("Alta individual: una excepción interna (SQL) responde 400 genérico, sin el texto interno")
    void alta_errorInterno_noFiltra() throws Exception {
        doThrow(new org.springframework.dao.DataIntegrityViolationException(SQL_INTERNO))
            .when(productoAltaService).crearYPublicar(any(), any(), any());

        String body = crear("Mp Alta Interno");

        assertFalse(body.contains("hot_click_secreto") || body.toLowerCase().contains("sql"), body);
        assertTrue(body.contains(com.hotclick.utils.ErrorPublico.GENERICO), body);
    }

    @Test
    @DisplayName("Alta individual: una validación propia sí se muestra")
    void alta_validacionPropia_seMuestra() throws Exception {
        doAnswer(lanzar(new IllegalArgumentException("El precio de venta es inválido")))
            .when(productoAltaService).crearYPublicar(any(), any(), any());

        assertTrue(crear("Mp Alta Validacion").contains("El precio de venta es inválido"));
    }

    @Test
    @DisplayName("Alta individual: el aviso de moderación sí se muestra")
    void alta_moderacion_seMuestra() throws Exception {
        String body = crear("Video porno xxx");

        assertFalse(body.contains(com.hotclick.utils.ErrorPublico.GENERICO), body);
        assertEquals(0, productoRepository.findAll().stream()
            .filter(p -> "Video porno xxx".equals(p.getNombreProducto())).count());
    }

    @Test
    @DisplayName("Import por fila: una excepción interna deja el nombre del producto y un mensaje genérico")
    void import_filaConErrorInterno_noFiltra() throws Exception {
        doThrow(new RuntimeException(SQL_INTERNO))
            .when(productoAltaService).crearYPublicar(any(), any(), any());

        String body = importar("Mp Import Interno");

        assertFalse(body.contains("hot_click_secreto") || body.toLowerCase().contains("sql"), body);
        assertTrue(body.contains("Mp Import Interno: " + com.hotclick.utils.ErrorPublico.GENERICO), body);
    }

    @Test
    @DisplayName("Import por fila: una validación propia se muestra con el nombre del producto")
    void import_filaConValidacionPropia_seMuestra() throws Exception {
        doAnswer(lanzar(new IllegalArgumentException("El precio de venta es inválido")))
            .when(productoAltaService).crearYPublicar(any(), any(), any());

        assertTrue(importar("Mp Import Validacion").contains("Mp Import Validacion: El precio de venta es inválido"));
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
