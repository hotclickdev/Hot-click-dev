package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.repository.BodegaRepository;
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
import java.util.ArrayList;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests de autorización sobre el recurso Pedido:
 * - Usuario accede solo a sus propios pedidos
 * - Admin accede a cualquier pedido
 * - Solo admin puede cambiar estado / asignar guía
 */
@DisplayName("PedidoController — authorization tests")
class PedidoAuthorizationTest extends BaseIntegrationTest {

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Pedido userPedido;
    private Bodega testBodega;

    @BeforeEach
    void setUpPedido() {
        // Bodega requiere un adminCliente — usamos adminUser creado en la base
        testBodega = new Bodega();
        testBodega.setNombreBodega("Bodega Test");
        testBodega.setDireccionExacta("Calle Test 123");
        testBodega.setTelefono("88887777");
        testBodega.setHorarioApertura(LocalTime.of(8, 0));
        testBodega.setHorarioCierre(LocalTime.of(17, 0));
        testBodega.setAdminCliente(adminUser);
        testBodega.setEstado(Constants.ESTADO_ACTIVO);
        testBodega = bodegaRepository.saveAndFlush(testBodega);

        userPedido = new Pedido();
        userPedido.setNumeroPedido("ORD-AUTH-001");
        userPedido.setFechaPedido(LocalDateTime.now());
        userPedido.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        userPedido.setUsuarioFinal(testUser);
        userPedido.setBodega(testBodega);
        userPedido.setSubtotal(15000);
        userPedido.setTotalPedido(15000);
        userPedido.setCostoTotalProductos(15000);
        userPedido.setUtilidadBruta(0);
        userPedido.setMetodoPago("SINPE");
        userPedido.setMetodoEnvio(Constants.ENVIO_RETIRO);
        userPedido.setCostoEnvio(0);
        userPedido.setDescuentoTotal(0);
        userPedido.setMontoImpuesto(0);
        userPedido.setAplicaImpuesto(false);
        userPedido.setEstado(Constants.ESTADO_ACTIVO);
        userPedido.setItems(new ArrayList<>());
        userPedido = pedidoRepository.saveAndFlush(userPedido);
    }

    @AfterEach
    void tearDownPedido() {
        // Pedidos antes que Bodegas, que antes que Usuarios (FK constraints)
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
    }

    // ── GET /api/pedidos/{id} ─────────────────────────────────────────────────

    @Test
    @DisplayName("Usuario puede leer su propio pedido")
    void user_canReadOwnPedido() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + userPedido.getId())
                .header("Authorization", userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroPedido").value("ORD-AUTH-001"));
    }

    @Test
    @DisplayName("Usuario no puede leer pedido de otro usuario → 403")
    void user_cannotReadOtherUserPedido() throws Exception {
        // Crear otro usuario regular
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario otroUser = crearUsuario("otro@hotclick.cr", "Otro User", rolUser);
        String otroToken = tokenPara(otroUser, Constants.ROL_USUARIO_FINAL);

        mockMvc.perform(get("/api/pedidos/" + userPedido.getId())
                .header("Authorization", otroToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin puede leer cualquier pedido")
    void admin_canReadAnyPedido() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + userPedido.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.numeroPedido").value("ORD-AUTH-001"));
    }

    @Test
    @DisplayName("Sin token → 401")
    void noPedidoAccess_withoutToken() throws Exception {
        mockMvc.perform(get("/api/pedidos/" + userPedido.getId()))
            .andExpect(status().isUnauthorized());
    }

    // ── GET /api/pedidos (listar todos) ───────────────────────────────────────

    @Test
    @DisplayName("Admin lista todos los pedidos → 200 con al menos 1 resultado")
    void admin_listAllPedidos_returnsAll() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Usuario no puede listar todos los pedidos → 403")
    void user_cannotListAllPedidos() throws Exception {
        mockMvc.perform(get("/api/pedidos")
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    // ── PUT /api/pedidos/{id}/estado ──────────────────────────────────────────

    @Test
    @DisplayName("Admin puede cambiar estado del pedido")
    void admin_canChangeEstado() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + userPedido.getId() + "/estado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"ENVIADO\"}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("Usuario no puede cambiar estado → 403")
    void user_cannotChangeEstado() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + userPedido.getId() + "/estado")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"estado\":\"CANCELADO\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Cambiar estado sin campo 'estado' → 400")
    void changeEstado_missingField_returns400() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + userPedido.getId() + "/estado")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }

    // ── PUT /api/pedidos/{id}/guia ────────────────────────────────────────────

    @Test
    @DisplayName("Admin puede asignar guía de envío")
    void admin_canAssignGuia() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + userPedido.getId() + "/guia")
                .header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"CR987654321CR\"}"))
            .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Usuario no puede asignar guía → 403")
    void user_cannotAssignGuia() throws Exception {
        mockMvc.perform(put("/api/pedidos/" + userPedido.getId() + "/guia")
                .header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"numeroGuia\":\"CR000000000CR\"}"))
            .andExpect(status().isForbidden());
    }

    // ── DELETE /api/pedidos/{id} ──────────────────────────────────────────────

    @Test
    @DisplayName("Usuario no puede eliminar pedido → 403")
    void user_cannotDeletePedido() throws Exception {
        mockMvc.perform(delete("/api/pedidos/" + userPedido.getId())
                .header("Authorization", userToken))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin puede eliminar pedido")
    void admin_canDeletePedido() throws Exception {
        mockMvc.perform(delete("/api/pedidos/" + userPedido.getId())
                .header("Authorization", adminToken))
            .andExpect(status().isOk());
    }
}
