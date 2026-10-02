package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El comprobante SINPE cubre el checkout entero: {@code actualizarEstadoPorGrupoPago} cambia
 * todos los paquetes del grupo en un solo UPDATE y no toca pedidos de otros grupos.
 */
@DisplayName("Pedido: cambio de estado de un grupo de pago en un solo UPDATE")
class PedidoGrupoPagoEstadoTest extends BaseIntegrationTest {

    private static final String GRUPO = "GP-BULK-ESTADO-01";

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    private Usuario comprador;
    private Bodega bodega;

    @BeforeEach
    void setUpPedidos() {
        comprador = crearUsuario("comprador-grupo-estado@test.cr", "Comprador Grupo",
            obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Grupo");
        bodega.setDireccionExacta("San José");
        bodega.setTelefono("22224444");
        bodega.setAdminCliente(adminUser);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
    }

    @AfterEach
    void tearDownPedidos() {
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
    }

    @Test
    @DisplayName("Los paquetes del grupo pasan juntos a PENDIENTE_APROBACION; otro grupo y pedidos sin grupo no cambian")
    void actualizaSoloElGrupo() {
        crearPedido("ORD-GRP-B1", GRUPO);
        crearPedido("ORD-GRP-B2", GRUPO);
        crearPedido("ORD-GRP-B3", "GP-BULK-ESTADO-OTRO");
        crearPedido("ORD-GRP-B4", null);

        Integer actualizados = new TransactionTemplate(transactionManager).execute(status ->
            pedidoRepository.actualizarEstadoPorGrupoPago(GRUPO, Constants.PEDIDO_PENDIENTE_APROBACION));

        assertThat(actualizados).isEqualTo(2);
        assertThat(estado("ORD-GRP-B1")).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(estado("ORD-GRP-B2")).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(estado("ORD-GRP-B3")).isEqualTo(Constants.PEDIDO_PENDIENTE);
        assertThat(estado("ORD-GRP-B4")).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    private String estado(String numero) {
        return pedidoRepository.findByNumeroPedido(numero).orElseThrow().getEstadoPedido();
    }

    private void crearPedido(String numero, String grupo) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setGrupoPago(grupo);
        p.setFechaPedido(LocalDateTime.of(2026, 10, 2, 10, 0));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setUsuarioFinal(comprador);
        p.setBodega(bodega);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(5000);
        p.setUtilidadBruta(5000);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_DOMICILIO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        pedidoRepository.saveAndFlush(p);
    }
}
