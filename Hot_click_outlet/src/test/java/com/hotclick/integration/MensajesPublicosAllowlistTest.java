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
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Seguimiento de Seguridad (lista blanca): bulk por fila, archivar/ajustar precios, import (url/pdf/csv/confirmar) y
 * alta individual solo muestran mensajes de excepciones PROPIAS. Un IAE/NumberFormatException de librería o un
 * RuntimeException con texto interno responde genérico. Las validaciones propias siguen viéndose.
 */
@DisplayName("[Seguridad] Lista blanca de mensajes públicos (bulk, archivar/ajustar, import, alta)")
class MensajesPublicosAllowlistTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @MockitoSpyBean private ProductoApprovalService productoApprovalService;
    @MockitoSpyBean private com.hotclick.service.producto.ProductoAltaService productoAltaService;
    @MockitoSpyBean private com.hotclick.service.producto.ProductoBulkOperationsService productoBulkOperationsService;
    @MockitoSpyBean private com.hotclick.service.CatalogoImportService catalogoImportService;
    @MockitoSpyBean private com.hotclick.service.producto.EmpresaDestinoAlta empresaDestinoAlta;
    @MockitoSpyBean private com.hotclick.service.TenantService tenantService;

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
    private static final String TABLA = "tabla_usuarios_clientes";

    /** IAE (NumberFormatException) que lanza el JDK, como el que llegaría de un parseo o de una librería. */
    private static org.mockito.stubbing.Answer<Object> numberFormatDeLibreria() {
        return inv -> Long.parseLong(TABLA);
    }

    private void assertGenerico(String body) {
        assertFalse(body.contains(TABLA) || body.contains("hot_click_secreto") || body.toLowerCase().contains("sql"), body);
        assertTrue(body.contains(com.hotclick.utils.ErrorPublico.GENERICO), body);
    }

    private String bulkUno(String nombre) throws Exception {
        return bulk(tokenAprobada, "[" + cuerpo(nombre, "SKU-AL-1", bodegaAprobada, "") + "]")
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
    }

    @Test
    @DisplayName("Bulk por fila: RuntimeException con SQL no llega en 'Fila N:'")
    void bulk_filaSql_noFiltra() throws Exception {
        doThrow(new RuntimeException(SQL_INTERNO)).when(productoAltaService).crearYPublicar(any(), any(), any());

        String body = bulkUno("Al Bulk Sql");

        assertTrue(body.contains("Fila 1: " + com.hotclick.utils.ErrorPublico.GENERICO), body);
        assertGenerico(body);
    }

    @Test
    @DisplayName("Bulk por fila: un NumberFormatException del JDK no muestra su texto")
    void bulk_filaNumberFormat_noFiltra() throws Exception {
        doAnswer(numberFormatDeLibreria()).when(productoAltaService).crearYPublicar(any(), any(), any());

        assertGenerico(bulkUno("Al Bulk Nfe"));
    }

    @Test
    @DisplayName("Bulk por fila: una validación propia sí se muestra")
    void bulk_filaValidacionPropia_seMuestra() throws Exception {
        doThrow(new IllegalArgumentException("El precio de venta es inválido"))
            .when(productoAltaService).crearYPublicar(any(), any(), any());

        assertTrue(bulkUno("Al Bulk Val").contains("Fila 1: El precio de venta es inválido"));
    }

    @Test
    @DisplayName("Archivar sin stock: el error interno no se devuelve con 'Error: ...'")
    void archivarSinStock_errorInterno_noFiltra() throws Exception {
        doThrow(new RuntimeException(SQL_INTERNO)).when(productoBulkOperationsService).archivarSinStock();

        String body = mockMvc.perform(post("/api/productos/archivar-sin-stock").header("Authorization", tokenAprobada))
            .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();

        assertGenerico(body);
    }

    @Test
    @DisplayName("Ajustar precios: el error interno no se devuelve con 'Error: ...'")
    void ajustarPrecios_errorInterno_noFiltra() throws Exception {
        doThrow(new RuntimeException(SQL_INTERNO)).when(productoBulkOperationsService).ajustarPrecios(anyDouble());

        String body = mockMvc.perform(post("/api/productos/ajustar-precios").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"porcentaje\":5}"))
            .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();

        assertGenerico(body);
    }

    @Test
    @DisplayName("Import /url: un NumberFormatException del JDK responde 400 genérico; una validación propia se ve")
    void importUrl() throws Exception {
        doAnswer(numberFormatDeLibreria()).when(catalogoImportService).extraerDeUrl(any());
        String body = mockMvc.perform(post("/api/admin/importar/url").header("Authorization", tokenAprobada)
                .contentType(MediaType.APPLICATION_JSON).content("{\"url\":\"https://x.test\"}"))
            .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
        assertGenerico(body);

        doThrow(new IllegalArgumentException("La URL no es válida")).when(catalogoImportService).extraerDeUrl(any());
        assertTrue(mockMvc.perform(post("/api/admin/importar/url").header("Authorization", tokenAprobada)
                .contentType(MediaType.APPLICATION_JSON).content("{\"url\":\"https://x.test\"}"))
            .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString()
            .contains("La URL no es válida"));
    }

    @Test
    @DisplayName("Import /pdf y /csv: un NumberFormatException del JDK responde 400 genérico")
    void importPdfCsv() throws Exception {
        doAnswer(numberFormatDeLibreria()).when(catalogoImportService).extraerDePdf(any());
        doAnswer(numberFormatDeLibreria()).when(catalogoImportService).extraerDeCsv(any());
        var archivo = new org.springframework.mock.web.MockMultipartFile("archivo", "a.bin", "application/octet-stream", new byte[]{1});

        for (String ruta : new String[]{"pdf", "csv"}) {
            String body = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                    .multipart("/api/admin/importar/" + ruta).file(archivo).header("Authorization", tokenAprobada))
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
            assertGenerico(body);
        }
    }

    private String confirmar(int estado) throws Exception {
        String item = "{\"nombreProducto\":\"Al Confirmar\",\"categoriaId\":" + categoria.getId() + "}";
        return mockMvc.perform(post("/api/admin/importar/confirmar").header("Authorization", tokenAprobada)
                .contentType(MediaType.APPLICATION_JSON).content("[" + item + "]"))
            .andExpect(status().is(estado)).andReturn().getResponse().getContentAsString();
    }

    @Test
    @DisplayName("Import confirmar 402: PlanLimit con texto interno sale genérico; el mensaje de plan limpio se ve")
    void confirmar402() throws Exception {
        doThrow(new com.hotclick.exception.PlanLimitException(SQL_INTERNO, "PRODUCTO", "PRO"))
            .when(tenantService).verificarLimiteProductosBulk(any(), anyInt());
        assertGenerico(confirmar(402));

        doThrow(new com.hotclick.exception.PlanLimitException("Llegaste al límite de tu plan", "PRODUCTO", "PRO"))
            .when(tenantService).verificarLimiteProductosBulk(any(), anyInt());
        assertTrue(confirmar(402).contains("Llegaste al límite de tu plan"));
    }

    @Test
    @DisplayName("Import confirmar 403: TenantAccessDenied con texto interno sale genérico")
    void confirmar403() throws Exception {
        doThrow(new com.hotclick.exception.TenantAccessDeniedException(SQL_INTERNO))
            .when(empresaDestinoAlta).resolver(any());
        assertGenerico(confirmar(403));
    }

    @Test
    @DisplayName("Import confirmar 400: un NumberFormatException del JDK sale genérico; RecursoNoEncontrado limpio se ve")
    void confirmar400() throws Exception {
        doAnswer(numberFormatDeLibreria()).when(empresaDestinoAlta).resolver(any());
        assertGenerico(confirmar(400));

        doThrow(new com.hotclick.exception.RecursoNoEncontradoException("Negocio no encontrado"))
            .when(empresaDestinoAlta).resolver(any());
        assertTrue(confirmar(400).contains("Negocio no encontrado"));
    }

    @Test
    @DisplayName("Alta individual 403/400: textos internos de excepciones o de librería salen genéricos")
    void altaIndividual403y400() throws Exception {
        doThrow(new com.hotclick.exception.TenantAccessDeniedException(SQL_INTERNO))
            .when(empresaDestinoAlta).resolver(any());
        assertGenerico(mockMvc.perform(post("/api/productos").header("Authorization", tokenAprobada)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo("Al Alta 403", bodegaAprobada)))
            .andExpect(status().isForbidden()).andReturn().getResponse().getContentAsString());

        doAnswer(numberFormatDeLibreria()).when(empresaDestinoAlta).resolver(any());
        assertGenerico(mockMvc.perform(post("/api/productos").header("Authorization", tokenAprobada)
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo("Al Alta 400", bodegaAprobada)))
            .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString());
    }

    private String cuerpo(String nombre, Bodega bodega) {
        return cuerpo(nombre, "SKU-AL-9", bodega, "");
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
