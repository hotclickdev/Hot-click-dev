package com.hotclick.service.analytics;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
@DisplayName("PostHogCaptureService — pedido_pagado sin PII")
class PostHogCaptureServiceTest {

    @Mock RestTemplate restTemplate;

    @Test
    @DisplayName("sin token no llama a PostHog")
    void sinTokenNoEnvia() {
        PostHogCaptureService svc = new PostHogCaptureService(restTemplate, "", "https://us.i.posthog.com");
        svc.capturarPedidoPagado(pedido(null), null);
        verifyNoInteractions(restTemplate);
    }

    @Test
    @DisplayName("envia monto y pedido_id, nunca el correo")
    @SuppressWarnings("unchecked")
    void enviaSinPii() {
        PostHogCaptureService svc = new PostHogCaptureService(restTemplate, "phc_test", "https://us.i.posthog.com/");
        Usuario user = new Usuario();
        user.setId(42L);
        user.setCorreo("no-enviar@example.com");
        Pago pago = new Pago();
        pago.setProveedor("STRIPE");

        svc.capturarPedidoPagado(pedido(user), pago);

        ArgumentCaptor<HttpEntity<Map<String, Object>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForObject(eq("https://us.i.posthog.com/capture/"), captor.capture(), eq(String.class));
        Map<String, Object> body = captor.getValue().getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("event")).isEqualTo("pedido_pagado");
        assertThat(body.get("distinct_id")).isEqualTo("42");
        assertThat(body.toString()).doesNotContain("no-enviar@example.com");
        Map<String, Object> props = (Map<String, Object>) body.get("properties");
        assertThat(props.get("monto")).isEqualTo(8500);
        assertThat(props.get("pedido_id")).isEqualTo("HC-99");
        assertThat(props.get("proveedor")).isEqualTo("STRIPE");
        assertThat(props).doesNotContainKey("correo");
    }

    private static Pedido pedido(Usuario user) {
        Pedido p = new Pedido();
        p.setNumeroPedido("HC-99");
        p.setTotalPedido(8500);
        p.setOrigen("ONLINE");
        p.setUsuarioFinal(user);
        return p;
    }
}
