package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import com.hotclick.service.producto.ProductoApprovalService;
import com.hotclick.service.AuditoriaAdminRegistroService;

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
 * Alta atómica: el producto y las reglas de publicación del negocio van en UNA transacción.
 * Si aplicarReglasPublicacion falla, no puede quedar un producto con visibleCatalogo=true de un negocio sin aprobar.
 * También: un bulk vacío es 400.
 */
@DisplayName("[MEDIO] Alta de producto atómica con las reglas de publicación; bulk vacío = 400")
class ProductoAltaAtomicaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @MockitoSpyBean private ProductoApprovalService productoApprovalService;
    @MockitoSpyBean private AuditoriaAdminRegistroService auditoriaAdminRegistroService;

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
            c.setNombreCategoria("Test-Cat-Atom");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        aprobada  = crearEmpresa("Atom Aprobada", "atom-aprobada", "atom-ap@test.cr", "ACTIVO", true);
        pendiente = crearEmpresa("Atom Pendiente", "atom-pendiente", "atom-pe@test.cr", "PENDIENTE_APROBACION", false);
        bodegaAprobada  = crearBodega("Bodega Atom A", aprobada);
        bodegaPendiente = crearBodega("Bodega Atom P", pendiente);
        tokenAprobada  = tokenEmprendedor("atom-emp-a@test.cr", rolEmp, aprobada);
        tokenPendiente = tokenEmprendedor("atom-emp-p@test.cr", rolEmp, pendiente);
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

    private void fallaLaPublicacion() {
        doThrow(new IllegalStateException("fallo simulado en las reglas de publicación"))
            .when(productoApprovalService).aplicarReglasPublicacion(any(), any());
    }

    private long contar(String nombre) {
        return productoRepository.findAll().stream().filter(p -> nombre.equals(p.getNombreProducto())).count();
    }

    @Test
    @DisplayName("Alta individual: si fallan las reglas de publicación no queda producto (ni visible)")
    void altaIndividual_falloReglas_noDejaProducto() throws Exception {
        fallaLaPublicacion();

        mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenPendiente).contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Atom Individual", "SKU-ATOM-1", bodegaPendiente, ",\"visibleCatalogo\":true")))
            .andExpect(status().isBadRequest());

        assertEquals(0, contar("Atom Individual"), "el alta se revierte completa");
    }

    @Test
    @DisplayName("Bulk: si fallan las reglas de publicación la fila es error y no queda producto")
    void bulk_falloReglas_filaErrorySinProducto() throws Exception {
        fallaLaPublicacion();

        bulk(tokenPendiente, "[" + cuerpo("Atom Bulk", "SKU-ATOM-2", bodegaPendiente, ",\"visibleCatalogo\":true") + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(0))
            .andExpect(jsonPath("$.data.errors").value(1));

        assertEquals(0, contar("Atom Bulk"));
    }

    @Test
    @DisplayName("Bulk: si solo falla la auditoría (post-commit) la fila cuenta como creada, no como error")
    void bulk_falloAuditoria_cuentaComoCreada() throws Exception {
        doThrow(new IllegalStateException("auditoría caída"))
            .when(auditoriaAdminRegistroService).registrarSiAdmin(anyString(), anyString(), anyLong(), anyLong(), anyString());

        bulk(tokenAprobada, "[" + cuerpo("Atom Auditoria", "SKU-ATOM-3", bodegaAprobada, "") + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1))
            .andExpect(jsonPath("$.data.errors").value(0));

        assertEquals(1, contar("Atom Auditoria"));
    }

    @Test
    @DisplayName("Bulk vacío ([]) → 400")
    void bulk_listaVacia_400() throws Exception {
        bulk(tokenAprobada, "[]").andExpect(status().isBadRequest());
        assertTrue(productoRepository.findAll().isEmpty());
    }

    @Test
    @DisplayName("Bulk con cuerpo null → 400")
    void bulk_cuerpoNull_400() throws Exception {
        bulk(tokenAprobada, "null").andExpect(status().isBadRequest());
        assertTrue(productoRepository.findAll().isEmpty());
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
