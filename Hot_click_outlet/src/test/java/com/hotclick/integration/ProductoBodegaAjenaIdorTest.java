package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * [MEDIO] IDOR de bodega (Seguridad): alta y edición de productos aceptaban el bodegaId de OTRO negocio y la
 * respuesta divulgaba su nombre, provincia y cantón. La bodega tiene que ser del negocio del producto;
 * una ajena responde igual que una inexistente y no se asigna.
 */
@DisplayName("[MEDIO] Producto: la bodega tiene que ser del negocio (alta, edición, bulk)")
class ProductoBodegaAjenaIdorTest extends BaseIntegrationTest {

    private static final String NOMBRE_AJENA = "Bodega Secreta Ajena";
    private static final String PROVINCIA_AJENA = "Guanacaste";
    private static final String CANTON_AJENO = "Nicoya";

    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private ProductoRepository  productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private BodegaRepository    bodegaRepository;

    private Categoria categoria;
    private Empresa   propia;
    private Empresa   otra;
    private Bodega    bodegaPropia;
    private Bodega    bodegaAjena;
    private String    token;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-Cat-Bodega");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        propia = crearEmpresa("Bodega Propia SA", "bodega-propia", "bp@test.cr");
        otra   = crearEmpresa("Bodega Otra SA", "bodega-otra", "bo@test.cr");
        bodegaPropia = crearBodega("Bodega Propia", propia, "San José", "Escazú");
        bodegaAjena  = crearBodega(NOMBRE_AJENA, otra, PROVINCIA_AJENA, CANTON_AJENO);
        Usuario u = crearUsuario("bodega-emp@test.cr", "Emp Bodega", rolEmp);
        u.setEmpresa(propia);
        usuarioRepository.saveAndFlush(u);
        token = tokenPara(u, Constants.ROL_EMPRENDEDOR);
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
    @DisplayName("Alta con bodega de otro negocio → 400, no se crea y no se divulga la bodega")
    void alta_bodegaAjena_rechazadaSinFuga() throws Exception {
        ResultActions r = mockMvc.perform(post("/api/productos")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo("Taza Idor Alta", bodegaAjena)));

        r.andExpect(status().isBadRequest());
        sinFuga(r);
        assertTrue(productoRepository.findAll().isEmpty(), "no se crea producto con bodega ajena");
    }

    @Test
    @DisplayName("Alta con bodega inexistente da la misma respuesta que con una ajena (sin oráculo)")
    void alta_bodegaInexistente_mismaRespuestaQueAjena() throws Exception {
        String ajena = mockMvc.perform(post("/api/productos")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo("Taza Oraculo", bodegaAjena)))
            .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();
        long idInexistente = bodegaAjena.getId() + 9999;
        String inexistente = mockMvc.perform(post("/api/productos")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo("Taza Oraculo", idInexistente)))
            .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString();

        assertEquals(
            inexistente.replace(String.valueOf(idInexistente), "#").replaceAll("\"timestamp\":\"[^\"]*\"", ""),
            ajena.replace(String.valueOf(bodegaAjena.getId()), "#").replaceAll("\"timestamp\":\"[^\"]*\"", ""));
    }

    @Test
    @DisplayName("Alta con la bodega propia sigue funcionando")
    void alta_bodegaPropia_ok() throws Exception {
        mockMvc.perform(post("/api/productos")
                .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Taza Propia", bodegaPropia)))
            .andExpect(status().isOk());

        Producto p = productoPorNombre("Taza Propia");
        assertEquals(bodegaPropia.getId(), p.getBodega().getId());
    }

    @Test
    @DisplayName("Edición con bodega de otro negocio → 400, la bodega del producto no cambia y no hay fuga")
    void edicion_bodegaAjena_rechazadaSinFuga() throws Exception {
        mockMvc.perform(post("/api/productos")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo("Taza Idor Edicion", bodegaPropia))).andExpect(status().isOk());
        Producto p = productoPorNombre("Taza Idor Edicion");

        ResultActions r = mockMvc.perform(put("/api/productos/" + p.getId())
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo("Taza Idor Edicion", bodegaAjena)));

        r.andExpect(status().isBadRequest());
        sinFuga(r);
        assertEquals(bodegaPropia.getId(), productoPorNombre("Taza Idor Edicion").getBodega().getId(),
            "la bodega del producto no se cambia a una ajena");
    }

    @Test
    @DisplayName("Edición con otra bodega propia sigue funcionando")
    void edicion_bodegaPropia_ok() throws Exception {
        Bodega segunda = crearBodega("Bodega Propia 2", propia, "Heredia", "Barva");
        mockMvc.perform(post("/api/productos")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
            .content(cuerpo("Taza Edicion Ok", bodegaPropia))).andExpect(status().isOk());
        Producto p = productoPorNombre("Taza Edicion Ok");

        mockMvc.perform(put("/api/productos/" + p.getId())
                .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo("Taza Edicion Ok", segunda)))
            .andExpect(status().isOk());

        assertEquals(segunda.getId(), productoPorNombre("Taza Edicion Ok").getBodega().getId());
    }

    @Test
    @DisplayName("Bulk: una fila con bodega ajena → 400 y no se crea nada del lote (ni las filas propias)")
    void bulk_bodegaAjena_filaRechazada() throws Exception {
        String mala  = cuerpo("Bulk Ajena", bodegaAjena);
        String buena = cuerpo("Bulk Propia", bodegaPropia);

        ResultActions r = mockMvc.perform(post("/api/productos/bulk")
            .header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
            .content("[" + mala + "," + buena + "]"));

        r.andExpect(status().isBadRequest());
        sinFuga(r);
        assertTrue(productoRepository.findAll().isEmpty(), "el lote con una bodega ajena no crea nada");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void sinFuga(ResultActions r) throws Exception {
        String body = r.andReturn().getResponse().getContentAsString();
        assertFalse(body.contains(NOMBRE_AJENA), "no divulga el nombre de la bodega ajena: " + body);
        assertFalse(body.contains(PROVINCIA_AJENA), "no divulga la provincia de la bodega ajena: " + body);
        assertFalse(body.contains(CANTON_AJENO), "no divulga el cantón de la bodega ajena: " + body);
    }

    private String cuerpo(String nombre, Bodega bodega) {
        return cuerpo(nombre, bodega.getId());
    }

    private String cuerpo(String nombre, long bodegaId) {
        return String.format(
            "{\"nombreProducto\":\"%s\",\"precioVenta\":12000,\"precioCompra\":8000," +
            "\"stockActual\":3,\"stockMinimo\":1,\"categoriaId\":%d,\"bodegaId\":%d}",
            nombre, categoria.getId(), bodegaId);
    }

    private Producto productoPorNombre(String nombre) {
        return productoRepository.findAll().stream()
            .filter(p -> nombre.equals(p.getNombreProducto())).findFirst()
            .orElseThrow(() -> new AssertionError("No se creó el producto " + nombre));
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

    private Bodega crearBodega(String nombre, Empresa empresa, String provincia, String canton) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle Test 1");
        b.setTelefono("88880000");
        b.setProvincia(provincia);
        b.setCanton(canton);
        b.setHorarioApertura(java.time.LocalTime.of(8, 0));
        b.setHorarioCierre(java.time.LocalTime.of(18, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }
}
