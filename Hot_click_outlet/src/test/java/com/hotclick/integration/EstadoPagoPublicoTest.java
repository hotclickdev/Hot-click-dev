package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.payment.EstadoPagoTokenService;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** S4-22 (Frontend #179): estado del pago público con token firmado; sin token válido → 404. */
@DisplayName("[VISITANTE] Estado del pago SINPE/ONVO desde la página de gracias")
class EstadoPagoPublicoTest extends BaseIntegrationTest {

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private EstadoPagoTokenService tokenService;
    @Autowired private GuestCancelTokenService cancelTokenService;

    private Usuario comprador;
    private Bodega bodega;
    private Empresa empresa;

    @BeforeEach
    void setUpDatos() {
        comprador = crearUsuario("comprador-estado-pago@test.cr", "Comprador Estado",
            obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        empresa = new Empresa();
        empresa.setNombreEmpresa("Café Estado SA");
        empresa.setNombreComercial("Café Estado");
        empresa.setSlug("cafe-estado-pago");
        empresa.setCorreoEmpresa("cafe-estado-pago@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Estado Pago");
        bodega.setDireccionExacta("San José");
        bodega.setTelefono("22224444");
        bodega.setAdminCliente(adminUser);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
    }

    @AfterEach
    void tearDownDatos() {
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("Token válido: PENDIENTE con desglose, correo enmascarado y sin plazo por defecto")
    void pendienteSinPlazo() throws Exception {
        Pedido p = crearPedido("ORD-EP-1");
        crearPago(p, Constants.PAGO_PENDIENTE, LocalDateTime.now().minusDays(3));

        mockMvc.perform(get("/api/public/pedidos/ORD-EP-1/estado-pago").param("token", tokenService.emitir("ORD-EP-1")))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", containsString("no-store")))
            .andExpect(jsonPath("$.data.estado", is("PENDIENTE")))
            .andExpect(jsonPath("$.data.numero", is("ORD-EP-1")))
            .andExpect(jsonPath("$.data.tienda", is("Café Estado")))
            .andExpect(jsonPath("$.data.correo", is("c***@test.cr")))
            .andExpect(jsonPath("$.data.cantidadProductos", is(0)))
            .andExpect(jsonPath("$.data.subtotal", is(10000)))
            .andExpect(jsonPath("$.data.envio", is(2500)))
            .andExpect(jsonPath("$.data.envioEtiqueta", is("Envío a domicilio")))
            .andExpect(jsonPath("$.data.total", is(12500)))
            .andExpect(jsonPath("$.data.reservadoHasta").value(nullValue()))
            .andExpect(content().string(not(containsString("comprador-estado-pago@"))));
    }

    @Test
    @DisplayName("CAPTURADO → CONFIRMADO; FALLIDO o CANCELADO → VENCIDO")
    void mapeoDeEstados() throws Exception {
        crearPago(crearPedido("ORD-EP-2"), Constants.PAGO_CAPTURADO, LocalDateTime.now());
        crearPago(crearPedido("ORD-EP-3"), Constants.PAGO_FALLIDO, LocalDateTime.now());
        crearPago(crearPedido("ORD-EP-4"), Constants.PAGO_CANCELADO, LocalDateTime.now());
        consultar("ORD-EP-2").andExpect(jsonPath("$.data.estado", is("CONFIRMADO")));
        consultar("ORD-EP-3").andExpect(jsonPath("$.data.estado", is("VENCIDO")));
        consultar("ORD-EP-4").andExpect(jsonPath("$.data.estado", is("VENCIDO")))
            .andExpect(jsonPath("$.data.reservadoHasta").value(nullValue()));
    }

    @Test
    @DisplayName("Sin token, token de otro pedido, cancelToken o inexistente: 404 con el mismo mensaje")
    void sinTokenValido404() throws Exception {
        crearPago(crearPedido("ORD-EP-5"), Constants.PAGO_PENDIENTE, LocalDateTime.now());
        crearPedido("ORD-EP-6");
        String msg = "No encontramos un pedido con este enlace.";
        mockMvc.perform(get("/api/public/pedidos/ORD-EP-5/estado-pago"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message", is(msg)));
        mockMvc.perform(get("/api/public/pedidos/ORD-EP-5/estado-pago").param("token", "abc"))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message", is(msg)));
        mockMvc.perform(get("/api/public/pedidos/ORD-EP-5/estado-pago").param("token", tokenService.emitir("ORD-EP-6")))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message", is(msg)));
        mockMvc.perform(get("/api/public/pedidos/ORD-EP-5/estado-pago").param("token", cancelTokenService.emitir("ORD-EP-5")))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message", is(msg)));
        mockMvc.perform(get("/api/public/pedidos/ORD-NO-EXISTE/estado-pago").param("token", tokenService.emitir("ORD-NO-EXISTE")))
            .andExpect(status().isNotFound()).andExpect(jsonPath("$.message", is(msg)));
    }

    @Test
    @DisplayName("Pedido eliminado: 404 aunque el token sea válido")
    void eliminado404() throws Exception {
        Pedido p = crearPedido("ORD-EP-7");
        p.setEstado(Constants.ESTADO_ELIMINADO);
        pedidoRepository.saveAndFlush(p);
        consultar("ORD-EP-7").andExpect(status().isNotFound());
    }

    private org.springframework.test.web.servlet.ResultActions consultar(String numero) throws Exception {
        return mockMvc.perform(get("/api/public/pedidos/" + numero + "/estado-pago").param("token", tokenService.emitir(numero)));
    }

    private Pedido crearPedido(String numero) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(comprador);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setCostoEnvio(2500);
        p.setTotalPedido(12500);
        p.setCostoTotalProductos(5000);
        p.setUtilidadBruta(5000);
        p.setMetodoPago(Constants.PROVEEDOR_ONVO);
        p.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }

    private Pago crearPago(Pedido pedido, String estado, LocalDateTime creado) {
        Pago pago = new Pago();
        pago.setPedido(pedido);
        pago.setUsuario(comprador);
        pago.setMonto(pedido.getTotalPedido());
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(estado);
        pago.setMerchantToken(pedido.getNumeroPedido());
        pago.setFechaCreacion(creado);
        pago.setFechaActualizacion(creado);
        return pagoRepository.saveAndFlush(pago);
    }
}
