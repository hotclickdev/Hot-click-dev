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
import org.springframework.http.MediaType;

import java.time.LocalDateTime;
import java.time.LocalTime;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@DisplayName("Esqueletos S5 — autorización, validación y 501 PENDIENTE_DECISION_DUENO")
class EsqueletosPendientesDuenoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private String tokenEmp;
    private Pedido pedido;

    @BeforeEach
    void setUp() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Esqueleto");
        e.setSlug("esqueleto");
        e.setCorreoEmpresa("esqueleto@test.cr");
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e = empresaRepository.saveAndFlush(e);
        Usuario v = crearUsuario("esq-v@test.cr", "Vendedor", obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5));
        v.setEmpresa(e);
        v = usuarioRepository.saveAndFlush(v);
        tokenEmp = tokenPara(v, Constants.ROL_EMPRENDEDOR);

        Bodega b = new Bodega();
        b.setNombreBodega("B");
        b.setDireccionExacta("Centro");
        b.setTelefono("88887777");
        b.setHorarioApertura(LocalTime.of(8, 0));
        b.setHorarioCierre(LocalTime.of(17, 0));
        b.setAdminCliente(testUser);
        b.setEmpresa(e);
        b = bodegaRepository.saveAndFlush(b);

        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-ESQ");
        p.setFechaPedido(LocalDateTime.now());
        p.setEstadoPedido(Constants.PEDIDO_ENTREGADO);
        p.setUsuarioFinal(testUser);
        p.setEmpresa(e);
        p.setBodega(b);
        p.setSubtotal(1000);
        p.setTotalPedido(1000);
        p.setCostoTotalProductos(700);
        p.setUtilidadBruta(300);
        p.setMetodoPago("EFECTIVO");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        pedido = pedidoRepository.saveAndFlush(p);
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

    @Test
    void reembolso_comprador_dueno_501() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedido.getId() + "/reembolso").header("Authorization", userToken))
            .andExpect(status().isNotImplemented())
            .andExpect(jsonPath("$.code").value("PENDIENTE_DECISION_DUENO"));
    }

    @Test
    void reembolso_otraPersona_403_inexistente_404() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + pedido.getId() + "/reembolso").header("Authorization", tokenEmp))
            .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/pedidos/999999/reembolso").header("Authorization", userToken))
            .andExpect(status().isNotFound());
    }

    @Test
    void reembolso_sinItems_400() throws Exception {
        mockMvc.perform(post("/api/pedidos/" + pedido.getId() + "/reembolso").header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"itemIds\":[],\"motivo\":\"OTRO\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("SIN_ITEMS"));
    }

    @Test
    void reembolsosNegocio_comprador403_vistaInvalida400_rechazoSinMotivo400() throws Exception {
        mockMvc.perform(get("/api/negocio/reembolsos").header("Authorization", userToken)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/negocio/reembolsos").param("vista", "x").header("Authorization", tokenEmp))
            .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/negocio/reembolsos/1/rechazar").header("Authorization", tokenEmp)
                .contentType(MediaType.APPLICATION_JSON).content("{\"motivo\":\"x\"}"))
            .andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/negocio/reembolsos").header("Authorization", tokenEmp)).andExpect(status().isNotImplemented());
    }

    @Test
    void contracargosYFacturacion_soloAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/contracargos").header("Authorization", tokenEmp)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/facturacion/por-facturar").header("Authorization", tokenEmp)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/contracargos").header("Authorization", adminToken)).andExpect(status().isNotImplemented());
        mockMvc.perform(get("/api/admin/facturacion/por-facturar").header("Authorization", adminToken)).andExpect(status().isNotImplemented());
    }

    @Test
    void facturacion_claveInvalida_400() throws Exception {
        mockMvc.perform(multipart("/api/admin/facturacion/emitidas").param("clave", "123").header("Authorization", adminToken))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("CLAVE_INVALIDA"));
    }

    @Test
    void legal_publico404_documentoInvalido400_adminSoloAdmin() throws Exception {
        mockMvc.perform(get("/api/public/legal/terminos/resumen")).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/public/legal/otro/resumen")).andExpect(status().isBadRequest());
        mockMvc.perform(get("/api/admin/legal/terminos/resumen").header("Authorization", tokenEmp)).andExpect(status().isForbidden());
    }
}
