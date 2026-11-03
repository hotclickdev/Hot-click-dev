package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@DisplayName("[MEDIO] CAJERO de equipo no escribe catálogo, stock, imágenes, ofertas, categorías ni inventario")
class CajeroSinCatalogoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private MiembroEmpresaRepository miembroEmpresaRepository;

    private Empresa empA, empB;
    private String tokenCajeroA, tokenDuenoA, tokenEditorA, tokenDuenoB;

    @BeforeEach
    void setUp() {
        empA = empresa("csc-a");
        empB = empresa("csc-b");
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        tokenCajeroA = miembro("csc-cajero@test.cr", "CAJERO", rolEmp, empA);
        tokenDuenoA = miembro("csc-dueno-a@test.cr", "PROPIETARIO", rolEmp, empA);
        tokenEditorA = miembro("csc-editor@test.cr", "EDITOR", rolEmp, empA);
        tokenDuenoB = miembro("csc-dueno-b@test.cr", "PROPIETARIO", rolEmp, empB);
    }

    @AfterEach
    void tearDown() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO"); e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private String miembro(String correo, String rolEquipo, Rol rol, Empresa emp) {
        Usuario u = crearUsuario(correo, rolEquipo, rol);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private static MockHttpServletRequestBuilder json(MockHttpServletRequestBuilder b, String body) {
        return b.contentType(MediaType.APPLICATION_JSON).content(body);
    }

    /** Ids inexistentes y cuerpos vacíos: sin guarda dan 400/404 (o 200 al crear), nunca 403. */
    private Map<String, MockHttpServletRequestBuilder> escrituras() {
        Map<String, MockHttpServletRequestBuilder> m = new LinkedHashMap<>();
        m.put("POST /api/productos", json(post("/api/productos"), "{\"nombreProducto\":\"X\",\"precio\":1000}"));
        m.put("PUT /api/productos/{id}", json(put("/api/productos/999999"), "{}"));
        m.put("DELETE /api/productos/{id}", delete("/api/productos/999999"));
        m.put("PATCH /api/productos/{id}/visibilidad-catalogo", json(patch("/api/productos/999999/visibilidad-catalogo"), "{\"visible\":false}"));
        m.put("PATCH /api/productos/{id}/carrusel", json(patch("/api/productos/999999/carrusel"), "{}"));
        m.put("PATCH /api/productos/{id}/destacado", json(patch("/api/productos/999999/destacado"), "{}"));
        m.put("PATCH /api/productos/{id}/oferta", json(patch("/api/productos/999999/oferta"), "{}"));
        m.put("POST /api/productos/oferta/categoria/{id}", json(post("/api/productos/oferta/categoria/999999"), "{}"));
        m.put("POST /api/productos/bulk", json(post("/api/productos/bulk"), "[]"));
        m.put("POST /api/productos/archivar-sin-stock", post("/api/productos/archivar-sin-stock"));
        m.put("POST /api/productos/ajustar-precios", json(post("/api/productos/ajustar-precios"), "{}"));
        m.put("POST /api/productos/imagen", multipart("/api/productos/imagen"));
        m.put("POST /api/productos/{id}/imagenes", post("/api/productos/999999/imagenes"));
        m.put("POST /api/stock/ajuste-entrada/{id}", json(post("/api/stock/ajuste-entrada/999999"), "{}"));
        m.put("POST /api/categorias", json(post("/api/categorias"), "{}"));
        m.put("PUT /api/categorias/{id}", json(put("/api/categorias/999999"), "{}"));
        m.put("DELETE /api/categorias/{id}", delete("/api/categorias/999999"));
        m.put("POST /api/inventario/paquetes", json(post("/api/inventario/paquetes"), "{}"));
        return m;
    }

    private int st(MockHttpServletRequestBuilder b, String token) throws Exception {
        return mockMvc.perform(b.header("Authorization", token)).andReturn().getResponse().getStatus();
    }

    @Test
    void cajeroRecibe403EnTodaEscrituraDeCatalogo() throws Exception {
        List<String> abiertos = new ArrayList<>();
        for (var e : escrituras().entrySet()) {
            int s = st(e.getValue(), tokenCajeroA);
            if (s != 403) abiertos.add(e.getKey() + " -> " + s);
        }
        assertThat(abiertos).as("escrituras de catálogo que el CAJERO todavía puede hacer").isEmpty();
    }

    @Test
    void cajeroSigueLeyendoCatalogoParaElPos() throws Exception {
        assertThat(st(get("/api/productos"), tokenCajeroA)).isNotEqualTo(403);
    }

    @Test
    void propietarioYEditorSiguenEscribiendoCatalogo() throws Exception {
        for (String t : new String[]{tokenDuenoA, tokenEditorA}) {
            for (String k : List.of("POST /api/productos", "PUT /api/productos/{id}", "POST /api/categorias")) {
                assertThat(st(escrituras().get(k), t)).as(k).isNotEqualTo(403);
            }
        }
    }

    @Test
    void cajeroDeOtroNegocioNoAfectaAlPropietarioYNoEscribeEnB() throws Exception {
        assertThat(st(escrituras().get("POST /api/productos"), tokenDuenoB)).isNotEqualTo(403);
        assertThat(st(json(post("/api/productos").param("empresaId", String.valueOf(empB.getId())),
            "{\"nombreProducto\":\"X\",\"precio\":1000}"), tokenCajeroA)).isEqualTo(403);
    }
}
