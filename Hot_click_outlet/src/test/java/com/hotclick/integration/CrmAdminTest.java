package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** CRM admin fase 0–1: solo ADMIN, compras con imagen/texto, fichas, sin costo/margen ni tokens. */
@DisplayName("[CRM] Endpoints admin de compras y fichas")
class CrmAdminTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;
    @Autowired private AuditoriaAdminRepository auditoriaAdminRepository;

    private Empresa empresa;
    private Categoria categoria;
    private Pedido pagado;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("CRM Luna SA");
        e.setNombreComercial("Casa Luna CRM");
        e.setSlug("casa-luna-crm");
        e.setCorreoEmpresa("crm-luna@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(e);

        categoria = new Categoria();
        categoria.setNombreCategoria("Test-Cat-CRM");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        Bodega b = new Bodega();
        b.setNombreBodega("Bodega CRM");
        b.setDireccionExacta("Calle 1");
        b.setTelefono("22223333");
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);

        Producto p = new Producto();
        p.setNombreProducto("Sillón verde");
        p.setDescripcionCorta("Tapizado en lino");
        p.setSku("CRM-SKU-1");
        p.setPrecioVenta(30000);
        p.setPrecioCompra(12000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(empresa);
        p.setBodega(b);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        p.setImagenPrincipalUrl("https://hotclick-media.s3.amazonaws.com/sillon.jpg");
        p = productoRepository.saveAndFlush(p);

        pagado = crearPedido("CRM-1", b, Constants.PEDIDO_PAGADO, 60000);
        PedidoItem item = new PedidoItem();
        item.setPedido(pagado);
        item.setProducto(p);
        item.setCantidad(2);
        item.setPrecioUnitarioMomento(30000);
        item.setCostoUnitarioMomento(12000);
        item.setSubtotalItem(60000);
        item.setUtilidadItem(36000);
        item.setDescuentoAplicado(0);
        item.setEstado(Constants.ESTADO_ACTIVO);
        pagado.getItems().add(item);
        pagado = pedidoRepository.saveAndFlush(pagado);
        crearPedido("CRM-2", b, Constants.PEDIDO_PENDIENTE, 9900);
    }

    @AfterEach
    void tearDown() {
        auditoriaAdminRepository.deleteAll();
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.delete(categoria);
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Comprador, emprendedor y anónimo → 403/401 en los tres endpoints")
    void noAdmin_403() throws Exception {
        String emprendedor = "Bearer " + jwtUtil.generateToken(testUser.getCorreo(), testUser.getId(),
            Constants.ROL_EMPRENDEDOR, empresa.getId(), empresa.getSlug());
        for (String url : new String[]{"/api/admin/crm/compras", "/api/admin/crm/compradores/" + testUser.getId(),
                "/api/admin/crm/negocios/" + empresa.getId()}) {
            mockMvc.perform(get(url).header("Authorization", userToken)).andExpect(status().isForbidden());
            mockMvc.perform(get(url).header("Authorization", emprendedor)).andExpect(status().isForbidden());
            int anon = mockMvc.perform(get(url)).andReturn().getResponse().getStatus();
            assertThat(anon).isIn(401, 403);
        }
    }

    @Test
    @DisplayName("Compras: paginado, imagen y texto del producto, montos de la base, sin costo/margen/token")
    void compras_conImagenYTexto() throws Exception {
        String body = mockMvc.perform(get("/api/admin/crm/compras?size=500").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.size").value(50))
            .andExpect(jsonPath("$.data.totalElements").value(2))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido=='CRM-1')].lineas[0].nombre").value(hasItem("Sillón verde")))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido=='CRM-1')].lineas[0].descripcion").value(hasItem("Tapizado en lino")))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido=='CRM-1')].lineas[0].imagenUrl")
                .value(hasItem("https://hotclick-media.s3.amazonaws.com/sillon.jpg")))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido=='CRM-1')].total").value(hasItem(60000)))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido=='CRM-1')].negocio.nombre").value(hasItem("Casa Luna CRM")))
            .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("costo", "utilidad", "margen", "token", "12000", "36000",
            testUser.getCorreo());
    }

    @Test
    @DisplayName("Filtro por negocio: solo devuelve pedidos de esa empresa")
    void compras_filtroEmpresa() throws Exception {
        mockMvc.perform(get("/api/admin/crm/compras?empresaId=" + (empresa.getId() + 999))
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    @DisplayName("Ficha de comprador: contacto enmascarado, total solo de pedidos pagados y queda auditada")
    void fichaComprador() throws Exception {
        mockMvc.perform(get("/api/admin/crm/compradores/" + testUser.getId()).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.correo").value("t***@hotclick.cr"))
            .andExpect(jsonPath("$.data.telefono").value("••••8888"))
            .andExpect(jsonPath("$.data.resumen.pedidos").value(2))
            .andExpect(jsonPath("$.data.resumen.pedidosPagados").value(1))
            .andExpect(jsonPath("$.data.resumen.totalPagado").value(60000))
            .andExpect(jsonPath("$.data.compras.content", hasSize(2)));
        assertThat(auditoriaAdminRepository.findAll()).anySatisfy(a -> {
            assertThat(a.getAccion()).isEqualTo("CRM_VER_COMPRADOR");
            assertThat(a.getAdminId()).isEqualTo(adminUser.getId());
        });
    }

    @Test
    @DisplayName("Ficha de negocio: productos activos, compradores distintos; sin pagos el total es null")
    void fichaNegocio() throws Exception {
        mockMvc.perform(get("/api/admin/crm/negocios/" + empresa.getId()).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombre").value("Casa Luna CRM"))
            .andExpect(jsonPath("$.data.productosActivos").value(1))
            .andExpect(jsonPath("$.data.resumen.compradoresDistintos").value(1))
            .andExpect(jsonPath("$.data.resumen.totalPagado").value(60000));

        pedidoRepository.findAll().forEach(p -> { p.setEstadoPedido(Constants.PEDIDO_PENDIENTE); pedidoRepository.save(p); });
        mockMvc.perform(get("/api/admin/crm/negocios/" + empresa.getId()).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.resumen.totalPagado").value(nullValue()));
    }

    @Test
    @DisplayName("Ficha inexistente → 404")
    void fichaInexistente_404() throws Exception {
        mockMvc.perform(get("/api/admin/crm/negocios/987654").header("Authorization", adminToken))
            .andExpect(status().isNotFound());
    }


    @Test
    @DisplayName("QA-131-3: la consola separa lo pagado de lo pendiente por negocio (montos de los pedidos)")
    void consolaContactos_pagadoYPendiente() throws Exception {
        crearPedido("CRM-CANC", bodegaRepository.findAll().get(0), Constants.PEDIDO_CANCELADO, 5000);
        mockMvc.perform(get("/api/admin/consola/crm").header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.contactos[?(@.empresaId == " + empresa.getId() + ")].pagado").value(org.hamcrest.Matchers.contains(60000)))
            .andExpect(jsonPath("$.data.contactos[?(@.empresaId == " + empresa.getId() + ")].pendiente").value(org.hamcrest.Matchers.contains(9900)));
    }

    private Pedido crearPedido(String numero, Bodega bodega, String estado, int total) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(total);
        p.setTotalPedido(total);
        p.setCostoTotalProductos(total / 2);
        p.setUtilidadBruta(total / 2);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }
}
