package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.service.PaymentService;
import com.hotclick.service.SinpeService;
import com.hotclick.service.payment.GuestCheckoutGuard;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Checkout con envío y un paquete "sin-bodega" (productos sin bodega propia): el front manda
 * {@code envios[].bodegaId} ausente y el backend resuelve la bodega de origen. No puede dar 400
 * "La bodega del paquete es requerida".
 */
@DisplayName("checkout: paquete de envío sin bodegaId pasa @Valid")
class EnvioPaqueteSinBodegaHttpTest {

    private static final String PAQUETE_SIN_BODEGA = """
        {"metodoEnvio":"ENVIO_NORMAL_GAM","provider":"ONVO","guestEmail":"comprador@test.cr",
         "direccionEntrega":"San José",
         "envios":[{"metodoEnvio":"ENVIO_NORMAL_GAM"},{"bodegaId":7,"metodoEnvio":"ENVIO_NORMAL_GAM"}],
         "items":[{"productoId":10,"cantidad":1},{"productoId":11,"cantidad":1}]}
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
    @DisplayName("bean validation: envios[].bodegaId null no genera violaciones")
    void validacionSinViolaciones() throws Exception {
        PaymentCheckoutRequest req = new ObjectMapper().readValue(PAQUETE_SIN_BODEGA, PaymentCheckoutRequest.class);
        Validator v = Validation.buildDefaultValidatorFactory().getValidator();
        assertThat(v.validate(req))
            .extracting(c -> c.getPropertyPath() + ": " + c.getMessage())
            .doesNotContain("envios[0].bodegaId: La bodega del paquete es requerida");
        assertThat(v.validate(req)).isEmpty();
    }

    @Test
    @DisplayName("POST guest-checkout con un paquete sin bodegaId llega al servicio (200, no 400)")
    void guestCheckoutPaqueteSinBodega200() throws Exception {
        mvc.perform(post("/api/payments/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(PAQUETE_SIN_BODEGA))
            .andExpect(status().isOk());
        verify(paymentService).checkout(any(), any());
    }

    @Test
    @DisplayName("POST sinpe guest-checkout con un paquete sin bodegaId también pasa @Valid")
    void sinpePaqueteSinBodega200() throws Exception {
        mvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(PAQUETE_SIN_BODEGA))
            .andExpect(status().isOk());
    }
}
