package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.ComprobanteSinpeRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.sinpe.SinpeComprobantePersistenceService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Un comprobante SINPE cubre el checkout entero: todos los paquetes del grupo de pago
 * pasan a PENDIENTE_APROBACION en un solo UPDATE, sin tocar pedidos de otros grupos.
 */
@DisplayName("Comprobante SINPE: el grupo de pago cambia de estado junto")
class SinpeComprobantePersistenceTest extends BaseIntegrationTest {

    private static final String GRUPO = "GP-SINPE-BULK-01";

    @Autowired private SinpeComprobantePersistenceService persistenceService;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private ComprobanteSinpeRepository comprobanteRepository;
    @Autowired private BodegaRepository bodegaRepository;

    private Usuario comprador;
    private Bodega bodega;

    @BeforeEach
    void setUpPedidos() {
        comprador = crearUsuario("comprador-sinpe-bulk@test.cr", "Comprador SINPE",
            obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega SINPE");
        bodega.setDireccionExacta("San José");
        bodega.setTelefono("22224444");
        bodega.setAdminCliente(adminUser);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
    }

    @AfterEach
    void tearDownPedidos() {
        comprobanteRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
    }

    @Test
    @DisplayName("Los paquetes del mismo grupo pasan a PENDIENTE_APROBACION; otro grupo no cambia")
    void grupoCompletoPasaAPendienteAprobacion() {
        crearPedido("ORD-SINPE-B1", GRUPO, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        crearPedido("ORD-SINPE-B2", GRUPO, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        crearPedido("ORD-SINPE-B3", "GP-SINPE-OTRO", Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        persistenceService.guardar("ORD-SINPE-B1", "https://cdn.test/comprobante.jpg", "  Ana Mora ",
            "1-1111-1111", "88887777", "ana@test.cr");

        assertThat(estado("ORD-SINPE-B1")).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(estado("ORD-SINPE-B2")).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(estado("ORD-SINPE-B3")).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        Long idB1 = pedidoRepository.findByNumeroPedido("ORD-SINPE-B1").orElseThrow().getId();
        assertThat(comprobanteRepository.findByPedidoId(idB1))
            .hasValueSatisfying(c -> assertThat(c.getNombreRemitente()).isEqualTo("Ana Mora"));
    }

    @Test
    @DisplayName("Pedido sin grupo de pago: cambia solo ese pedido")
    void pedidoSinGrupo() {
        crearPedido("ORD-SINPE-S1", null, Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        crearPedido("ORD-SINPE-S2", null, Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        persistenceService.guardar("ORD-SINPE-S1", "https://cdn.test/c.jpg", "Ana", null, null, "ana@test.cr");

        assertThat(estado("ORD-SINPE-S1")).isEqualTo(Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(estado("ORD-SINPE-S2")).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
    }

    @Test
    @DisplayName("Si el pedido ya no espera comprobante, no guarda nada ni cambia el grupo")
    void estadoInvalidoNoCambiaNada() {
        crearPedido("ORD-SINPE-X1", "GP-SINPE-X", Constants.PEDIDO_PENDIENTE_APROBACION);
        crearPedido("ORD-SINPE-X2", "GP-SINPE-X", Constants.PEDIDO_PENDIENTE_COMPROBANTE);

        assertThatThrownBy(() -> persistenceService.guardar("ORD-SINPE-X1", "https://cdn.test/c.jpg", "Ana",
            null, null, "ana@test.cr")).isInstanceOf(IllegalStateException.class);

        assertThat(estado("ORD-SINPE-X2")).isEqualTo(Constants.PEDIDO_PENDIENTE_COMPROBANTE);
        assertThat(comprobanteRepository.count()).isZero();
    }

    private String estado(String numero) {
        return pedidoRepository.findByNumeroPedido(numero).orElseThrow().getEstadoPedido();
    }

    private void crearPedido(String numero, String grupo, String estado) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setGrupoPago(grupo);
        p.setFechaPedido(LocalDateTime.of(2026, 10, 2, 10, 0));
        p.setEstadoPedido(estado);
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
