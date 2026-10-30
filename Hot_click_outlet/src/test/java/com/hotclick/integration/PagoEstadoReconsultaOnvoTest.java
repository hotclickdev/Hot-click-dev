package com.hotclick.integration;

import com.hotclick.model.*;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.repository.*;
import com.hotclick.service.payment.GuestCancelTokenService;
import com.hotclick.service.payment.PagoEstadoConsultaService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * Endpoint de estado ({@code GET /api/payments/status/{n}}) con reconsulta a ONVO para pagos PENDIENTE:
 * solo el dueño, límite por pago, fail-closed, idempotente con el webhook y sin filtrar datos.
 * Corre con H2 en la suite; contra PostgreSQL con {@code DB_URL=jdbc:postgresql://…} como el resto.
 */
@DisplayName("Estado del pago: reconsulta ONVO con dueño, límite y fail-closed")
class PagoEstadoReconsultaOnvoTest extends BaseIntegrationTest {

    private static final String SESION = "cs_estado_reconsulta_test";

    /** Mock inyectado a mano (no @MockitoBean) para reutilizar el contexto compartido de la suite. */
    private final OnvoPaymentProvider onvo = mock(OnvoPaymentProvider.class);
    private Object onvoOriginal;
    private Object relojOriginal;
    @Autowired private PagoEstadoConsultaService servicio;
    @Autowired private GuestCancelTokenService tokens;
    @Autowired private EmpresaRepository empresaRepository;
    @Autowired private BodegaRepository bodegaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;

    private final AtomicLong ahora = new AtomicLong(1_000_000L);
    private String numero;
    private Long pagoId;

    @BeforeEach
    void armar() {
        onvoOriginal = ReflectionTestUtils.getField(servicio, "onvoPaymentProvider");
        relojOriginal = ReflectionTestUtils.getField(servicio, "reloj");
        ReflectionTestUtils.setField(servicio, "onvoPaymentProvider", onvo);
        ReflectionTestUtils.setField(servicio, "reloj", (LongSupplier) ahora::get);
        String slug = "estado-onvo-" + System.nanoTime();
        Empresa empresa = new Empresa();
        empresa.setNombreEmpresa("Estado ONVO");
        empresa.setSlug(slug);
        empresa.setCorreoEmpresa(slug + "@test.cr");
        empresa.setEstadoEmpresa("ACTIVO");
        empresa.setFechaRegistro(LocalDateTime.now(Constants.ZONA_CR));
        empresa = empresaRepository.saveAndFlush(empresa);

        Bodega bodega = new Bodega();
        bodega.setNombreBodega("Bodega estado");
        bodega.setDireccionExacta("Calle Test");
        bodega.setTelefono("00000000");
        bodega.setHorarioApertura(java.time.LocalTime.of(8, 0));
        bodega.setHorarioCierre(java.time.LocalTime.of(18, 0));
        bodega.setAdminCliente(adminUser);
        bodega.setEmpresa(empresa);
        bodega.setEstado(Constants.ESTADO_ACTIVO);
        bodega = bodegaRepository.saveAndFlush(bodega);

        Pedido p = new Pedido();
        numero = "ORD-EST-" + System.nanoTime() % 1_000_000;
        p.setNumeroPedido(numero);
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
        p.setItems(new java.util.ArrayList<>());
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
        pagoId = pagoRepository.saveAndFlush(pago).getId();
    }

    @AfterEach
    void limpiar() {
        ReflectionTestUtils.setField(servicio, "onvoPaymentProvider", onvoOriginal);
        ReflectionTestUtils.setField(servicio, "reloj", relojOriginal);
        pagoRepository.deleteAll();
        pedidoRepository.deleteAll();
        bodegaRepository.deleteAll();
        empresaRepository.deleteAll();
    }

    private MvcResult estado(String auth, String token) throws Exception {
        var req = get("/api/payments/status/" + numero);
        if (auth != null) req = req.header("Authorization", auth);
        if (token != null) req = req.header("X-Pedido-Token", token);
        return mockMvc.perform(req).andReturn();
    }

    @Test
    @DisplayName("dueño + PENDIENTE: reconsulta ONVO una vez; la respuesta no trae la sesión de ONVO")
    void duenoReconsultaSinFiltrar() throws Exception {
        when(onvo.procesarPagoVerificado(SESION, "estado")).thenReturn(OnvoPaymentProvider.Verificacion.NO_PAGADO);
        MvcResult r = estado(userToken, null);
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        String body = r.getResponse().getContentAsString();
        assertThat(body).contains("PENDIENTE").doesNotContain(SESION).doesNotContain("cs_");
        verify(onvo, times(1)).procesarPagoVerificado(SESION, "estado");
    }

    @Test
    @DisplayName("límite por pedido: dentro de la ventana no vuelve a ONVO; pasada la ventana sí")
    void limiteDeFrecuencia() throws Exception {
        when(onvo.procesarPagoVerificado(anyString(), anyString())).thenReturn(OnvoPaymentProvider.Verificacion.NO_PAGADO);
        estado(userToken, null);
        ahora.addAndGet(9_999);
        estado(userToken, null);
        estado(userToken, null);
        verify(onvo, times(1)).procesarPagoVerificado(SESION, "estado");
        ahora.addAndGet(1);
        estado(userToken, null);
        verify(onvo, times(2)).procesarPagoVerificado(SESION, "estado");
    }

    @Test
    @DisplayName("fail-closed: ONVO falla o da timeout → 200 PENDIENTE, sin mensaje crudo")
    void failClosed() throws Exception {
        when(onvo.procesarPagoVerificado(anyString(), anyString()))
            .thenThrow(new org.springframework.web.client.ResourceAccessException("Read timed out detalle-interno-onvo"));
        MvcResult r = estado(userToken, null);
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        assertThat(r.getResponse().getContentAsString()).contains("PENDIENTE")
            .doesNotContain("detalle-interno-onvo").doesNotContain("timed out");
        assertThat(pagoRepository.findById(pagoId).orElseThrow().getEstadoPago()).isEqualTo(Constants.PAGO_PENDIENTE);
    }

    @Test
    @DisplayName("quien no es dueño (otro usuario, anónimo, token ajeno) recibe el mismo 404 que un pedido inexistente, sin tocar ONVO")
    void noDuenoMismo404() throws Exception {
        Usuario otro = crearUsuario("otro-estado-" + System.nanoTime() + "@test.cr", "Otro",
            obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1));
        String inexistente = mockMvc.perform(get("/api/payments/status/ORD-NO-EXISTE"))
            .andReturn().getResponse().getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", "");
        for (MvcResult r : new MvcResult[] {
                estado(tokenPara(otro, Constants.ROL_USUARIO_FINAL), null),
                estado(null, null),
                estado(null, tokens.emitir("ORD-OTRO-PEDIDO")) }) {
            assertThat(r.getResponse().getStatus()).isEqualTo(404);
            String body = r.getResponse().getContentAsString();
            assertThat(body.replaceAll("\"timestamp\":\"[^\"]*\"", "")).isEqualTo(inexistente);
            assertThat(body).doesNotContain(numero);
        }
        verify(onvo, never()).procesarPagoVerificado(anyString(), anyString());
    }

    @Test
    @DisplayName("invitado con el token firmado del checkout sí puede consultar")
    void invitadoConToken() throws Exception {
        when(onvo.procesarPagoVerificado(anyString(), anyString())).thenReturn(OnvoPaymentProvider.Verificacion.EN_PROCESO);
        MvcResult r = estado(null, tokens.emitir(numero));
        assertThat(r.getResponse().getStatus()).isEqualTo(200);
        assertThat(r.getResponse().getContentAsString()).contains("PENDIENTE");
    }

    @Test
    @DisplayName("idempotente con el webhook: ya CAPTURADO no vuelve a ONVO ni a capturar")
    void idempotenteConWebhook() throws Exception {
        // La primera reconsulta captura (como haría el webhook); las siguientes ven CAPTURADO y no llaman.
        when(onvo.procesarPagoVerificado(eq(SESION), anyString())).thenAnswer(inv -> {
            Pago p = pagoRepository.findById(pagoId).orElseThrow();
            p.setEstadoPago(Constants.PAGO_CAPTURADO);
            pagoRepository.saveAndFlush(p);
            return OnvoPaymentProvider.Verificacion.OK;
        });
        assertThat(estado(userToken, null).getResponse().getContentAsString()).contains("CAPTURADO");
        ahora.addAndGet(60_000);
        assertThat(estado(userToken, null).getResponse().getContentAsString()).contains("CAPTURADO");
        verify(onvo, times(1)).procesarPagoVerificado(anyString(), anyString());
    }
}
