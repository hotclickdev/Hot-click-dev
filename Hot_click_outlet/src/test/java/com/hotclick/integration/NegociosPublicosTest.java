package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Directorio público de negocios: sin JWT, filtra por plan en el backend y nunca entrega contacto. */
@DisplayName("[VISITANTE] GET /api/public/negocios")
class NegociosPublicosTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Categoria categoria;

    @BeforeEach
    void setUp() {
        categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Negocios");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        Empresa cafe = empresa("Café Bruma Test", "cafe-bruma-test", "GRATUITO", true);
        cafe.setNumeroWhatsapp("50688887777");
        cafe.setInstagram("@cafe.bruma");
        empresaRepository.saveAndFlush(cafe);
        producto("Café molido", "SKU-NEG-1", cafe);
        producto("Mesa", "SKU-NEG-2", empresa("Luna Pyme Test", "luna-pyme-test", "PYME", true));
        producto("Silla", "SKU-NEG-3", empresa("Ceiba Plus Test", "ceiba-plus-test", "NEGOCIO_PLUS", true));
        producto("Oculto", "SKU-NEG-4", empresa("Oculta Test", "oculta-test", "PYME", false));
        empresa("Vacía Test", "vacia-test", "PYME", true);
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
    @DisplayName("Sin filtros: solo negocios activos, públicos y con productos")
    void listaPublica() throws Exception {
        mockMvc.perform(get("/api/public/negocios"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].slug", containsInAnyOrder("cafe-bruma-test", "luna-pyme-test", "ceiba-plus-test")));
    }

    @Test
    @DisplayName("Filtro por plan en el backend")
    void filtroPlan() throws Exception {
        mockMvc.perform(get("/api/public/negocios").param("plan", "emprendimientos"))
            .andExpect(jsonPath("$[*].slug", contains("cafe-bruma-test")))
            .andExpect(jsonPath("$[0].plan", is("EMPRENDEDOR")));
        mockMvc.perform(get("/api/public/negocios").param("plan", "pymes"))
            .andExpect(jsonPath("$[*].slug", contains("luna-pyme-test")));
        mockMvc.perform(get("/api/public/negocios").param("plan", "negocio-plus"))
            .andExpect(jsonPath("$[*].slug", contains("ceiba-plus-test")));
    }

    @Test
    @DisplayName("Busca por nombre sin tildes y no expone contacto del emprendimiento")
    void buscaSinContacto() throws Exception {
        mockMvc.perform(get("/api/public/negocios").param("q", "cafe"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].slug", contains("cafe-bruma-test")))
            .andExpect(jsonPath("$[0].productos", is(1)))
            .andExpect(jsonPath("$[0].whatsapp").doesNotExist())
            .andExpect(jsonPath("$[0].instagram").doesNotExist())
            .andExpect(content().string(not(containsString("50688887777"))))
            .andExpect(content().string(not(containsString("cafe.bruma"))));
    }

    private Empresa empresa(String nombre, String slug, String plan, boolean visible) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(visible);
        e.setPlanSaas(plan);
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private void producto(String nombre, String sku, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega " + sku);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
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
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        productoRepository.saveAndFlush(p);
    }
}
