package com.hotclick.integration;

import com.hotclick.service.BccrService;
import com.hotclick.service.GeminiService;
import com.hotclick.service.NotificacionEmailService;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.analytics.PostHogCaptureService;
import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Arranque del contexto completo con perfil prod activo (más "test" para H2 y propiedades sin infra externa),
 * llave ONVO de prueba FICTICIA y el opt-in en true: la app tiene que levantar y billing quedar fail-closed.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK, properties = {
    "onvo.secret-key=onvo_test_ficticia_no_es_real",
    "payments.onvo.permitir-llave-test=true",
    // En prod la URL pública no puede ser localhost (UrlPublicaArranqueGuard); application-test.properties usa localhost.
    "app.url=https://hotclick.lat",
    // El guard de prod exige la config de billing (valores ficticios).
    "hotclick.planes.moneda=usd",
    "hotclick.planes.emprendedor.precio-mensual-usd=9",
    "hotclick.planes.pyme.precio-mensual-usd=24",
    "hotclick.planes.negocio-plus.precio-mensual-usd=49",
    "onvo.price-id.pyme=price_pyme_ficticio",
    "onvo.price-id.negocio-plus=price_plus_ficticio"
})
@ActiveProfiles({"test", "prod"})
@DisplayName("[ONVO] Arranque con perfil prod + llave onvo_test_ + opt-in")
class ArranqueProdLlaveOnvoTestOptInTest {

    @MockitoBean ResendEmailService resendEmailService;
    @MockitoBean NotificacionEmailService notificacionEmailService;
    @MockitoBean SupabaseStorageService supabaseStorageService;
    @MockitoBean BccrService bccrService;
    @MockitoBean GeminiService geminiService;
    @MockitoBean PostHogCaptureService postHogCaptureService;

    @Autowired OnvoBillingClient onvoBillingClient;

    @Test
    void contextoLevantaYBillingQuedaDeshabilitado() {
        assertThat(onvoBillingClient.isBillingDeshabilitado()).isTrue();
        assertThat(onvoBillingClient.isMockMode()).isFalse();
    }
}
