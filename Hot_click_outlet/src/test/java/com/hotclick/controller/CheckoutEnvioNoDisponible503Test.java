package com.hotclick.controller;

import com.hotclick.config.GlobalExceptionHandler;
import com.hotclick.exception.EnvioNoDisponibleException;
import com.hotclick.service.PaymentService;
import com.hotclick.service.SinpeService;
import com.hotclick.service.payment.GuestCheckoutGuard;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** BAJO #448: si la config de envío no está disponible, los checkouts responden 503 genérico, no 500. */
@DisplayName("checkout: EnvioNoDisponibleException sale como 503 (no la traga el catch genérico)")
class CheckoutEnvioNoDisponible503Test {

    private static final String BODY = """
        {"metodoEnvio":"ENVIO_NORMAL_GAM","provider":"ONVO","guestEmail":"comprador@test.cr",
         "direccionEntrega":"San José","provincia":"San José","canton":"San José",
         "items":[{"productoId":10,"cantidad":1}]}
        """;

    private MockMvc mvc;

    @BeforeEach
    void setUp() throws Exception {
        GuestCheckoutGuard guard = mock(GuestCheckoutGuard.class);
        when(guard.ejecutar(any(), any(), any())).thenAnswer(inv ->
            ((java.util.function.Supplier<?>) inv.getArgument(2)).get());
        PaymentService paymentService = mock(PaymentService.class);
        when(paymentService.checkout(any(), any())).thenThrow(new EnvioNoDisponibleException());
        PaymentController pc = new PaymentController();
        ReflectionTestUtils.setField(pc, "paymentService", paymentService);
        ReflectionTestUtils.setField(pc, "guestCheckoutGuard", guard);
        SinpeService sinpeService = mock(SinpeService.class, inv -> {
            if (inv.getMethod().getName().toLowerCase().contains("checkout")) throw new EnvioNoDisponibleException();
            return RETURNS_DEFAULTS.answer(inv);
        });
        SinpeController sc = new SinpeController();
        ReflectionTestUtils.setField(sc, "sinpeService", sinpeService);
        ReflectionTestUtils.setField(sc, "guestCheckoutGuard", guard);
        mvc = MockMvcBuilders.standaloneSetup(pc, sc).setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/payments/guest-checkout", "/api/sinpe/guest-checkout"})
    void guestCheckout503(String url) throws Exception {
        mvc.perform(post(url).contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.error").value("ENVIO_NO_DISPONIBLE"))
            .andExpect(header().string("Retry-After", "60"));
    }
}
