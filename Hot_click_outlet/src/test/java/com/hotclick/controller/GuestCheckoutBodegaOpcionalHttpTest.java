package com.hotclick.controller;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.service.PaymentService;
import com.hotclick.service.SinpeService;
import com.hotclick.service.payment.CheckoutPaquetesPlanner;
import com.hotclick.service.payment.GuestCheckoutGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Prod 0c295646: guest-checkout con envío sin bodegaId daba 400 por @NotNull antes del fallback. */
@DisplayName("guest-checkout: bodegaId opcional por HTTP")
class GuestCheckoutBodegaOpcionalHttpTest {

    private static final String SIN_BODEGA = """
        {"metodoEnvio":"ENVIO_NORMAL","provider":"ONVO","guestEmail":"comprador@test.cr",
         "direccionEntrega":"San José","items":[{"productoId":10,"cantidad":1},{"productoId":11,"cantidad":1}]}
        """;
    private static final String BODEGA_INEXISTENTE = """
        {"bodegaId":999,"metodoEnvio":"ENVIO_NORMAL","provider":"ONVO","guestEmail":"comprador@test.cr",
         "items":[{"productoId":10,"cantidad":1}]}
        """;

    private PaymentService paymentService;
    private SinpeService sinpeService;
    private MockMvc mvc;

    @BeforeEach
    void setUp() throws Exception {
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        when(guard.ejecutar(any(), any(), any())).thenAnswer(inv ->
            ((java.util.function.Supplier<?>) inv.getArgument(2)).get());
        paymentService = mock(PaymentService.class);
        PaymentController pc = new PaymentController();
        ReflectionTestUtils.setField(pc, "paymentService", paymentService);
        ReflectionTestUtils.setField(pc, "guestCheckoutGuard", guard);
        sinpeService = mock(SinpeService.class);
        SinpeController sc = new SinpeController();
        ReflectionTestUtils.setField(sc, "sinpeService", sinpeService);
        ReflectionTestUtils.setField(sc, "guestCheckoutGuard", guard);
        mvc = MockMvcBuilders.standaloneSetup(pc, sc).build();
    }

    @Test
    @DisplayName("envío sin bodegaId pasa @Valid, llega al servicio con bodegaId null y da 200")
    void envioSinBodega200() throws Exception {
        when(paymentService.checkout(any(), isNull())).thenReturn(null);
        mvc.perform(post("/api/payments/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(SIN_BODEGA))
            .andExpect(status().isOk());
        ArgumentCaptor<PaymentCheckoutRequest> cap = ArgumentCaptor.forClass(PaymentCheckoutRequest.class);
        verify(paymentService).checkout(cap.capture(), isNull());
        assertThat(cap.getValue().getBodegaId()).isNull();
        assertThat(cap.getValue().getItems()).hasSize(2);
    }

    @Test
    @DisplayName("SINPE guest-checkout sin bodegaId también pasa @Valid")
    void sinpeSinBodega200() throws Exception {
        mvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(SIN_BODEGA))
            .andExpect(status().isOk());
        verify(sinpeService).checkout(any(), isNull());
    }

    @Test
    @DisplayName("bodegaId explícita inexistente (≠1) da 404, no 500")
    void bodegaInexistente404() throws Exception {
        when(paymentService.checkout(any(), any())).thenThrow(new RecursoNoEncontradoException("Bodega", 999L));
        when(sinpeService.checkout(any(), any())).thenThrow(new RecursoNoEncontradoException("Bodega", 999L));
        mvc.perform(post("/api/payments/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(BODEGA_INEXISTENTE))
            .andExpect(status().isNotFound());
        mvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(BODEGA_INEXISTENTE))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("planner sin bodega de despacho: IllegalStateException sin causa → 400 claro")
    void plannerSinBodega400() throws Exception {
        Producto p = new Producto();
        p.setId(10L);
        p.setNombreProducto("Camisa");
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        PaymentCheckoutRequest.ItemDTO it = new PaymentCheckoutRequest.ItemDTO();
        it.setProductoId(10L);
        it.setCantidad(1);
        r.setItems(List.of(it));
        IllegalStateException[] ex = new IllegalStateException[1];
        assertThatThrownBy(() -> new CheckoutPaquetesPlanner().planificar(r, Map.of(10L, p), null))
            .isInstanceOf(IllegalStateException.class)
            .satisfies(e -> { assertThat(e.getCause()).isNull(); ex[0] = (IllegalStateException) e; })
            .hasMessageContaining("no tiene bodega de despacho");
        when(paymentService.checkout(any(), any())).thenThrow(ex[0]);
        mvc.perform(post("/api/payments/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(SIN_BODEGA))
            .andExpect(status().isBadRequest());
        assertThat(new com.hotclick.config.GlobalExceptionHandler().handleIllegalState(ex[0]).getStatusCode().value())
            .isEqualTo(400);
    }
}
