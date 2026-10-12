package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@DisplayName("P8-01 | CRM: un negocio no lee ni cambia datos de CRM de otro")
class CrmClienteCompartidoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Empresa empA, empB;
    private Usuario cliente;
    private String tokenA, tokenB;
    private Pedido pedidoA, pedidoB;

    @BeforeEach
    void setUp() {
        empA = empresa("p801-a");
        empB = empresa("p801-b");
        cliente = crearUsuario("p801-cli@test.cr", "Compartido", obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        cliente.setEmpresaRegistro(empA);
        cliente.setNotasInternas("nota secreta de A");
        cliente.setPuntosFidelidad(77);
        cliente = usuarioRepository.saveAndFlush(cliente);
        pedidoA = pedido("P801-A", empA);
        pedidoB = pedido("P801-B", empB);
        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario va = crearUsuario("p801-va@test.cr", "VA", rolEmp);
        Usuario vb = crearUsuario("p801-vb@test.cr", "VB", rolEmp);
        tokenA = "Bearer " + jwtUtil.generateToken(va.getCorreo(), va.getId(), Constants.ROL_EMPRENDEDOR, empA.getId(), empA.getSlug());
        tokenB = "Bearer " + jwtUtil.generateToken(vb.getCorreo(), vb.getId(), Constants.ROL_EMPRENDEDOR, empB.getId(), empB.getSlug());
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_cliente_empresa_tb");
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresaRegistro(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    void negocioBNoVeNiCambiaCrmDeA() throws Exception {
        String ficha = "/api/crm/clientes/" + cliente.getId();
        mockMvc.perform(get(ficha).header("Authorization", tokenB))
            .andExpect(status().isOk())
            .andExpect(content().string(not(containsString("nota secreta"))))
            .andExpect(jsonPath("$.data.puntosFidelidad").value(0))
            .andExpect(jsonPath("$.data.pedidos[*].numeroPedido", contains("P801-B")));
        // P8-01 residual: contacto enmascarado en la ficha compartida
        mockMvc.perform(get(ficha).header("Authorization", tokenB))
            .andExpect(jsonPath("$.data.correo").value("p***@test.cr"))
            .andExpect(jsonPath("$.data.compartido").value(true));
        // V171: B guarda sus notas/puntos en su propia ficha, sin tocar las de A; crédito sigue 403
        mockMvc.perform(put(ficha).header("Authorization", tokenB).contentType(MediaType.APPLICATION_JSON)
                .content("{\"notasInternas\":\"nota de B\",\"puntosFidelidad\":5}"))
            .andExpect(status().isOk());
        mockMvc.perform(put(ficha).header("Authorization", tokenB).contentType(MediaType.APPLICATION_JSON)
                .content("{\"limiteCredito\":1000}"))
            .andExpect(status().isForbidden());
        mockMvc.perform(get(ficha).header("Authorization", tokenB))
            .andExpect(jsonPath("$.data.notasInternas").value("nota de B"))
            .andExpect(jsonPath("$.data.puntosFidelidad").value(5));
        mockMvc.perform(get(ficha).header("Authorization", tokenA))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.notasInternas").value("nota secreta de A"))
            .andExpect(jsonPath("$.data.puntosFidelidad").value(77))
            .andExpect(jsonPath("$.data.correo").value("p801-cli@test.cr"))
            .andExpect(jsonPath("$.data.pedidos[*].numeroPedido", contains("P801-A")));
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug);
        e.setNombreComercial(slug);
        e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }

    private Pedido pedido(String numero, Empresa e) {
        Bodega b = new Bodega();
        b.setNombreBodega("B " + numero);
        b.setDireccionExacta("Calle 1");
        b.setTelefono("22223333");
        b.setAdminCliente(adminUser);
        b.setEmpresa(e);
        b.setEstado(Constants.ESTADO_ACTIVO);
        b = bodegaRepository.saveAndFlush(b);
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
        p.setUsuarioFinal(cliente);
        p.setBodega(b);
        p.setEmpresa(e);
        p.setSubtotal(1000);
        p.setTotalPedido(1000);
        p.setCostoTotalProductos(500);
        p.setUtilidadBruta(500);
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
