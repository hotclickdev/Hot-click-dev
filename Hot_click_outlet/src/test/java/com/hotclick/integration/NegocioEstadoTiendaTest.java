package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Panel — estado de la tienda del negocio")
class NegocioEstadoTiendaTest extends BaseIntegrationTest {

    private static final String URL = "/api/negocio/estado-tienda";

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Empresa empresa;
    private Bodega bodega;
    private String token;

    @BeforeEach
    void setUp() {
        empresa = new Empresa();
        empresa.setNombreEmpresa("Estado Tienda Test");
        empresa.setSlug("estado-tienda-test");
        empresa.setCorreoEmpresa("estado-tienda@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now());
        empresa = empresaRepository.saveAndFlush(empresa);
        Rol rol = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        Usuario u = crearUsuario("estado-tienda-v@test.cr", "Vendedor", rol);
        u.setEmpresa(empresa);
        u = usuarioRepository.saveAndFlush(u);
        token = tokenPara(u, Constants.ROL_EMPRENDEDOR);
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega ET");
        b.setDireccionExacta("Centro");
        b.setTelefono("88887777");
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(17, 0));
        b.setAdminCliente(testUser);
        b.setEmpresa(empresa);
        bodega = bodegaRepository.saveAndFlush(b);
    }

    @AfterEach
    void tearDown() {
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        usuarioRepository.findAll().stream()
            .filter(u -> u.getEmpresa() != null)
            .forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    private void pedido(String numero, String estado) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(testUser);
        p.setEmpresa(empresa);
        p.setBodega(bodega);
        p.setSubtotal(1000);
        p.setTotalPedido(1000);
        p.setCostoTotalProductos(700);
        p.setUtilidadBruta(300);
        p.setMetodoPago("EFECTIVO");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        pedidoRepository.saveAndFlush(p);
    }

    @Test
    void activa_conPedidosEnCurso() throws Exception {
        pedido("ORD-ET1", Constants.PEDIDO_PENDIENTE);
        pedido("ORD-ET2", Constants.PEDIDO_ENVIADO);
        pedido("ORD-ET3", Constants.PEDIDO_ENTREGADO);
        pedido("ORD-ET4", Constants.PEDIDO_CANCELADO);
        mockMvc.perform(get(URL).header("Authorization", token))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.estado").value("ACTIVA"))
            .andExpect(jsonPath("$.data.reactivada").value(false))
            .andExpect(jsonPath("$.data.plan").value("GRATUITO"))
            .andExpect(jsonPath("$.data.montoMensualidad").doesNotExist())
            .andExpect(jsonPath("$.data.diasGracia").doesNotExist())
            .andExpect(jsonPath("$.data.pedidosEnCurso").value(2));
    }

    @Test
    void tiendaPausada() throws Exception {
        empresa.setTiendaPausada(true);
        empresaRepository.saveAndFlush(empresa);
        mockMvc.perform(get(URL).header("Authorization", token))
            .andExpect(jsonPath("$.data.estado").value("PAUSADA"));
    }

    @Test
    void comprador_403() throws Exception {
        mockMvc.perform(get(URL).header("Authorization", userToken)).andExpect(status().isForbidden());
    }

    @Test
    void anonimo_401() throws Exception {
        mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
    }
}
