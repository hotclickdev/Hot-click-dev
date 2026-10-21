package com.hotclick.controller;

import com.hotclick.exception.AutocompraNegocioException;
import com.hotclick.service.SinpeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** G1b (C1): la autocompra responde 403 AUTOCOMPRA_NEGOCIO por HTTP, no 500. */
@DisplayName("G1b | autocompra por HTTP en /api/sinpe")
class SinpeAutocompraHttpTest {

    private static final String BODY = """
        {"bodegaId":1,"metodoEnvio":"RETIRO_EN_TIENDA","provider":"EFECTIVO",
         "guestEmail":"dueno@tienda.cr","items":[{"productoId":10,"cantidad":1}]}
        """;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        SinpeService service = mock(SinpeService.class);
        when(service.checkout(any(), any())).thenThrow(new AutocompraNegocioException());
        SinpeController c = new SinpeController();
        ReflectionTestUtils.setField(c, "sinpeService", service);
        com.hotclick.service.payment.GuestCheckoutGuard guard = mock(com.hotclick.service.payment.GuestCheckoutGuard.class);
        when(guard.ejecutar(any(), any(), any())).thenAnswer(inv ->
            ((java.util.function.Supplier<?>) inv.getArgument(2)).get());
        ReflectionTestUtils.setField(c, "guestCheckoutGuard", guard);
        mvc = MockMvcBuilders.standaloneSetup(c).build();
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("dueno@tienda.cr", "x", List.of()));
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("checkout logueado: 403 con codigo")
    void checkoutLogueado403() throws Exception {
        mvc.perform(post("/api/sinpe/checkout").contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.data.codigo").value("AUTOCOMPRA_NEGOCIO"));
    }

    @Test
    @DisplayName("guest-checkout: 403 con codigo")
    void guestCheckout403() throws Exception {
        mvc.perform(post("/api/sinpe/guest-checkout").contentType(MediaType.APPLICATION_JSON).content(BODY))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.data.codigo").value("AUTOCOMPRA_NEGOCIO"));
    }
}
