package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.producto.SkuEmpresa;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("SKU y número local por negocio")
class SkuPorEmpresaIT extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Empresa empresaA;
    private Empresa empresaB;
    private String tokenA;
    private String tokenB;
    private Categoria categoria;
    private Bodega bodegaA;
    private Bodega bodegaB;

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresaA = crearEmpresa("SKU Emp A", "sku-emp-a", "sku-a@test.cr");
        empresaB = crearEmpresa("SKU Emp B", "sku-emp-b", "sku-b@test.cr");
        Usuario duenoA = crearUsuario("sku-dueno-a@test.cr", "Dueno A", rolEmp);
        duenoA.setEmpresa(empresaA);
        duenoA = usuarioRepository.saveAndFlush(duenoA);
        Usuario duenoB = crearUsuario("sku-dueno-b@test.cr", "Dueno B", rolEmp);
        duenoB.setEmpresa(empresaB);
        duenoB = usuarioRepository.saveAndFlush(duenoB);
        tokenA = "Bearer " + jwtUtil.generateToken(
            duenoA.getCorreo(), duenoA.getId(), Constants.ROL_EMPRENDEDOR, empresaA.getId(), empresaA.getSlug());
        tokenB = "Bearer " + jwtUtil.generateToken(
            duenoB.getCorreo(), duenoB.getId(), Constants.ROL_EMPRENDEDOR, empresaB.getId(), empresaB.getSlug());
        categoria = obtenerOCrearCategoria();
        bodegaA = crearBodega("Bodega SKU A", empresaA);
        bodegaB = crearBodega("Bodega SKU B", empresaB);
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
    @DisplayName("Cuatro productos de A son E{A}-0001..0004; el primero de B es 0001")
    void numeracionPorEmpresaNoGlobal() throws Exception {
        for (int i = 1; i <= 4; i++) {
            mockMvc.perform(post("/api/productos")
                    .header("Authorization", tokenA)
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body("Prod A " + i, bodegaA.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.numeroLocal").value(i))
                .andExpect(jsonPath("$.data.sku").value(SkuEmpresa.formato(empresaA.getId(), i)));
        }

        mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenB)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body("Prod B 1", bodegaB.getId())))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroLocal").value(1))
            .andExpect(jsonPath("$.data.sku").value(SkuEmpresa.formato(empresaB.getId(), 1)));
    }

    @Test
    @DisplayName("El catálogo público no expone SKU al comprador")
    void catalogoPublicoOcultaSku() throws Exception {
        var resultado = mockMvc.perform(post("/api/productos")
                .header("Authorization", tokenA)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body("Prod publico", bodegaA.getId())))
            .andExpect(status().isOk())
            .andReturn();
        Integer id = com.jayway.jsonpath.JsonPath.read(
            resultado.getResponse().getContentAsString(), "$.data.id");

        mockMvc.perform(get("/api/productos/" + id))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.sku").value(org.hamcrest.Matchers.nullValue()))
            .andExpect(jsonPath("$.data.numeroLocal").value(org.hamcrest.Matchers.nullValue()));
    }

    private String body(String nombre, Long bodegaId) {
        return String.format(
            "{\"nombreProducto\":\"%s\",\"precioVenta\":20000,\"precioCompra\":10000," +
            "\"stockActual\":5,\"stockMinimo\":1,\"categoriaId\":%d,\"bodegaId\":%d}",
            nombre, categoria.getId(), bodegaId);
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setFechaRegistro(LocalDateTime.now());
        e.setFechaAprobacion(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Categoria obtenerOCrearCategoria() {
        return categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Test-SKU-Cat");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
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
