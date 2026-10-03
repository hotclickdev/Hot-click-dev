package com.hotclick.controller;

import com.hotclick.service.payment.TilopayConfirmacionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("TilopayWebhookController — secret gate")
class TilopayWebhookControllerSecretTest {

    @Mock private TilopayConfirmacionService tilopayConfirmacionService;
    @Mock private Environment environment;

    @InjectMocks private TilopayWebhookController controller;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(controller, "webhookSecret", "");
    }

    @Test
    @DisplayName("sin secret y fuera de dev/test → 401, no procesa")
    void sinSecret_enProduccion_rechaza() {
        when(environment.acceptsProfiles(any(Profiles.class))).thenReturn(false);

        ResponseEntity<Map<String, String>> resp = controller.recibir(
            Map.of("orderNumber", "ORD-1"), null);

        assertThat(resp.getStatusCode().value()).isEqualTo(401);
        verify(tilopayConfirmacionService, never()).procesarWebhook(any(), any());
    }

    @Test
    @DisplayName("sin secret en perfil test → acepta")
    void sinSecret_enTest_acepta() {
        when(environment.acceptsProfiles(any(Profiles.class))).thenReturn(true);

        ResponseEntity<Map<String, String>> resp = controller.recibir(
            Map.of("orderNumber", "ORD-1"), null);

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        verify(tilopayConfirmacionService).procesarWebhook(anyString(), anyString());
    }

    @Test
    @DisplayName("secret configurado y header incorrecto → 401")
    void secretConfigurado_headerMal_rechaza() {
        ReflectionTestUtils.setField(controller, "webhookSecret", "super-secret");

        ResponseEntity<Map<String, String>> resp = controller.recibir(
            Map.of("orderNumber", "ORD-1"), "wrong");

        assertThat(resp.getStatusCode().value()).isEqualTo(401);
        verify(tilopayConfirmacionService, never()).procesarWebhook(any(), any());
    }

    @Test
    @DisplayName("secret configurado y header correcto → 200")
    void secretConfigurado_headerOk_acepta() {
        ReflectionTestUtils.setField(controller, "webhookSecret", "super-secret");

        ResponseEntity<Map<String, String>> resp = controller.recibir(
            Map.of("orderNumber", "ORD-1"), "super-secret");

        assertThat(resp.getStatusCode().value()).isEqualTo(200);
        verify(tilopayConfirmacionService).procesarWebhook(anyString(), anyString());
    }
}
