package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import com.hotclick.utils.TokenSeguimientoPedido;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * GET /api/public/pedidos/seguimiento/{token} — seguimiento de pedido sin cuenta (Figma 44:1701).
 * Cubre el camino feliz multivendedor y los casos de seguridad (token inválido, id numérico,
 * pedido eliminado, campos internos y datos personales fuera de la respuesta).
 */
@DisplayName("Seguimiento público de pedido por token")
class SeguimientoPedidoPublicoTest extends BaseIntegrationTest {

    private static final String URL = "/api/public/pedidos/seguimiento/";
    private static final String CORREO_COMPRADOR = "compradora.invitada@correo.cr";
    private static final String DIRECCION_BODEGA = "Barrio Escalante, 200 m norte del parque";

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private ProductoRepository productoRepository;
    @Autowired private CategoriaRepository categoriaRepository;

    private Usuario comprador;
    private Empresa casaLuna;
    private Categoria categoria;
    private Pedido paquete1;
    private Pedido paquete2;

    @BeforeEach
    void setUpPedidos() {
        comprador = crearUsuario(CORREO_COMPRADOR, "Invitado", obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        comprador.setIdentificacion("GUEST-abc123def4567");
        comprador.setTelefono("87654321");
        comprador = usuarioRepository.saveAndFlush(comprador);

        casaLuna = new Empresa();
        casaLuna.setNombreEmpresa("Casa Luna 506");
        casaLuna.setSlug("casa-luna-506-seg");
        casaLuna.setCorreoEmpresa("ventas@casaluna.cr");
        casaLuna.setEstadoEmpresa("ACTIVO");
        casaLuna.setFechaRegistro(LocalDateTime.now());
        casaLuna = empresaRepository.saveAndFlush(casaLuna);

        categoria = new Categoria();
        categoria.setNombreCategoria("Test-Cat-Seguimiento");
        categoria.setEstado(Constants.ESTADO_ACTIVO);
        categoria.setAdminCliente(adminUser);
        categoria = categoriaRepository.saveAndFlush(categoria);

        Bodega sanJose = crearBodega("Bodega Casa Luna", "San José", casaLuna);
        Bodega cartago = crearBodega("Bruma Café", "Cartago", null);
        Producto sillon = crearProducto("Sillón verde", "SKU-INTERNO-777", sanJose);

        String grupo = "GP-SEGUIMIENTO-TEST-01";
        paquete1 = crearPedido("ORD-10482", grupo, sanJose, casaLuna, Constants.PEDIDO_ENVIADO, 60000);
        paquete1.setNumeroGuia("RR123456789CR");
        agregarItem(paquete1, sillon, 2);
        paquete1 = pedidoRepository.saveAndFlush(paquete1);

        paquete2 = crearPedido("ORD-10483", grupo, cartago, null, Constants.PEDIDO_EN_PREPARACION, 35900);
        paquete2 = pedidoRepository.saveAndFlush(paquete2);
    }

    @AfterEach
    void tearDownPedidos() {
        pedidoRepository.deleteAll();
        productoRepository.deleteAll();
        bodegaRepository.deleteAll();
        categoriaRepository.delete(categoria);
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Todo pedido nuevo recibe un token aleatorio de 64 hex, distinto por paquete")
    void tokenGeneradoAlPersistir() {
        assertThat(TokenSeguimientoPedido.formatoValido(paquete1.getTokenSeguimiento())).isTrue();
        assertThat(TokenSeguimientoPedido.formatoValido(paquete2.getTokenSeguimiento())).isTrue();
        assertThat(paquete1.getTokenSeguimiento()).isNotEqualTo(paquete2.getTokenSeguimiento());
    }

    @Test
    @DisplayName("Sin sesión, el token de cualquier paquete muestra todo el checkout, un paquete por vendedor")
    void tokenValidoMuestraGrupo() throws Exception {
        mockMvc.perform(get(URL + paquete2.getTokenSeguimiento()))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
            .andExpect(jsonPath("$.data.numeroPedido").value("ORD-10482"))
            .andExpect(jsonPath("$.data.total").value(95900))
            .andExpect(jsonPath("$.data.invitarCrearCuenta").value(true))
            .andExpect(jsonPath("$.data.paquetes.length()").value(2))
            .andExpect(jsonPath("$.data.paquetes[0].tienda").value("Casa Luna 506"))
            .andExpect(jsonPath("$.data.paquetes[0].origen").value("San José"))
            .andExpect(jsonPath("$.data.paquetes[0].estado").value("ENVIADO"))
            .andExpect(jsonPath("$.data.paquetes[0].numeroGuia").value("RR123456789CR"))
            .andExpect(jsonPath("$.data.paquetes[0].courier").value("CORREOS_CR"))
            .andExpect(jsonPath("$.data.paquetes[0].urlRastreo").value("https://rastreo.correos.go.cr/?codigo=RR123456789CR"))
            .andExpect(jsonPath("$.data.paquetes[0].productos[0].nombre").value("Sillón verde"))
            .andExpect(jsonPath("$.data.paquetes[0].productos[0].cantidad").value(2))
            .andExpect(jsonPath("$.data.paquetes[1].tienda").value("Bruma Café"))
            .andExpect(jsonPath("$.data.paquetes[1].estado").value("EN_PREPARACION"))
            .andExpect(jsonPath("$.data.paquetes[1].numeroGuia").doesNotExist());
    }

    @Test
    @DisplayName("La respuesta no filtra costos, márgenes, ids, sku, token, grupo ni datos personales")
    void noFiltraCamposInternos() throws Exception {
        MvcResult res = mockMvc.perform(get(URL + paquete1.getTokenSeguimiento()))
            .andExpect(status().isOk())
            .andReturn();
        String body = res.getResponse().getContentAsString();

        assertThat(body)
            .doesNotContain("costoTotalProductos", "utilidadBruta", "margenGanancia", "precioCompra",
                "costoUnitario", "utilidadItem", "\"id\"", "idPedido", "sku", "SKU-INTERNO-777", "numeroLocal",
                "grupoPago", "GP-SEGUIMIENTO-TEST-01", "tokenSeguimiento", paquete1.getTokenSeguimiento(),
                "usuarioFinal", CORREO_COMPRADOR, "87654321", "GUEST-", DIRECCION_BODEGA,
                "ventas@casaluna.cr", "metodoPago", "SINPE", "ORD-10483", "notas");
    }

    @Test
    @DisplayName("Token inexistente, mal formado o el id numérico → 404 con el mismo mensaje genérico")
    void tokenInvalidoRespuestaGenerica() throws Exception {
        String inexistente = TokenSeguimientoPedido.generar();
        for (String token : new String[] { inexistente, "abc", paquete1.getId().toString(),
                paquete1.getTokenSeguimiento().toUpperCase(), "ORD-10482" }) {
            mockMvc.perform(get(URL + token))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("No encontramos un pedido con este enlace."))
                .andExpect(jsonPath("$.data").doesNotExist());
        }
    }

    @Test
    @DisplayName("Pedido eliminado → 404 genérico, igual que si no existiera")
    void pedidoEliminadoNoSeMuestra() throws Exception {
        paquete1.setEstado(Constants.ESTADO_ELIMINADO);
        pedidoRepository.saveAndFlush(paquete1);

        mockMvc.perform(get(URL + paquete1.getTokenSeguimiento()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("No encontramos un pedido con este enlace."));
    }

    @Test
    @DisplayName("El token nunca sale en la API autenticada del pedido")
    void tokenNoSeSerializaEnApiAutenticada() throws Exception {
        String body = mockMvc.perform(get("/api/pedidos/" + paquete1.getId()).header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("tokenSeguimiento", paquete1.getTokenSeguimiento());
    }

    @Test
    @DisplayName("Tracking no https (p. ej. javascript:) no llega como enlace")
    void urlTrackingInseguraSeDescarta() throws Exception {
        paquete1.setUrlTracking("javascript:alert(1)");
        paquete1.setFechaEntregaReal(LocalDate.of(2026, 9, 24));
        pedidoRepository.saveAndFlush(paquete1);

        mockMvc.perform(get(URL + paquete1.getTokenSeguimiento()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.paquetes[0].courier").value("ENTREGA_DIRECTA"))
            .andExpect(jsonPath("$.data.paquetes[0].urlRastreo").doesNotExist())
            .andExpect(jsonPath("$.data.paquetes[0].fechaEntrega").value("2026-09-24"));
    }

    @Test
    @DisplayName("Rate limit por IP: más de 20 consultas por minuto → 429")
    void rateLimitPorIp() throws Exception {
        String token = TokenSeguimientoPedido.generar();
        for (int i = 0; i < 20; i++) {
            mockMvc.perform(get(URL + token)).andExpect(status().isNotFound());
        }
        mockMvc.perform(get(URL + token)).andExpect(status().isTooManyRequests());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private Bodega crearBodega(String nombre, String provincia, Empresa empresa) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setProvincia(provincia);
        b.setDireccionExacta(DIRECCION_BODEGA);
        b.setTelefono("22223333");
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(17, 0));
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Producto crearProducto(String nombre, String sku, Bodega bodega) {
        Producto p = new Producto();
        p.setNombreProducto(nombre);
        p.setSku(sku);
        p.setPrecioVenta(30000);
        p.setPrecioCompra(12000);
        p.setStockActual(5);
        p.setStockMinimo(1);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setVisibleCatalogo(true);
        p.setCategoria(categoria);
        p.setEmpresa(bodega.getEmpresa());
        p.setBodega(bodega);
        p.setAdminCliente(adminUser);
        p.setFechaCreacion(LocalDateTime.now());
        p.setImagenPrincipalUrl("https://hotclick-media.s3.amazonaws.com/sillon.jpg");
        return productoRepository.saveAndFlush(p);
    }

    private Pedido crearPedido(String numero, String grupo, Bodega bodega, Empresa empresa, String estado, int total) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setGrupoPago(grupo);
        p.setFechaPedido(LocalDateTime.of(2026, 9, 26, 10, 30));
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(comprador);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(total);
        p.setTotalPedido(total);
        p.setCostoTotalProductos(total / 2);
        p.setUtilidadBruta(total / 2);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        p.setNotas("Casa esquinera portón negro");
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }

    private void agregarItem(Pedido pedido, Producto producto, int cantidad) {
        PedidoItem item = new PedidoItem();
        item.setPedido(pedido);
        item.setProducto(producto);
        item.setCantidad(cantidad);
        item.setPrecioUnitarioMomento(producto.getPrecioVenta());
        item.setCostoUnitarioMomento(producto.getPrecioCompra());
        item.setSubtotalItem(producto.getPrecioVenta() * cantidad);
        item.setUtilidadItem((producto.getPrecioVenta() - producto.getPrecioCompra()) * cantidad);
        item.setDescuentoAplicado(0);
        item.setEstado(Constants.ESTADO_ACTIVO);
        pedido.getItems().add(item);
    }
}
