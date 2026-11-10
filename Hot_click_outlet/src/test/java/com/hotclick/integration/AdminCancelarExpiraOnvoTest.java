package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import com.hotclick.service.payment.PaymentUserCancellationService;
import org.springframework.test.util.AopTestUtils;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * QA MEDIO (d0c17b3d): cancelar desde el panel (PUT /api/pedidos/{id}/estado CANCELADO) cierra la sesión ONVO
 * igual que la cancelación del comprador (#510), fail-closed: si ONVO no confirma, 409 y el pedido sigue igual.
 * ONVO va mockeado (sin llave ni red).
 */
@DisplayName("Cancelar desde el panel expira la sesión ONVO (fail-closed, 409)")
class AdminCancelarExpiraOnvoTest extends BaseIntegrationTest {

    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private PaymentUserCancellationService pagoCancelacion;
    @Autowired private com.hotclick.repository.WebhookEventRepository webhookEventRepository;
    @Autowired private org.springframework.transaction.PlatformTransactionManager txManager;
    // Sin @MockitoBean: no abre otro contexto de Spring (un contexto extra rompió tablas H2 de otros tests en CI).
    private final OnvoPaymentProvider onvoPaymentProvider = mock(OnvoPaymentProvider.class);
    private final OnvoService onvoService = mock(OnvoService.class);
    private Object providerOriginal;
    private Object onvoServiceOriginal;

    private Long pedidoId;
    private static final String SESION = "cs_test_admin_cancel";

    @BeforeEach
    void armar() {
        Object destino = AopTestUtils.getTargetObject(pagoCancelacion);
        providerOriginal = ReflectionTestUtils.getField(destino, "onvoPaymentProvider");
        onvoServiceOriginal = ReflectionTestUtils.getField(destino, "onvoService");
        ReflectionTestUtils.setField(destino, "onvoPaymentProvider", onvoPaymentProvider);
        ReflectionTestUtils.setField(destino, "onvoService", onvoService);
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        String slug = "admin-cancel-onvo-" + System.nanoTime();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Admin cancel ONVO");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);
        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Bodega cancel");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-ACO-" + System.nanoTime() % 1_000_000);
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_PENDIENTE);
        p.setOrigen("WEB");
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago("TARJETA");
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        Pedido guardado = pedidoRepository.saveAndFlush(p);
        pedidoId = guardado.getId();
        Pago pago = new Pago();
        pago.setMerchantToken(SESION);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(guardado);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        pagoRepository.saveAndFlush(pago);
    }

    @AfterEach
    void limpiar() {
        Object destino = AopTestUtils.getTargetObject(pagoCancelacion);
        ReflectionTestUtils.setField(destino, "onvoPaymentProvider", providerOriginal);
        ReflectionTestUtils.setField(destino, "onvoService", onvoServiceOriginal);
        webhookEventRepository.findAll().stream().filter(e -> SESION.equals(e.getMerchantToken()))
            .forEach(webhookEventRepository::delete);
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    private int cancelar() throws Exception {
        return mockMvc.perform(put("/api/pedidos/" + pedidoId + "/estado").header("Authorization", adminToken)
                .contentType(MediaType.APPLICATION_JSON).content("{\"estado\":\"CANCELADO\"}"))
            .andReturn().getResponse().getStatus();
    }

    private String estado() {
        return pedidoRepository.findById(pedidoId).orElseThrow().getEstadoPedido();
    }

    @Test
    @DisplayName("ONVO confirma: expira la sesión y el pedido queda CANCELADO")
    void cancelaYExpira() throws Exception {
        when(onvoPaymentProvider.expirarSesionParaCancelar(SESION)).thenReturn(true);
        when(onvoPaymentProvider.revisarCobro(SESION, "cancelacion", false))
            .thenReturn(new com.hotclick.payment.OnvoPaymentProvider.RevisionCobro(
                com.hotclick.payment.OnvoPaymentProvider.CobroIntent.SIN_COBRO, "canceled"));

        assertThat(cancelar()).isEqualTo(200);

        verify(onvoPaymentProvider).expirarSesionParaCancelar(SESION);
        assertThat(estado()).isEqualTo(Constants.PEDIDO_CANCELADO);
    }

    @Test
    @DisplayName("ONVO no confirma: 409 y el pedido sigue PENDIENTE")
    void onvoFallaNoCancela() throws Exception {
        when(onvoPaymentProvider.expirarSesionParaCancelar(anyString())).thenReturn(false);

        assertThat(cancelar()).isEqualTo(409);

        assertThat(estado()).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("ONVO lanza error: 409 y el pedido sigue PENDIENTE")
    void onvoExcepcionNoCancela() throws Exception {
        when(onvoPaymentProvider.expirarSesionParaCancelar(anyString())).thenThrow(new RuntimeException("timeout"));

        assertThat(cancelar()).isEqualTo(409);

        assertThat(estado()).isEqualTo(Constants.PEDIDO_PENDIENTE);
    }

    @Test
    @DisplayName("sin llave ONVO: 409 y el pedido sigue PENDIENTE")
    void sinLlaveNoCancela() throws Exception {
        when(onvoService.isPagosDisponibles()).thenReturn(false);

        assertThat(cancelar()).isEqualTo(409);

        assertThat(estado()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        verify(onvoPaymentProvider, never()).expirarSesionParaCancelar(anyString());
    }

    @Test
    @DisplayName("pedido PAGADO con pago CAPTURADO: 409, el pedido sigue PAGADO y el pago CAPTURADO (no queda plata huérfana)")
    void pagadoCapturadoNoCancela() throws Exception {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pedidoRepository.saveAndFlush(pedido);
        Pago pago = pagoRepository.findTopByPedidoId(pedidoId).orElseThrow();
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pagoRepository.saveAndFlush(pago);

        assertThat(cancelar()).isEqualTo(409);

        assertThat(estado()).isEqualTo(Constants.PEDIDO_PAGADO);
        assertThat(pagoRepository.findTopByPedidoId(pedidoId).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_CAPTURADO);
        verifyNoInteractions(onvoPaymentProvider);
    }

    @Test
    @DisplayName("fix2: ONVO en duda → 409, el pedido sigue PENDIENTE y la intención de cancelar QUEDA guardada (commit, sin rollback)")
    void enDudaRegistraIntencionDurable() throws Exception {
        when(onvoPaymentProvider.expirarSesionParaCancelar(SESION)).thenReturn(true);
        when(onvoPaymentProvider.revisarCobro(SESION, "cancelacion", false))
            .thenReturn(new OnvoPaymentProvider.RevisionCobro(OnvoPaymentProvider.CobroIntent.EN_DUDA, "processing"));

        assertThat(cancelar()).isEqualTo(409);

        assertThat(estado()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        Pago pago = pagoRepository.findTopByPedidoId(pedidoId).orElseThrow();
        assertThat(pagoRepository.cancelacionSolicitadaEnBase(pago.getId())).isPresent();
        assertThat(pago.getCancelacionSolicitadaOrigen()).isEqualTo("PANEL");
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("fix2 MEDIO autobloqueo: panel (pedido FOR UPDATE) + intent cobrado → sin REQUIRES_NEW: 200 rápido, CANCELADO y REEMBOLSO_PENDIENTE, nunca PAGADO")
    void cobradoSinAutobloqueoNoConfirma() throws Exception {
        when(onvoPaymentProvider.expirarSesionParaCancelar(SESION)).thenReturn(true);
        when(onvoPaymentProvider.revisarCobro(SESION, "cancelacion", false))
            .thenReturn(new OnvoPaymentProvider.RevisionCobro(OnvoPaymentProvider.CobroIntent.COBRADO_SIN_CAPTURAR, "succeeded"));

        long inicio = System.nanoTime();
        int status = cancelar();
        long ms = (System.nanoTime() - inicio) / 1_000_000;

        assertThat(status).isEqualTo(200);
        assertThat(ms).isLessThan(5_000);
        assertThat(estado()).isEqualTo(Constants.PEDIDO_CANCELADO);
        Pago pago = pagoRepository.findTopByPedidoId(pedidoId).orElseThrow();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(pago.getCancelacionSolicitadaOrigen()).isEqualTo("PANEL");
        assertThat(webhookEventRepository.existsByMerchantTokenAndEventoTipo(SESION, "checkout-session.succeeded")).isTrue();
    }

    @Test
    @DisplayName("fix2 orden de locks: durante la llamada a ONVO la intención YA está confirmada y ni pedido ni pago están bloqueados")
    void intencionConfirmadaYSinLocksDuranteRed() throws Exception {
        Long pagoId = pagoRepository.findTopByPedidoId(pedidoId).orElseThrow().getId();
        java.util.concurrent.atomic.AtomicReference<String> visto = new java.util.concurrent.atomic.AtomicReference<>();
        when(onvoPaymentProvider.expirarSesionParaCancelar(SESION)).thenAnswer(inv -> {
            // Otra conexión (otro hilo): solo ve lo confirmado y, si hubiera un lock, el FOR UPDATE esperaría/fallaría.
            var hilo = java.util.concurrent.Executors.newSingleThreadExecutor();
            try {
                visto.set(hilo.submit(() -> new org.springframework.transaction.support.TransactionTemplate(txManager).execute(st -> {
                    boolean intencion = pagoRepository.cancelacionSolicitadaEnBase(pagoId).isPresent();
                    pedidoRepository.findByIdForUpdate(pedidoId).orElseThrow();
                    pagoRepository.findByIdForUpdate(pagoId).orElseThrow();
                    return intencion ? "intencion+sinLocks" : "sinIntencion";
                })).get(20, java.util.concurrent.TimeUnit.SECONDS));
            } finally {
                hilo.shutdownNow();
            }
            return true;
        });
        when(onvoPaymentProvider.revisarCobro(SESION, "cancelacion", false))
            .thenReturn(new OnvoPaymentProvider.RevisionCobro(OnvoPaymentProvider.CobroIntent.SIN_COBRO, "canceled"));

        assertThat(cancelar()).isEqualTo(200);

        assertThat(visto.get()).isEqualTo("intencion+sinLocks");
        assertThat(estado()).isEqualTo(Constants.PEDIDO_CANCELADO);
    }

    @Test
    @DisplayName("fix2 intención antes de red: ONVO no confirma la expiración → 409, pedido PENDIENTE e intención guardada")
    void expireFallaIntencionGuardada() throws Exception {
        when(onvoPaymentProvider.expirarSesionParaCancelar(SESION)).thenReturn(false);

        assertThat(cancelar()).isEqualTo(409);

        assertThat(estado()).isEqualTo(Constants.PEDIDO_PENDIENTE);
        Pago pago = pagoRepository.findTopByPedidoId(pedidoId).orElseThrow();
        assertThat(pagoRepository.cancelacionSolicitadaEnBase(pago.getId())).isPresent();
        assertThat(pago.getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
        verify(onvoPaymentProvider, never()).revisarCobro(anyString(), anyString(), org.mockito.ArgumentMatchers.anyBoolean());
    }
}
