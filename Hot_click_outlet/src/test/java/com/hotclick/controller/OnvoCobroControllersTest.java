package com.hotclick.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.EnlacePagoOnvo;
import com.hotclick.payment.OnvoPaymentProvider;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.OnvoService;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoService.ResultadoWebhook;
import com.hotclick.service.pos.PosQrVentaService;
import com.hotclick.service.suscripcion.OnvoBillingWebhookHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("Fase 3: webhook de enlace de pago y autorización de los endpoints ONVO")
class OnvoCobroControllersTest {

    private static final String SECRET = String.join("-", "firma", "de", "prueba");
    private static final String SESION = "{\"type\":\"checkout-session.succeeded\",\"data\":{\"id\":\"sess_1\"}}";

    private final OnvoService onvoService = mock(OnvoService.class);
    private final OnvoPaymentProvider provider = mock(OnvoPaymentProvider.class);
    private final EnlacePagoOnvoService enlaces = mock(EnlacePagoOnvoService.class);
    private final OnvoBillingWebhookHandler billing = mock(OnvoBillingWebhookHandler.class);

    private OnvoWebhookController controller() {
        OnvoWebhookController c = new OnvoWebhookController(onvoService, provider, mock(PosQrVentaService.class),
            billing, new ObjectMapper());
        c.setEnlacePagoParaTest(enlaces);
        when(onvoService.getWebhookSecret()).thenReturn(SECRET);
        when(billing.manejarSiBilling(any(), any(), any())).thenReturn(false);
        return c;
    }

    @Test
    @DisplayName("Sesión de un enlace pagado: 200 y no se toca el flujo de pedidos")
    void pagado() {
        when(enlaces.confirmarPorWebhook("sess_1")).thenReturn(ResultadoWebhook.PAGADO);
        assertThat(controller().recibirWebhookOnvo(SESION, SECRET).getStatusCode().value()).isEqualTo(200);
        verifyNoInteractions(provider);
    }

    @Test
    @DisplayName("Entrega repetida: 200 duplicate, sin reprocesar")
    void duplicado() {
        when(enlaces.confirmarPorWebhook("sess_1")).thenReturn(ResultadoWebhook.DUPLICADO);
        var r = controller().recibirWebhookOnvo(SESION, SECRET);
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        assertThat(r.getBody()).containsEntry("status", "duplicate");
    }

    @Test
    @DisplayName("Sin confirmar o ONVO caído: no 2xx para que ONVO reintente")
    void failClosed() {
        when(enlaces.confirmarPorWebhook("sess_1")).thenReturn(ResultadoWebhook.NO_VERIFICADO);
        assertThat(controller().recibirWebhookOnvo(SESION, SECRET).getStatusCode().value()).isEqualTo(409);
        when(enlaces.confirmarPorWebhook("sess_1")).thenReturn(ResultadoWebhook.NO_CONSULTABLE);
        assertThat(controller().recibirWebhookOnvo(SESION, SECRET).getStatusCode().value()).isEqualTo(503);
    }

    @Test
    @DisplayName("Secret inválido: 401 y el servicio de enlaces no se toca")
    void secretInvalido() {
        assertThat(controller().recibirWebhookOnvo(SESION, "otro").getStatusCode().value()).isEqualTo(401);
        verifyNoInteractions(enlaces);
    }

    @Test
    @DisplayName("Sesión que no es de un enlace: sigue al flujo de pedidos de siempre")
    void noEsEnlace() {
        when(enlaces.confirmarPorWebhook("sess_1")).thenReturn(ResultadoWebhook.NO_ES_ENLACE);
        when(provider.procesarPagoVerificado("sess_1", "webhook")).thenReturn(OnvoPaymentProvider.Verificacion.OK);
        assertThat(controller().recibirWebhookOnvo(SESION, SECRET).getStatusCode().value()).isEqualTo(200);
        verify(provider).procesarPagoVerificado("sess_1", "webhook");
    }

    @Test
    @DisplayName("Crear, cancelar, sincronizar y consultar exigen rol ADMIN")
    void soloAdmin() {
        int revisados = 0;
        for (Method m : AdminOnvoCobroController.class.getDeclaredMethods()) {
            if (!Modifier.isPublic(m.getModifiers())) continue;
            PreAuthorize pa = m.getAnnotation(PreAuthorize.class);
            assertThat(pa).as(m.getName()).isNotNull();
            assertThat(pa.value()).isEqualTo("hasRole('ADMIN')");
            revisados++;
        }
        assertThat(revisados).isEqualTo(9);
    }

    @Test
    @DisplayName("El negocio ve solo sus enlaces: la empresa sale de la sesión y no se expone nada de otras")
    void aislamientoDeTenant() {
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.requireEmpresaId()).thenReturn(7L);
        EnlacePagoOnvo e = new EnlacePagoOnvo();
        e.setMontoCrc(25_000);
        e.setMotivo("Factura tardía");
        e.setUrl("https://pay.test/s1");
        when(enlaces.abiertosDe(7L)).thenReturn(List.of(e));
        var r = new EmpresaEnlacePagoController(scope, enlaces).abiertos();
        assertThat(r.getStatusCode().value()).isEqualTo(200);
        verify(enlaces).abiertosDe(7L);
        verify(enlaces, never()).abiertosDe(8L);
        // El método no recibe ningún id del cliente.
        for (Method m : EmpresaEnlacePagoController.class.getDeclaredMethods()) {
            if (Modifier.isPublic(m.getModifiers())) assertThat(m.getParameterCount()).isZero();
        }
    }
}
