package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.PagoRepository;
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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Las consultas condicionales restauradas de 20e17d6a3, contra la base real de tests (H2):
 * reclamarParaConfirmar gana una sola vez y nunca reconfirma un pedido ya avanzado;
 * marcarFallidoSiPendiente nunca pisa un Pago CAPTURADO.
 */
@DisplayName("Pagos: reclamo de confirmación y fallo condicional en la base")
class ReclamoConfirmacionPagoTest extends BaseIntegrationTest {

    private static final Set<String> YA_CONFIRMADOS = Set.of(
        Constants.PEDIDO_PAGADO, Constants.PEDIDO_EN_PREPARACION, Constants.PEDIDO_LISTO_RETIRO,
        Constants.PEDIDO_ENVIADO, Constants.PEDIDO_ENTREGADO, Constants.PEDIDO_COMPLETADO);

    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PlatformTransactionManager txManager;

    private Usuario comprador;
    private Bodega bodega;

    @BeforeEach
    void setUpDatos() {
        comprador = crearUsuario("comprador-reclamo@test.cr", "Comprador Reclamo",
            obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Reclamo");
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
    }

    private <T> T enTx(java.util.function.Supplier<T> s) {
        return new TransactionTemplate(txManager).execute(st -> s.get());
    }

    @Test
    @DisplayName("reclamarParaConfirmar: el primero gana, el segundo ve 0")
    void reclamo_unaSolaVez() {
        Pedido p = crearPedido("ORD-RECL-1", Constants.PEDIDO_PENDIENTE_APROBACION);
        assertThat(enTx(() -> pedidoRepository.reclamarParaConfirmar(p.getId(), YA_CONFIRMADOS))).isEqualTo(1);
        assertThat(enTx(() -> pedidoRepository.reclamarParaConfirmar(p.getId(), YA_CONFIRMADOS))).isZero();
        assertThat(pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido()).isEqualTo(Constants.PEDIDO_PAGADO);
    }

    @Test
    @DisplayName("reclamarParaConfirmar: un pedido ENVIADO no vuelve a PAGADO")
    void reclamo_noRetrocedeEstadosAvanzados() {
        Pedido p = crearPedido("ORD-RECL-2", Constants.PEDIDO_ENVIADO);
        assertThat(enTx(() -> pedidoRepository.reclamarParaConfirmar(p.getId(), YA_CONFIRMADOS))).isZero();
        assertThat(pedidoRepository.findById(p.getId()).orElseThrow().getEstadoPedido()).isEqualTo(Constants.PEDIDO_ENVIADO);
    }

    @Test
    @DisplayName("marcarFallidoSiPendiente nunca pisa un Pago CAPTURADO")
    void fallo_noPisaCapturado() {
        Pago pago = crearPago(crearPedido("ORD-RECL-3", Constants.PEDIDO_PAGADO), Constants.PAGO_CAPTURADO);
        assertThat(enTx(() -> pagoRepository.marcarFallidoSiPendiente(pago.getId(), LocalDateTime.now()))).isZero();
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
    }

    @Test
    @DisplayName("marcarFallidoSiPendiente pasa a FALLIDO un Pago PENDIENTE, una sola vez")
    void fallo_soloDesdePendiente() {
        Pago pago = crearPago(crearPedido("ORD-RECL-4", Constants.PEDIDO_PENDIENTE), Constants.PAGO_PENDIENTE);
        assertThat(enTx(() -> pagoRepository.marcarFallidoSiPendiente(pago.getId(), LocalDateTime.now()))).isEqualTo(1);
        assertThat(enTx(() -> pagoRepository.marcarFallidoSiPendiente(pago.getId(), LocalDateTime.now()))).isZero();
        assertThat(pagoRepository.findById(pago.getId()).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_FALLIDO);
    }

    private Pedido crearPedido(String numero, String estado) {
        Pedido p = new Pedido();
        p.setNumeroPedido(numero);
        p.setFechaPedido(LocalDateTime.of(2026, 10, 2, 10, 0));
        p.setEstadoPedido(estado);
        p.setUsuarioFinal(comprador);
        p.setBodega(bodega);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(5000);
        p.setUtilidadBruta(5000);
        p.setMetodoPago("SINPE");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        return pedidoRepository.saveAndFlush(p);
    }

    private Pago crearPago(Pedido pedido, String estado) {
        Pago pago = new Pago();
        pago.setPedido(pedido);
        pago.setUsuario(comprador);
        pago.setMonto(pedido.getTotalPedido());
        pago.setMoneda("CRC");
        pago.setProveedor("SINPE");
        pago.setEstadoPago(estado);
        pago.setMerchantToken(pedido.getNumeroPedido());
        pago.setFechaCreacion(LocalDateTime.now());
        pago.setFechaActualizacion(LocalDateTime.now());
        return pagoRepository.saveAndFlush(pago);
    }
}
