package com.hotclick.integration;

import com.hotclick.model.Bodega;
import com.hotclick.model.Categoria;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.WebhookEventRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.payment.AvisoReembolsoPendienteService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * MEDIO área 1 (4610d4748): ONVO cobra un grupo ya CANCELADO → el pago queda REEMBOLSO_PENDIENTE y el admin IT
 * recibe UN aviso (dedupe en base por pago, V216). Si el envío falla, el pago sigue REEMBOLSO_PENDIENTE.
 * Spring + H2 de test, webhook real por MockMvc; solo el correo saliente está mockeado.
 */
@DisplayName("[Aviso admin] Cobro ONVO sobre grupo cancelado: aviso al admin con dedupe y fail-safe")
class AvisoReembolsoPendienteIntegracionTest extends BaseIntegrationTest {

    private static final String SESION = "cs_aviso_cancelado";
    private static final String INTENT = "pi_aviso_cancelado";
    private static final String SECRET = "aviso-prueba";

    @MockitoBean private OnvoService onvoService;

    @Autowired private AvisoReembolsoPendienteService aviso;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;

    private Empresa empresa;
    private Bodega bodega;

    @BeforeEach
    void armar() {
        reset(notificacionEmailService);
        when(onvoService.getWebhookSecret()).thenReturn(SECRET);
        when(onvoService.isPagosDisponibles()).thenReturn(true);
        when(onvoService.modoEsperado()).thenReturn("live");
        doReturn(Map.of("paymentStatus", "paid", "status", "complete", "paymentIntentId", INTENT, "mode", "live"))
            .when(onvoService).obtenerCheckoutSession(SESION);
        doReturn(Map.of("id", INTENT, "status", "succeeded", "amount", 1_000_000, "currency", "CRC", "mode", "live"))
            .when(onvoService).obtenerPaymentIntent(INTENT);

        String slug = "aviso-" + System.nanoTime();
        empresa = new Empresa();
        empresa.setNombreEmpresa("Aviso");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        bodega = new Bodega();
        bodega.setNombreBodega("Bodega Aviso");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setProvincia("San José");
        bodega.setCanton("Escazú");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);
    }

    @AfterEach
    void limpiar() {
        webhookEventRepository.deleteAll();
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    /** Pedido ya CANCELADO (expiró o lo canceló el comprador) con su pago ONVO todavía PENDIENTE. */
    private Pago pagoSobreCancelado() {
        Pedido p = new Pedido();
        p.setNumeroPedido("AV-" + (System.nanoTime() % 1_000_000));
        p.setFechaPedido(LocalDateTime.now(Constants.ZONA_CR));
        p.setEstadoPedido(Constants.PEDIDO_CANCELADO);
        p.setUsuarioFinal(testUser);
        p.setBodega(bodega);
        p.setEmpresa(empresa);
        p.setSubtotal(10000);
        p.setTotalPedido(10000);
        p.setCostoTotalProductos(7000);
        p.setUtilidadBruta(3000);
        p.setMetodoPago(Constants.PROVEEDOR_ONVO);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setCostoEnvio(0);
        p.setDescuentoTotal(0);
        p.setMontoImpuesto(0);
        p.setAplicaImpuesto(false);
        p.setEstado(Constants.ESTADO_ACTIVO);
        p.setItems(new ArrayList<>());
        p = pedidoRepository.saveAndFlush(p);

        Pago pago = new Pago();
        pago.setMerchantToken(SESION);
        pago.setMonto(10000);
        pago.setMoneda("CRC");
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_PENDIENTE);
        pago.setPedido(p);
        pago.setUsuario(testUser);
        pago.setFechaCreacion(LocalDateTime.now(Constants.ZONA_CR));
        return pagoRepository.saveAndFlush(pago);
    }

    private void webhook() throws Exception {
        mockMvc.perform(post("/api/webhooks/onvo")
                .header("X-Webhook-Secret", SECRET)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"" + SESION + "\"}}"))
            .andExpect(status().isOk());
    }

    private Pago enBase(Pago p) { return pagoRepository.findById(p.getId()).orElseThrow(); }

    @Test
    @DisplayName("Cobro sobre cancelado → REEMBOLSO_PENDIENTE y un aviso al admin con id, estado y link (sin PII)")
    void avisaAlAdmin() throws Exception {
        Pago pago = pagoSobreCancelado();

        webhook();

        assertThat(enBase(pago).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        assertThat(enBase(pago).getAvisoReembolsoAdminEn()).isNotNull();
        verify(notificacionEmailService, times(1)).enviarAvisoReembolsoPendienteAAdminIT(
            eq(pago.getId()), eq(Constants.PAGO_REEMBOLSO_PENDIENTE), org.mockito.ArgumentMatchers.endsWith("/plataforma/dinero/cobros"));
    }

    @Test
    @DisplayName("Dedupe: webhook repetido y reintento directo no mandan un segundo correo para el mismo pago")
    void dedupePorPago() throws Exception {
        Pago pago = pagoSobreCancelado();

        webhook();
        webhook();
        assertThat(aviso.avisar(pago.getId())).isFalse();

        verify(notificacionEmailService, times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
        assertThat(enBase(pago).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
    }

    @Test
    @DisplayName("Fail-safe: si el envío falla, ONVO recibe 200, el pago sigue REEMBOLSO_PENDIENTE y no hay excepción")
    void falloDelEnvioNoRompeElFlujo() throws Exception {
        doThrow(new RuntimeException("smtp caído")).when(notificacionEmailService)
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
        Pago pago = pagoSobreCancelado();

        webhook();

        assertThat(enBase(pago).getEstadoPago()).isEqualTo(Constants.PAGO_REEMBOLSO_PENDIENTE);
        verify(notificacionEmailService, times(1))
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
    }

    @Test
    @DisplayName("Un pago que no está REEMBOLSO_PENDIENTE no dispara aviso")
    void soloReembolsoPendiente() {
        Pago pago = pagoSobreCancelado();
        assertThat(aviso.avisar(pago.getId())).isFalse();
        verify(notificacionEmailService, never())
            .enviarAvisoReembolsoPendienteAAdminIT(anyLong(), anyString(), anyString());
    }
}
