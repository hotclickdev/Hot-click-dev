package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.producto.ProductoApprovalService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [MEDIO] Seguridad: POST /api/admin/importar/confirmar creaba productos sin moderación ni reglas de
 * publicación, forzaba visibleCatalogo=true y confiaba en el bodegaId del cliente. Ahora usa el mismo
 * pipeline que el alta individual y valida la bodega contra el negocio.
 * También: (BAJO) un fallo posterior a la creación no cuenta como error de la fila (el reintento duplicaba),
 * y (BAJO) la materialización de un paquete de inventario pasa por la moderación.
 */
@DisplayName("[MEDIO] Importar/confirmar y paquetes de inventario: mismas reglas que el alta individual")
class ImportConfirmarMismasReglasAltaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private PaqueteInventarioRepository paqueteRepository;
    @MockitoSpyBean private ProductoApprovalService productoApprovalService;
    @MockitoSpyBean private com.hotclick.service.AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    private Categoria categoria;
    private Empresa   aprobada;
    private Empresa   pendiente;
    private Bodega    bodegaAprobada;
    private Bodega    bodegaPendiente;
    private Bodega    bodegaAjena;
    private String    tokenAprobada;
    private String    tokenPendiente;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Import");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        aprobada  = crearEmpresa("Import Aprobada", "import-aprobada", "imp-ap@test.cr", "ACTIVO", true);
        pendiente = crearEmpresa("Import Pendiente", "import-pendiente", "imp-pe@test.cr", "PENDIENTE_APROBACION", false);
        Empresa otra = crearEmpresa("Import Otra", "import-otra", "imp-ot@test.cr", "ACTIVO", true);
        bodegaAprobada  = crearBodega("Bodega Imp A", aprobada);
        bodegaPendiente = crearBodega("Bodega Imp P", pendiente);
        bodegaAjena     = crearBodega("Bodega Imp Secreta Ajena", otra);
        tokenAprobada  = tokenEmprendedor("imp-emp-a@test.cr", rolEmp, aprobada);
        tokenPendiente = tokenEmprendedor("imp-emp-p@test.cr", rolEmp, pendiente);
    }

    @AfterEach
    void tearDown() {
        paqueteRepository.deleteAll();
        productoRepository.deleteAll();
        categoriaRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Negocio sin aprobar: el producto importado se crea pero NO se publica en el catálogo")
    void import_negocioSinAprobar_noPublica() throws Exception {
        confirmar(tokenPendiente, "[" + item("Import Pendiente Taza", bodegaPendiente) + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1));

        assertNotEquals(Boolean.TRUE, productoPorNombre("Import Pendiente Taza").getVisibleCatalogo(),
            "un negocio sin aprobar no publica por importación");
    }

    @Test
    @DisplayName("Negocio aprobado: el producto importado se crea y se publica (sin regresión)")
    void import_negocioAprobado_publica() throws Exception {
        confirmar(tokenAprobada, "[" + item("Import Aprobada Taza", bodegaAprobada) + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1));

        Producto p = productoPorNombre("Import Aprobada Taza");
        assertEquals(aprobada.getId(), p.getEmpresaId());
        assertEquals(Boolean.TRUE, p.getVisibleCatalogo());
        assertNotEquals(Boolean.TRUE, p.getDestacado());
    }

    @Test
    @DisplayName("Moderación: la fila con texto no permitido se rechaza y el resto se importa")
    void import_textoNoPermitido_filaRechazada() throws Exception {
        confirmar(tokenAprobada, "[" + item("Video porno xxx", bodegaAprobada) + ","
                + item("Import Taza Buena", bodegaAprobada) + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1))
            .andExpect(jsonPath("$.data.errores.length()").value(1));

        assertTrue(productoRepository.findAll().stream().noneMatch(p -> "Video porno xxx".equals(p.getNombreProducto())));
        assertNotNull(productoPorNombre("Import Taza Buena"));
    }

    @Test
    @DisplayName("Bodega de otro negocio: la fila es un error, no se crea y no se divulga la bodega")
    void import_bodegaAjena_filaRechazadaSinFuga() throws Exception {
        ResultActions r = confirmar(tokenAprobada, "[" + item("Import Bodega Ajena", bodegaAjena) + "]");

        r.andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(0))
            .andExpect(jsonPath("$.data.errores.length()").value(1));
        assertFalse(r.andReturn().getResponse().getContentAsString().contains("Secreta Ajena"));
        assertTrue(productoRepository.findAll().isEmpty(), "no se crea producto con bodega ajena");
    }

    @Test
    @DisplayName("Atómico | Si fallan las reglas de publicación la fila es error y no queda producto (ni visible)")
    void import_falloReglasPublicacion_noDejaProducto() throws Exception {
        doThrow(new IllegalStateException("fallo simulado en las reglas de publicación"))
            .when(productoApprovalService).aplicarReglasPublicacion(any(), any());

        confirmar(tokenPendiente, "[" + item("Import Falla Reglas", bodegaPendiente) + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(0))
            .andExpect(jsonPath("$.data.errores.length()").value(1));

        assertEquals(0, productoRepository.findAll().stream()
            .filter(p -> "Import Falla Reglas".equals(p.getNombreProducto())).count(),
            "el alta se revierte completa: no queda un producto visible de un negocio sin aprobar");
    }

    @Test
    @DisplayName("BAJO | Si solo falla la auditoría (post-commit) la fila NO cuenta como error (el reintento duplicaría)")
    void import_falloPosteriorALaCreacion_noEsErrorDeLaFila() throws Exception {
        doThrow(new IllegalStateException("auditoría caída"))
            .when(auditoriaAdminRegistroService).registrarSiAdmin(anyString(), anyString(), anyLong(), anyLong(), anyString());

        confirmar(tokenAprobada, "[" + item("Import Falla Posterior", bodegaAprobada) + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1))
            .andExpect(jsonPath("$.data.errores.length()").value(0))
            .andExpect(jsonPath("$.data.advertencias.length()").value(1));

        assertEquals(1, productoRepository.findAll().stream()
            .filter(p -> "Import Falla Posterior".equals(p.getNombreProducto())).count());
    }

    @Test
    @DisplayName("BAJO | Paquete de inventario: una línea con texto no permitido no se materializa como producto")
    void paqueteInventario_asignar_moderaTexto() throws Exception {
        PaqueteInventario paquete = new PaqueteInventario();
        paquete.setCodigo("PKG-MODERA1");
        paquete.setEstado(PaqueteInventario.ESTADO_CERRADO);
        paquete.setFechaCreacion(LocalDateTime.now());
        paquete.setCreadoPor(adminUser);
        PaqueteLinea linea = new PaqueteLinea();
        linea.setPaquete(paquete);
        linea.setNombre("Video porno xxx");
        linea.setEstado(PaqueteLinea.ESTADO_LISTO);
        linea.setFechaCreacion(LocalDateTime.now());
        paquete.getLineas().add(linea);
        paquete = paqueteRepository.saveAndFlush(paquete);

        mockMvc.perform(post("/api/inventario/paquetes/" + paquete.getId() + "/asignar")
                .header("Authorization", adminToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"empresaId\":" + aprobada.getId() + "}"))
            .andExpect(status().is4xxClientError());

        assertTrue(productoRepository.findAll().stream()
            .noneMatch(p -> "Video porno xxx".equals(p.getNombreProducto())), "la moderación aplica al paquete");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private ResultActions confirmar(String token, String json) throws Exception {
        return mockMvc.perform(post("/api/admin/importar/confirmar")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String item(String nombre, Bodega bodega) {
        return String.format(
            "{\"nombreProducto\":\"%s\",\"precioVenta\":12000,\"precioCompra\":8000,\"stockActual\":3," +
            "\"categoriaId\":%d,\"bodegaId\":%d}", nombre, categoria.getId(), bodega.getId());
    }

    private Producto productoPorNombre(String nombre) {
        List<Producto> todos = productoRepository.findAll();
        return todos.stream().filter(p -> nombre.equals(p.getNombreProducto())).findFirst()
            .orElseThrow(() -> new AssertionError("No se creó el producto " + nombre));
    }

    private String tokenEmprendedor(String correo, Rol rol, Empresa empresa) {
        Usuario u = crearUsuario(correo, "Emp Import", rol);
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
