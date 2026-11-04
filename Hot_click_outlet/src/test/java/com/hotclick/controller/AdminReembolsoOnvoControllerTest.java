package com.hotclick.controller;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.OnvoService.OnvoReembolso;
import com.hotclick.service.reembolso.ReembolsoOnvoService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Reembolso del admin por ONVO: éxito, rechazo (revierte), duda (no marca devuelto) y pago por fuera (409). */
class AdminReembolsoOnvoControllerTest {

    private static final String URL = "/api/admin/pedidos/7/reembolso-onvo";
    private static final String SESION = "cs_test_sesion_fake";
    private static final String INTENT = "pi_test_intent_fake";

    private final PedidoRepository pedidoRepository = mock(PedidoRepository.class);
    private final PagoRepository pagoRepository = mock(PagoRepository.class);
    private final OnvoService onvo = mock(OnvoService.class);
    private final PlatformTransactionManager txManager = mock(PlatformTransactionManager.class);
    private final com.hotclick.service.reembolso.ReembolsoStockService stock = mock(com.hotclick.service.reembolso.ReembolsoStockService.class);
    private MockMvc mvc;
    private Pedido pedido;
    private Pago pago;

    @BeforeEach
    void setUp() {
        when(txManager.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        pedido = new Pedido();
        pedido.setId(7L);
        pedido.setNumeroPedido("HC-7");
        pedido.setEstadoPedido(Constants.PEDIDO_PAGADO);
        pago = new Pago();
        pago.setId(70L);
        pago.setProveedor(Constants.PROVEEDOR_ONVO);
        pago.setEstadoPago(Constants.PAGO_CAPTURADO);
        pago.setMonto(15000);
        pago.setMerchantToken(SESION);
        when(pedidoRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.findById(7L)).thenReturn(Optional.of(pedido));
        when(pagoRepository.findTopByPedidoId(7L)).thenReturn(Optional.of(pago));
        when(pagoRepository.findById(70L)).thenReturn(Optional.of(pago));
        when(onvo.reembolsable(anyString())).thenReturn(true);
        doReturn(Map.of("id", SESION, "paymentIntentId", INTENT)).when(onvo).obtenerCheckoutSession(SESION);
        ReembolsoOnvoService service = new ReembolsoOnvoService(pedidoRepository, pagoRepository, onvo, stock, txManager);
        mvc = MockMvcBuilders.standaloneSetup(new AdminReembolsoOnvoController(service)).build();
    }

    @Test
    void onvoConfirma_pagoReembolsadoYPedidoCancelado() throws Exception {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_1", "succeeded"));

        mvc.perform(post(URL))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.estadoPedido").value(Constants.PEDIDO_CANCELADO))
            .andExpect(jsonPath("$.data.estadoPago").value(Constants.PAGO_REEMBOLSADO));

        assertEquals(15000, pago.getMontoReembolsado());
        assertEquals("rf_test_1", pago.getOnvoReembolsoId());
        verify(onvo, times(1)).crearReembolso(eq(INTENT), anyString(), anyString());
    }

    @Test
    void onvoRechaza_revierteYNoMarcaDevuelto() throws Exception {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString()))
            .thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST, "Bad Request", null, null, null));

        mvc.perform(post(URL))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.message").value(ReembolsoOnvoService.MSG_RECHAZO));

        assertEquals(Constants.PEDIDO_PAGADO, pedido.getEstadoPedido());
        assertEquals(Constants.PAGO_CAPTURADO, pago.getEstadoPago());
        assertNull(pago.getMontoReembolsado());
        assertNull(pago.getMontoReembolsoPendiente());
    }

    @Test
    void onvoDevuelveFailed_revierte() throws Exception {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_2", "failed"));

        mvc.perform(post(URL)).andExpect(status().isBadGateway());

        assertEquals(Constants.PEDIDO_PAGADO, pedido.getEstadoPedido());
        assertEquals(Constants.PAGO_CAPTURADO, pago.getEstadoPago());
        assertNull(pago.getMontoReembolsado());
    }

    @Test
    void onvoSinRespuesta_quedaPendienteNuncaDevueltoYReintentaConLaMismaClave() throws Exception {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenThrow(new ResourceAccessException("timeout"));

        mvc.perform(post(URL))
            .andExpect(status().isBadGateway())
            .andExpect(jsonPath("$.message").value(ReembolsoOnvoService.MSG_EN_DUDA));
        assertEquals(Constants.PEDIDO_REEMBOLSO_PENDIENTE, pedido.getEstadoPedido());
        assertEquals(Constants.PAGO_REEMBOLSO_PENDIENTE, pago.getEstadoPago());
        assertNull(pago.getMontoReembolsado());

        // El reintento reusa la Idempotency-Key persistida (V228); sigue sin respuesta → sigue en duda, nunca devuelto.
        mvc.perform(post(URL)).andExpect(status().isBadGateway());
        org.mockito.ArgumentCaptor<String> keys = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(onvo, times(2)).crearReembolso(anyString(), anyString(), keys.capture());
        assertEquals(1, keys.getAllValues().stream().distinct().count());
        assertEquals(Constants.PAGO_REEMBOLSO_PENDIENTE, pago.getEstadoPago());
        assertNull(pago.getMontoReembolsado());
    }

    @Test
    void pendingEnOnvo_202YAlReconsultarSeConfirma() throws Exception {
        when(onvo.crearReembolso(eq(INTENT), anyString(), anyString())).thenReturn(new OnvoReembolso("rf_test_3", "pending"));
        mvc.perform(post(URL)).andExpect(status().isAccepted());
        assertEquals(Constants.PAGO_REEMBOLSO_PENDIENTE, pago.getEstadoPago());

        when(onvo.obtenerReembolso("rf_test_3")).thenReturn(new OnvoReembolso("rf_test_3", "succeeded"));
        mvc.perform(post(URL)).andExpect(status().isOk());
        assertEquals(Constants.PAGO_REEMBOLSADO, pago.getEstadoPago());
        assertEquals(Constants.PEDIDO_CANCELADO, pedido.getEstadoPedido());
        verify(onvo, times(1)).crearReembolso(anyString(), anyString(), anyString());
    }

    @Test
    void pagadoPorFuera_409SinTocarOnvo() throws Exception {
        pago.setProveedor("MANUAL");

        mvc.perform(post(URL))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.message").value(ReembolsoOnvoService.MSG_SIN_PAGO_ONVO));
        assertEquals(Constants.PEDIDO_PAGADO, pedido.getEstadoPedido());
        verify(onvo, never()).crearReembolso(anyString(), anyString(), anyString());
    }

    @Test
    void soloAdmin() throws Exception {
        PreAuthorize pa = AdminReembolsoOnvoController.class
            .getMethod("reembolsar", Long.class).getAnnotation(PreAuthorize.class);
        assertEquals("hasRole('ADMIN')", pa.value());
    }
}
