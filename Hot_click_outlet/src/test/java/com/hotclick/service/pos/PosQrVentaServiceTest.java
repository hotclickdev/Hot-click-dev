package com.hotclick.service.pos;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.OnvoService;
import com.hotclick.service.StripeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Checkout tarjeta POS QR (ONVO)")
class PosQrVentaServiceTest {

    @Mock PosQrSesionRepository posQrRepo;
    @Mock StripeService stripeService;
    @Mock OnvoService onvoService;
    @Mock PosQrSessionService sessionService;
    @Mock PosQrVentaCompletionService completionService;
    @InjectMocks PosQrVentaService service;

    @BeforeEach
    void urlApp() {
        ReflectionTestUtils.setField(service, "appUrl", "https://hotclick.lat");
    }

    @Test
    @DisplayName("Crea checkout ONVO, guarda el id y devuelve la URL")
    void creaCheckoutOnvoYGuardaSessionId() {
        PosQrSesion sesion = sesionTarjeta();
        when(sessionService.findSesionActiva("tokentarjetaqr01")).thenReturn(sesion);
        when(sessionService.getMapper()).thenReturn(new ObjectMapper());
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.crearCheckoutSession(eq(5000), any(), any(), any(), eq("qa@negocio.test"), any()))
            .thenReturn(new OnvoService.OnvoCheckoutSession("onvo_cs_pos", "https://pay.onvo.test/cs"));
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        String url = service.crearStripeCheckout("tokentarjetaqr01");

        assertThat(url).isEqualTo("https://pay.onvo.test/cs");
        assertThat(sesion.getStripeSessionId()).isEqualTo("onvo_cs_pos");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Map<String, String>> meta = ArgumentCaptor.forClass(Map.class);
        verify(onvoService).crearCheckoutSession(eq(5000), any(),
            eq("https://hotclick.lat/pos/pago/tokentarjetaqr01?resultado=exito"),
            eq("https://hotclick.lat/pos/pago/tokentarjetaqr01?resultado=cancelado"),
            eq("qa@negocio.test"), meta.capture());
        assertThat(meta.getValue()).containsEntry("pos_qr_token", "tokentarjetaqr01");
        assertThat(meta.getValue()).containsEntry("origen", "POS");
    }

    @Test
    @DisplayName("Checkout sin empresa no hace NPE")
    void checkoutSinEmpresaFallaClaro() {
        PosQrSesion sesion = sesionTarjeta();
        sesion.setEmpresa(null);
        when(sessionService.findSesionActiva("tokentarjetaqr01")).thenReturn(sesion);
        when(onvoService.isMockMode()).thenReturn(false);

        assertThatThrownBy(() -> service.crearStripeCheckout("tokentarjetaqr01"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("empresa");
    }

    @Test
    @DisplayName("Sin ONVO configurado no inventa un checkout mock")
    void sinOnvoNoUsaMock() {
        when(sessionService.findSesionActiva("tokentarjetaqr01")).thenReturn(sesionTarjeta());
        when(onvoService.isMockMode()).thenReturn(true);

        assertThatThrownBy(() -> service.crearStripeCheckout("tokentarjetaqr01"))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("ONVO");
        verify(onvoService, never()).crearCheckoutSession(anyInt(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Checkout POS manda el correo del negocio a ONVO")
    void checkoutMandaCorreoDelNegocio() {
        assertThat(PosQrVentaService.correoCheckout(sesionTarjeta())).isEqualTo("qa@negocio.test");
        Empresa sinCorreo = new Empresa();
        sinCorreo.setId(1L);
        PosQrSesion sesion = new PosQrSesion();
        sesion.setEmpresa(sinCorreo);
        assertThat(PosQrVentaService.correoCheckout(sesion)).isNull();
    }

    @Test
    @DisplayName("Crea payment intent ONVO para SDK embebido")
    void creaPaymentIntentOnvo() {
        PosQrSesion sesion = sesionTarjeta();
        when(sessionService.findSesionActiva("tokentarjetaqr01")).thenReturn(sesion);
        when(sessionService.getMapper()).thenReturn(new ObjectMapper());
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.getPublishableKey()).thenReturn("onvo_test_publishable");
        when(onvoService.crearPaymentIntent(eq(5000), any(), any()))
            .thenReturn(new OnvoService.OnvoPaymentIntent("onvo_pi_pos"));
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        Map<String, String> res = service.crearPaymentIntent("tokentarjetaqr01");

        assertThat(res).containsEntry("paymentIntentId", "onvo_pi_pos");
        assertThat(res).containsEntry("publishableKey", "onvo_test_publishable");
        assertThat(sesion.getStripeSessionId()).isEqualTo("onvo_pi_pos");
    }

    @Test
    @DisplayName("Crea payment intent ONVO también para sesión SINPE")
    void creaPaymentIntentOnvoParaSinpe() {
        PosQrSesion sesion = sesionTarjeta();
        sesion.setMetodoPago("SINPE");
        when(sessionService.findSesionActiva("tokentarjetaqr01")).thenReturn(sesion);
        when(sessionService.getMapper()).thenReturn(new ObjectMapper());
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.getPublishableKey()).thenReturn("onvo_test_publishable");
        when(onvoService.crearPaymentIntent(eq(5000), any(), any()))
            .thenReturn(new OnvoService.OnvoPaymentIntent("onvo_pi_sinpe"));
        when(posQrRepo.save(sesion)).thenReturn(sesion);

        Map<String, String> res = service.crearPaymentIntent("tokentarjetaqr01");

        assertThat(res).containsEntry("paymentIntentId", "onvo_pi_sinpe");
        assertThat(sesion.getStripeSessionId()).isEqualTo("onvo_pi_sinpe");
    }

    @Test
    @DisplayName("SINPE ONVO no exige publishable key y usa el correo del negocio")
    void iniciarSinpeOnvoUsaCorreoYNoPublishable() {
        PosQrSesion sesion = sesionTarjeta();
        sesion.setMetodoPago("SINPE");
        when(sessionService.findSesionActiva("tokentarjetaqr01")).thenReturn(sesion);
        when(sessionService.getMapper()).thenReturn(new ObjectMapper());
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.crearPaymentIntent(eq(5000), any(), any()))
            .thenReturn(new OnvoService.OnvoPaymentIntent("onvo_pi_sinpe"));
        when(onvoService.crearMetodoPagoSinpe(eq("101110111"), eq("+50688880000"), eq("Ana Perez"), eq("qa@negocio.test")))
            .thenReturn(new OnvoService.OnvoPaymentMethod("onvo_pm_sinpe"));
        when(posQrRepo.save(sesion)).thenReturn(sesion);
        ReflectionTestUtils.setField(service, "onvoSinpeDestino", "+50670196686");

        Map<String, String> res = service.iniciarSinpeOnvo(
            "tokentarjetaqr01", "8888-0000", "101110111", "Ana Perez", null);

        assertThat(res).containsEntry("estado", "PROCESSING");
        assertThat(res).containsEntry("destino", "+50670196686");
        verify(onvoService).confirmarPaymentIntent("onvo_pi_sinpe", "onvo_pm_sinpe");
        verify(onvoService, never()).getPublishableKey();
    }

    @Test
    @DisplayName("SINPE ONVO no reconfirma un payment intent ya succeeded")
    void iniciarSinpeOnvoNoReconfirmaSiYaPagado() {
        PosQrSesion sesion = sesionTarjeta();
        sesion.setMetodoPago("SINPE");
        sesion.setStripeSessionId("onvo_pi_sinpe");
        when(sessionService.findSesionActiva("tokentarjetaqr01")).thenReturn(sesion);
        when(onvoService.isMockMode()).thenReturn(false);
        when(onvoService.paymentIntentPagado("onvo_pi_sinpe")).thenReturn(true);
        ReflectionTestUtils.setField(service, "onvoSinpeDestino", "+50670196686");

        Map<String, String> res = service.iniciarSinpeOnvo(
            "tokentarjetaqr01", "8888-0000", "101110111", "Ana Perez", null);

        assertThat(res).containsEntry("estado", "PROCESSING");
        verify(onvoService, never()).crearMetodoPagoSinpe(any(), any(), any(), any());
        verify(onvoService, never()).confirmarPaymentIntent(any(), any());
    }

    @Test
    @DisplayName("Webhook POS completa la venta pendiente")
    void webhookCompletaVentaPendiente() {
        PosQrSesion sesion = sesionTarjeta();
        when(posQrRepo.findByStripeSessionId("onvo_cs_pos")).thenReturn(Optional.of(sesion));

        assertThat(service.completarSiPagoPasarela("onvo_cs_pos")).isTrue();
        verify(completionService).completarVentaTarjeta(sesion);
    }

    @Test
    @DisplayName("Session id de tienda no se trata como POS QR")
    void sessionDeTiendaNoEsPos() {
        when(posQrRepo.findByStripeSessionId("onvo_tienda")).thenReturn(Optional.empty());

        assertThat(service.completarSiPagoPasarela("onvo_tienda")).isFalse();
        verify(completionService, never()).completarVentaTarjeta(any());
    }

    @Test
    @DisplayName("Poll de payment intent ONVO marca PAGADO en sesión SINPE")
    void pollOnvoMarcaPagadoSinpe() {
        PosQrSesion sesion = sesionTarjeta();
        sesion.setMetodoPago("SINPE");
        sesion.setStripeSessionId("onvo_pi_sinpe");
        sesion.setFechaExpiracion(java.time.LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).plusMinutes(10));
        when(posQrRepo.findByToken("tokentarjetaqr01")).thenReturn(Optional.of(sesion));
        when(onvoService.paymentIntentStatus("onvo_pi_sinpe")).thenReturn("succeeded");

        assertThat(service.verificarEstado("tokentarjetaqr01")).isEqualTo("PAGADO");
        verify(completionService).completarVentaTarjeta(sesion);
    }

    @Test
    @DisplayName("Descripción del checkout cabe en 100 caracteres")
    void descripcionCheckoutCorta() {
        String corta = PosQrVentaService.descripcionCheckout(List.of(
            Map.of("nombre", "Mouse", "cantidad", 1)));
        assertThat(corta).isEqualTo("Mouse x1");

        String larga = PosQrVentaService.descripcionCheckout(List.of(
            Map.of("nombre", "A".repeat(80), "cantidad", 2),
            Map.of("nombre", "B".repeat(80), "cantidad", 1)));
        assertThat(larga).hasSize(100);
    }

    private static PosQrSesion sesionTarjeta() {
        Empresa empresa = new Empresa();
        empresa.setId(9L);
        empresa.setCorreoEmpresa("qa@negocio.test");
        PosQrSesion sesion = new PosQrSesion();
        sesion.setToken("tokentarjetaqr01");
        sesion.setMetodoPago("TARJETA");
        sesion.setEstado("PENDIENTE");
        sesion.setTotal(5000);
        sesion.setEmpresa(empresa);
        sesion.setItemsJson("[{\"nombre\":\"Mouse\",\"cantidad\":1}]");
        return sesion;
    }
}
