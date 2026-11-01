package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [ALTO] Auditor 3, A-1: POST /api/productos/bulk se saltaba las reglas del alta individual
 * (campos solo-admin, moderación de texto y reglas de publicación del negocio).
 * El bulk debe dar el mismo resultado que POST /api/productos para el mismo cuerpo.
 */
@DisplayName("[ALTO] Bulk de productos aplica las mismas reglas que el alta individual (A-1)")
class ProductoBulkMismasReglasAltaTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;

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
            c.setNombreCategoria("Test-Cat-Bulk");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        aprobada  = crearEmpresa("Bulk Aprobada", "bulk-aprobada", "bulk-ap@test.cr", "ACTIVO", true);
        pendiente = crearEmpresa("Bulk Pendiente", "bulk-pendiente", "bulk-pe@test.cr", "PENDIENTE_APROBACION", false);
        bodegaAprobada  = crearBodega("Bodega Bulk A", aprobada);
        bodegaPendiente = crearBodega("Bodega Bulk P", pendiente);
        tokenAprobada  = tokenEmprendedor("bulk-emp-a@test.cr", rolEmp, aprobada);
        tokenPendiente = tokenEmprendedor("bulk-emp-p@test.cr", rolEmp, pendiente);
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

    @Test
    @DisplayName("A-1 | EMPRENDEDOR manda destacado:true y meta SEO por bulk → no queda destacado ni con SEO")
    void bulk_emprendedor_noPuedeDestacarNiPonerSeo() throws Exception {
        String item = cuerpo("Bulk Destacado", "SKU-BULK-D1", bodegaAprobada,
            ",\"destacado\":true,\"metaTitle\":\"SEO colado\",\"metaDescription\":\"SEO colado\"");

        bulk(tokenAprobada, "[" + item + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1))
            .andExpect(jsonPath("$.data.errors").value(0));

        Producto p = productoPorNombre("Bulk Destacado");
        assertNotEquals(Boolean.TRUE, p.getDestacado(), "un EMPRENDEDOR no puede destacar productos");
        assertNull(p.getMetaTitle(), "los meta SEO son solo del admin");
        assertNull(p.getMetaDescription(), "los meta SEO son solo del admin");
    }

    @Test
    @DisplayName("A-1 | Negocio sin aprobar: el bulk no publica en el catálogo (igual que el alta individual)")
    void bulk_negocioSinAprobar_noPublica() throws Exception {
        String item = cuerpo("Bulk Pendiente", "SKU-BULK-P1", bodegaPendiente, ",\"visibleCatalogo\":true");

        bulk(tokenPendiente, "[" + item + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1));

        assertNotEquals(Boolean.TRUE, productoPorNombre("Bulk Pendiente").getVisibleCatalogo(),
            "un negocio sin aprobar no publica por bulk");
    }

    @Test
    @DisplayName("A-1 | Paridad: el mismo cuerpo da la misma visibilidad por alta individual y por bulk")
    void bulk_mismoResultadoQueAltaIndividual() throws Exception {
        String individual = cuerpo("Alta Individual", "SKU-BULK-I1", bodegaPendiente, ",\"visibleCatalogo\":true");
        String enBulk     = cuerpo("Alta Bulk", "SKU-BULK-I2", bodegaPendiente, ",\"visibleCatalogo\":true");

        mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenPendiente)
                .contentType(MediaType.APPLICATION_JSON)
                .content(individual))
            .andExpect(status().isOk());
        bulk(tokenPendiente, "[" + enBulk + "]").andExpect(status().isOk());

        assertEquals(productoPorNombre("Alta Individual").getVisibleCatalogo(),
            productoPorNombre("Alta Bulk").getVisibleCatalogo());
    }

    @Test
    @DisplayName("A-1 | Moderación: una fila con texto no permitido se rechaza y el resto se importa")
    void bulk_textoNoPermitido_filaRechazada() throws Exception {
        String malo  = cuerpo("Video porno xxx", "SKU-BULK-M1", bodegaAprobada, "");
        String bueno = cuerpo("Taza de cerámica", "SKU-BULK-M2", bodegaAprobada, "");

        bulk(tokenAprobada, "[" + malo + "," + bueno + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(1))
            .andExpect(jsonPath("$.data.errors").value(1))
            .andExpect(jsonPath("$.message").value(
                org.hamcrest.Matchers.containsString("Fila 1: El contenido del producto no está permitido")));

        assertTrue(productoRepository.findAll().stream().noneMatch(p -> "Video porno xxx".equals(p.getNombreProducto())),
            "el producto con texto no permitido no se crea");
        assertNotNull(productoPorNombre("Taza de cerámica"));
    }

    @Test
    @DisplayName("A-1 | Bulk normal de negocio aprobado sigue funcionando: se crea y se publica")
    void bulk_normal_negocioAprobado_publica() throws Exception {
        String a = cuerpo("Taza Uno", "SKU-BULK-N1", bodegaAprobada, "");
        String b = cuerpo("Taza Dos", "SKU-BULK-N2", bodegaAprobada, "");

        bulk(tokenAprobada, "[" + a + "," + b + "]")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.ok").value(2))
            .andExpect(jsonPath("$.data.errors").value(0));

        for (String nombre : List.of("Taza Uno", "Taza Dos")) {
            Producto p = productoPorNombre(nombre);
            assertEquals(aprobada.getId(), p.getEmpresaId());
            assertTrue(Boolean.TRUE.equals(p.getVisibleCatalogo()), "negocio aprobado publica");
            assertNotEquals(Boolean.TRUE, p.getDestacado());
        }
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
