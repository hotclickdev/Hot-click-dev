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
 * Antes de V146 la columna era VARCHAR(20) y un pedido SINPE en PENDIENTE_COMPROBANTE (21)
 * no se podía guardar. Cubre el ciclo SINPE: crear en PENDIENTE_COMPROBANTE y pasar el grupo
 * a PENDIENTE_APROBACION.
 */
@DisplayName("Pedido: se guarda en PENDIENTE_COMPROBANTE y avanza a PENDIENTE_APROBACION")
class PedidoEstadoPendienteComprobanteTest extends BaseIntegrationTest {

    private static final String GRUPO = "GP-SINPE-ANCHO-01";

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    private Usuario comprador;
    private Bodega bodega;

    @BeforeEach
    void setUpPedidos() {
        comprador = crearUsuario("comprador-sinpe-ancho@test.cr", "Comprador SINPE",
            obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega SINPE");
        bodega.setDireccionExacta("Heredia");
        bodega.setTelefono("22225555");
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
    @DisplayName("Un checkout SINPE guarda PENDIENTE_COMPROBANTE y el comprobante lo pasa a PENDIENTE_APROBACION")
    void cicloSinpe() {
        crearPedido("ORD-SINPE-W1");
        crearPedido("ORD-SINPE-W2");

        assertThat(estado("ORD-SINPE-W1")).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        Integer actualizados = new TransactionTemplate(transactionManager).execute(status ->
            pedidoRepository.actualizarEstadoPorGrupoPago(GRUPO, Constants.PEDIDO_PENDIENTE_APROBACION));

        assertThat(actualizados).isEqualTo(2);
        assertThat(estado("ORD-SINPE-W1")).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(estado("ORD-SINPE-W2")).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
    }

    private String estado(String numero) {
        return pedidoRepository.findByNumeroPedido(numero).orElseThrow().getEstadoPedido();
    }

    private void crearPedido(String numero) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setGrupoPago(GRUPO);
        p.setFechaPedido(LocalDateTime.of(2026, 10, 2, 10, 0));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
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
