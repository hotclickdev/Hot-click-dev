package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.CacheManager;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * La API pública devolvía costo, margen, proveedor y contacto de bodega de cada
 * emprendedor. Solo el dueño del producto (o ADMIN) debe verlos.
 */
@DisplayName("[SEGURIDAD] Campos internos de Producto y Bodega fuera de la API pública")
class ProductoCamposInternosTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;
    @Autowired private CacheManager        cacheManager;

    private Empresa empresa;
    private Producto producto;
    private Usuario duenio;

    @BeforeEach
    void setUp() {
        var cache = cacheManager.getCache("productos-publicos");
        if (cache != null) cache.clear();
        empresa = crearEmpresa("Tienda Costos", "tienda-costos", "costos@test.cr");
        producto = crearProducto("Prod Con Costo", "SKU-COSTO-1", empresa, crearBodega(empresa, false));
        duenio = crearEmprendedor("duenio-costos@test.cr", empresa);
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
    @DisplayName("Anónimo: el detalle no trae costo, margen ni contacto de bodega")
    void anonimo_detalleSinCamposInternos() throws Exception {
        mockMvc.perform(get("/api/productos/" + producto.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.precioVenta").value(10000))
            .andExpect(jsonPath("$.data.precioCompra").doesNotExist())
            .andExpect(jsonPath("$.data.stockMinimo").doesNotExist())
            .andExpect(jsonPath("$.data.proveedorPrincipal").doesNotExist())
            .andExpect(jsonPath("$.data.bodega.nombreBodega").exists())
            .andExpect(jsonPath("$.data.bodega.telefono").doesNotExist())
            .andExpect(jsonPath("$.data.bodega.direccionExacta").doesNotExist())
            .andExpect(jsonPath("$.data.bodega.correoContacto").doesNotExist());
    }

    @Test
    @DisplayName("Anónimo: el listado del catálogo no trae precio de compra")
    void anonimo_listadoSinCamposInternos() throws Exception {
        mockMvc.perform(get("/api/productos?size=50"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Prod Con Costo')]").exists())
            .andExpect(jsonPath("$.data.content[?(@.nombreProducto == 'Prod Con Costo')].precioCompra").isEmpty());
    }

    @Test
    @DisplayName("Anónimo en tienda por slug: TenantContext cargado no le da acceso a costos")
    void anonimo_tiendaPorSlugSinCamposInternos() throws Exception {
        mockMvc.perform(get("/api/tienda/" + empresa.getSlug() + "/productos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content[0].nombreProducto").value("Prod Con Costo"))
            .andExpect(jsonPath("$.data.content[0].precioCompra").doesNotExist());
    }

    @Test
    @DisplayName("Dueño: ve el precio de compra de su producto")
    void duenio_veCamposInternos() throws Exception {
        mockMvc.perform(get("/api/productos/" + producto.getId())
                .header("Authorization", tokenPara(duenio, Constants.ROL_EMPRENDEDOR)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.precioCompra").value(6000))
            .andExpect(jsonPath("$.data.bodega.telefono").value("88880000"));
    }

    @Test
    @DisplayName("ADMIN: ve el precio de compra")
    void admin_veCamposInternos() throws Exception {
        mockMvc.perform(get("/api/productos/" + producto.getId()).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.precioCompra").value(6000));
    }

    @Test
    @DisplayName("Emprendedor de otra empresa: no ve costos ajenos")
    void otroEmprendedor_noVeCamposInternos() throws Exception {
        Empresa otra = crearEmpresa("Otra Tienda", "otra-tienda-costos", "otra-costos@test.cr");
        Usuario ajeno = crearEmprendedor("ajeno-costos@test.cr", otra);

        mockMvc.perform(get("/api/productos/destacados")
                .header("Authorization", tokenPara(ajeno, Constants.ROL_EMPRENDEDOR)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'Prod Con Costo')]").exists())
            .andExpect(jsonPath("$.data[?(@.nombreProducto == 'Prod Con Costo')].precioCompra").isEmpty());
    }

    @Test
    @DisplayName("Bodega con retiro en tienda: dirección y teléfono visibles para el checkout")
    void bodegaConRetiro_publicaDireccion() throws Exception {
        Producto conRetiro = crearProducto("Prod Retiro", "SKU-COSTO-2", empresa, crearBodega(empresa, true));

        mockMvc.perform(get("/api/productos/" + conRetiro.getId()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.bodega.direccionExacta").value("Calle Test 1"))
            .andExpect(jsonPath("$.data.bodega.telefono").value("88880000"))
            .andExpect(jsonPath("$.data.bodega.correoContacto").doesNotExist())
            .andExpect(jsonPath("$.data.precioCompra").doesNotExist());
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Usuario crearEmprendedor(String correo, Empresa suEmpresa) {
        Usuario u = crearUsuario(correo, "Emp Costos", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        u.setEmpresa(suEmpresa);
        return usuarioRepository.saveAndFlush(u);
    }

    private Producto crearProducto(String nombre, String sku, Empresa suEmpresa, Bodega bodega) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(10000);
        p.setPrecioCompra(6000);
        p.setProveedorPrincipal("Proveedor Secreto");
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setDestacado(true);
        p.setCategoria(obtenerOCrearCategoria());
        p.setEmpresa(suEmpresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }

    private Bodega crearBodega(Empresa suEmpresa, boolean permiteRetiro) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega Costos " + permiteRetiro);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setCorreoContacto("bodega@test.cr");
        b.setPermiteRetiroCliente(permiteRetiro);
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(suEmpresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Categoria obtenerOCrearCategoria() {
        return categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Costos");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
    }
}
