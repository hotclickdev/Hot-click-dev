package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * «Mis pedidos» del comprador: cada paquete de una compra multi-negocio se serializa
 * con los datos de la compra y del negocio, sin LazyInitializationException
 * (open-in-view=false).
 */
@DisplayName("Mis pedidos del comprador — paquetes de una compra")
class MisPedidosCompradorTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository  pedidoRepository;
    @Autowired private BodegaRepository  bodegaRepository;
    @Autowired private CompraRepository  compraRepository;

    private Pedido paquete1;

    @BeforeEach
    void setUp() {
        Empresa casaLuna = crearEmpresa("Casa Luna SA", "Casa Luna 506", "casa-luna-test", "luna@test.cr");
        Empresa bruma = crearEmpresa("Bruma Café", null, "bruma-test", "bruma@test.cr");
        Bodega bodegaLuna = crearBodega("Bodega Luna", casaLuna, "San José");
        Bodega bodegaBruma = crearBodega("Bodega Bruma", bruma, "Cartago");
        Compra compra = crearCompra("ORD-MP-100", 2);

        paquete1 = crearPaquete(compra, 1, "ORD-MP-100", bodegaLuna, casaLuna);
        crearPaquete(compra, 2, "ORD-MP-100-2", bodegaBruma, bruma);
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        compraRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("GET /api/pedidos/usuario/{id} → cada paquete trae compra, negocio y provincia")
    void listaDelComprador_traeDatosDeCompraYNegocio() throws Exception {
        mockMvc.perform(get("/api/pedidos/usuario/" + testUser.getId())
                .header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.content.length()").value(2))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido == 'ORD-MP-100')].numeroCompra").value("ORD-MP-100"))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido == 'ORD-MP-100')].cantidadPaquetes").value(2))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido == 'ORD-MP-100')].nombreNegocio").value("Casa Luna 506"))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido == 'ORD-MP-100-2')].nombreNegocio").value("Bruma Café"))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido == 'ORD-MP-100-2')].numeroPaquete").value(2))
            .andExpect(jsonPath("$.data.content[?(@.numeroPedido == 'ORD-MP-100-2')].bodega.provincia").value("Cartago"));
    }

    @Test
    @DisplayName("GET /api/pedidos/{id} → el paquete trae número de compra y cantidad de paquetes")
    void detalleDelPaquete_traeDatosDeCompra() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + paquete1.getId())
                .header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroCompra").value("ORD-MP-100"))
            .andExpect(jsonPath("$.data.cantidadPaquetes").value(2))
            .andExpect(jsonPath("$.data.compraId").isNumber())
            .andExpect(jsonPath("$.data.nombreNegocio").value("Casa Luna 506"));
    }

    @Test
    @DisplayName("GET /api/pedidos/{id}/compra → el comprador recibe todos los paquetes de la compra")
    void compraDelComprador_traeTodosLosPaquetes() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + paquete1.getId() + "/compra")
                .header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.length()").value(2))
            .andExpect(jsonPath("$.data[0].numeroPaquete").value(1))
            .andExpect(jsonPath("$.data[1].numeroPedido").value("ORD-MP-100-2"))
            .andExpect(jsonPath("$.data[1].nombreNegocio").value("Bruma Café"));
    }

    @Test
    @DisplayName("GET /api/pedidos/{id}/compra → otro usuario no ve la compra")
    void compraDeOtro_denegada() throws Exception {
        Usuario otro = crearUsuario("otro.comprador@hotclick.cr", "Otro",
            obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));

        mockMvc.perform(get("/api/pedidos/" + paquete1.getId() + "/compra")
                .header("Authorization", tokenPara(otro, Constants.ROL_USUARIO_FINAL)))
            .andExpect(status().isForbidden());
    }

    private Empresa crearEmpresa(String nombre, String comercial, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setNombreComercial(comercial);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Bodega crearBodega(String nombre, Empresa empresa, String provincia) {
        Bodega b = new Bodega();
        b.setNombreBodega(nombre);
        b.setDireccionExacta("Calle 1");
        b.setTelefono("77770000");
        b.setProvincia(provincia);
        b.setAdminCliente(adminUser);
        b.setEmpresa(empresa);
        b.setEstado(Constants.ESTADO_ACTIVO);
        return bodegaRepository.saveAndFlush(b);
    }

    private Compra crearCompra(String numero, int paquetes) {
        Compra c = new Compra();
        c.setNumeroCompra(numero);
        c.setFechaCompra(LocalDateTime.now());
        c.setTotalCompra(30000);
        c.setCantidadPaquetes(paquetes);
        c.setMetodoPago("SINPE");
        c.setUsuarioFinal(testUser);
        c.setEstado(Constants.ESTADO_ACTIVO);
        return compraRepository.saveAndFlush(c);
    }

    private Pedido crearPaquete(Compra compra, int numero, String numeroPedido, Bodega bodega, Empresa empresa) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numeroPedido);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_PAGADO);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setCompra(compra);
        p.setNumeroPaquete(numero);
        p.setSubtotal(15000);
        p.setTotalPedido(15000);
        p.setCostoTotalProductos(10000);
        p.setUtilidadBruta(5000);
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
