package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Seguridad sobre #406, LOWs vistos por HTTP:
 * L1 — PUT /api/empresa/perfil/fiscal con regimenIva null respondía 500 (NPE de Set.of().contains(null)); ahora 400 con texto fijo.
 * L2 — POST /api/pos/venta/cotizar: producto inexistente (404) y de otro negocio (400) eran distinguibles (oráculo);
 *      ahora la respuesta es idéntica (404 + texto fijo).
 */
@DisplayName("#406 LOWs | L1 regimenIva null → 400 · L2 cotizar sin oráculo")
class IvaLowsPr406HttpTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private TurnoCajaRepository turnoCajaRepository;

    private Empresa empresa;
    private Empresa otraEmpresa;
    private Producto productoAjeno;
    private String token;

    private Empresa nuevaEmpresa(String nombre, String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("PENDIENTE");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    @BeforeEach
    void setUp() {
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresa = nuevaEmpresa("Iva Lows A", "iva-lows-a");
        otraEmpresa = nuevaEmpresa("Iva Lows B", "iva-lows-b");
        Usuario dueno = crearUsuario("iva-lows-dueno@test.cr", "Dueno Iva Lows", rolEmp);
        dueno.setEmpresa(empresa);
        dueno = usuarioRepository.saveAndFlush(dueno);
        TurnoCaja turno = new TurnoCaja();
        turno.setUsuario(dueno);
        turno.setEmpresa(empresa);
        turnoCajaRepository.saveAndFlush(turno);
        token = "Bearer " + jwtUtil.generateToken(dueno.getCorreo(), dueno.getId(), Constants.ROL_EMPRENDEDOR, empresa.getId(), empresa.getSlug());

        Categoria categoria = categoriaRepository.findAll().stream().findFirst().orElseGet(() -> {
            Categoria c = new Categoria();
            c.setNombreCategoria("Cat-IvaLows");
            c.setEstado(Constants.ESTADO_ACTIVO);
            c.setAdminCliente(adminUser);
            return categoriaRepository.saveAndFlush(c);
        });
        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Despacho Iva Lows B");
        bodega.setDireccionExacta("Calle 1");
        bodega.setTelefono("88880000");
        bodega.setHorarioApertura(LocalTime.of(8, 0));
        bodega.setHorarioCierre(LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(otraEmpresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);

        Producto p = new Producto();
        p.setNombreProducto("Producto de otro negocio");
        p.setSku("SKU-IVA-LOWS-B");
        p.setPrecioVenta(10000);
        p.setPrecioCompra(7000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setCategoria(categoria);
        p.setEmpresa(otraEmpresa);
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        productoAjeno = productoRepository.saveAndFlush(p);
    }

    @AfterEach
    void tearDown() {
        turnoCajaRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.deleteAll();
        usuarioRepository.findAll().stream().filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("L1 | PUT /fiscal con regimenIva null → 400 con texto fijo (no 500)")
    void regimenIvaNull_400() throws Exception {
        mockMvc.perform(put("/api/empresa/perfil/fiscal").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content("{\"regimenIva\":null}"))
            .andExpect(status().isBadRequest())
            .andExpect(content().string(org.hamcrest.Matchers.containsString("Régimen de IVA inválido: elegí SIMPLIFICADO o TRADICIONAL.")));
    }

    private MvcResult cotizar(long productoId) throws Exception {
        String body = "{\"metodoPago\":\"EFECTIVO\",\"descuentoGlobal\":0,\"items\":[{\"productoId\":" + productoId
            + ",\"cantidad\":1,\"precioUnitario\":10000}]}";
        return mockMvc.perform(post("/api/pos/venta/cotizar").header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON).content(body)).andReturn();
    }

    @Test
    @DisplayName("L2 | cotizar: producto inexistente y de otro negocio dan el mismo status y el mismo cuerpo")
    void cotizarNoEsOraculo() throws Exception {
        MvcResult ajeno = cotizar(productoAjeno.getId());
        MvcResult inexistente = cotizar(productoAjeno.getId() + 100_000L);

        assertThat(ajeno.getResponse().getStatus()).isEqualTo(404);
        assertThat(inexistente.getResponse().getStatus()).isEqualTo(ajeno.getResponse().getStatus());
        String cuerpoAjeno = ajeno.getResponse().getContentAsString();
        assertThat(cuerpoAjeno).contains("Producto no encontrado");
        // El cuerpo es idéntico salvo la marca de tiempo de la respuesta.
        assertThat(sinTimestamp(inexistente.getResponse().getContentAsString())).isEqualTo(sinTimestamp(cuerpoAjeno));
    }

    private static String sinTimestamp(String json) {
        return json.replaceAll("\"timestamp\":\"[^\"]*\"", "\"timestamp\":\"-\"");
    }
}
