package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Carrusel del inicio: negocios y productos destacados salen solo del catálogo público. */
@DisplayName("[VISITANTE] Carrusel del inicio: destacados")
class NegociosDestacadosTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Categoria categoria;

    @BeforeEach
    void setUp() {
        categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Destacados");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
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
    @DisplayName("Sin destacados curados aplica D1: planes pagos primero, foto resuelta y sin contacto")
    void criterioProvisorio() throws Exception {
        Empresa emp = empresa("Café Bruma", "cafe-bruma-dest", "GRATUITO", true, "ACTIVO");
        emp.setNumeroWhatsapp("50688887777");
        empresaRepository.saveAndFlush(emp);
        producto("Café", "SKU-D-1", emp, true, "/img/cafe.jpg");
        Empresa pyme = empresa("Luna Pyme", "luna-pyme-dest", "PYME", true, "ACTIVO");
        pyme.setLogoUrl("/logo/luna.png");
        empresaRepository.saveAndFlush(pyme);
        producto("Mesa", "SKU-D-2", pyme, true, null);
        Empresa sinFoto = empresa("Sin Foto", "sin-foto-dest", "PYME", true, "ACTIVO");
        producto("Silla", "SKU-D-3", sinFoto, true, null);

        mockMvc.perform(get("/api/public/negocios/destacados"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].slug", contains("luna-pyme-dest", "cafe-bruma-dest")))
            .andExpect(jsonPath("$[0].fotoPortada", is("/logo/luna.png")))
            .andExpect(jsonPath("$[1].fotoPortada", is("/img/cafe.jpg")))
            .andExpect(jsonPath("$[1].logoUrl", is("")))
            .andExpect(jsonPath("$[1].provincia", is("San José")))
            .andExpect(content().string(not(containsString("50688887777"))));
    }

    @Test
    @DisplayName("Solo catálogo público: fuera negocios ocultos, no activos o con productos no visibles")
    void soloCatalogoPublico() throws Exception {
        Empresa ok = empresa("Visible", "visible-dest", "PYME", true, "ACTIVO");
        producto("A", "SKU-D-10", ok, true, "/img/a.jpg");
        Empresa oculta = empresa("Oculta", "oculta-dest", "PYME", false, "ACTIVO");
        producto("B", "SKU-D-11", oculta, true, "/img/b.jpg");
        Empresa pendiente = empresa("Pendiente", "pendiente-dest", "PYME", true, "PENDIENTE");
        producto("C", "SKU-D-12", pendiente, true, "/img/c.jpg");
        Empresa noVisible = empresa("NoVisible", "novisible-dest", "PYME", true, "ACTIVO");
        producto("D", "SKU-D-13", noVisible, false, "/img/d.jpg");
        for (Empresa e : new Empresa[]{ok, oculta, pendiente, noVisible}) {
            e.setDestacado(true);
            empresaRepository.saveAndFlush(e);
        }

        mockMvc.perform(get("/api/public/negocios/destacados"))
            .andExpect(jsonPath("$[*].slug", contains("visible-dest")));
    }

    @Test
    @DisplayName("Curados por orden y con tope de 5 (D3)")
    void curadosConTope() throws Exception {
        for (int i = 0; i < 7; i++) {
            Empresa e = empresa("Neg " + i, "neg-" + i + "-dest", "GRATUITO", true, "ACTIVO");
            e.setDestacado(true);
            e.setDestacadoOrden(10 - i);
            empresaRepository.saveAndFlush(e);
            producto("P" + i, "SKU-D-2" + i, e, true, "/img/" + i + ".jpg");
        }
        Empresa noCurado = empresa("No curado", "nocurado-dest", "NEGOCIO_PLUS", true, "ACTIVO");
        producto("X", "SKU-D-30", noCurado, true, "/img/x.jpg");

        mockMvc.perform(get("/api/public/negocios/destacados").param("limite", "50"))
            .andExpect(jsonPath("$", hasSize(5)))
            .andExpect(jsonPath("$[0].slug", is("neg-6-dest")))
            .andExpect(jsonPath("$[*].slug", not(hasItem("nocurado-dest"))));
    }

    @Test
    @DisplayName("Productos destacados excluyen los no visibles en catálogo")
    void productosDestacadosSoloVisibles() throws Exception {
        Empresa e = empresa("Tienda", "tienda-dest", "PYME", true, "ACTIVO");
        Producto visible = producto("Visible", "SKU-D-40", e, true, "/img/v.jpg");
        Producto oculto = producto("Oculto", "SKU-D-41", e, false, "/img/o.jpg");
        visible.setDestacado(true);
        oculto.setDestacado(true);
        productoRepository.saveAndFlush(visible);
        productoRepository.saveAndFlush(oculto);

        Assertions.assertEquals(java.util.List.of(visible.getId()),
            productoRepository.findDestacadosPublicos(Constants.ESTADO_ACTIVO).stream().map(Producto::getId).toList());
    }

    @Test
    @DisplayName("Toggle de admin: solo ADMIN, solo negocios activos y visibles")
    void toggleAdmin() throws Exception {
        Empresa ok = empresa("Activo", "activo-dest", "PYME", true, "ACTIVO");
        Empresa oculta = empresa("Oculta", "oculta2-dest", "PYME", false, "ACTIVO");

        mockMvc.perform(put("/api/admin/empresas/" + ok.getId() + "/destacado")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destacado\":true}"))
            .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/admin/empresas/" + ok.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destacado\":true,\"orden\":2}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.destacado", is(true)));
        Empresa guardada = empresaRepository.findById(ok.getId()).orElseThrow();
        Assertions.assertTrue(guardada.getDestacado());
        Assertions.assertEquals(2, guardada.getDestacadoOrden());
        Assertions.assertNotNull(guardada.getDestacadoDesde());

        mockMvc.perform(put("/api/admin/empresas/" + oculta.getId() + "/destacado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"destacado\":true}"))
            .andExpect(status().isBadRequest());
    }

    private Empresa empresa(String nombre, String slug, String plan, boolean visible, String estado) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa(estado);
        e.setVisibilidadPublica(visible);
        e.setPlanSaas(plan);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Producto producto(String nombre, String sku, Empresa empresa, boolean visibleCatalogo, String foto) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + sku);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setProvincia("San José");
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        bodegaRepository.saveAndFlush(b);
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(10000);
        p.setPrecioCompra(6000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(visibleCatalogo);
        p.setImagenPrincipalUrl(foto);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        return productoRepository.saveAndFlush(p);
    }
}
