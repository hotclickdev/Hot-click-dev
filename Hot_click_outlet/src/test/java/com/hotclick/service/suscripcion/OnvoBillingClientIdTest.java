package com.hotclick.service.suscripcion;

import com.hotclick.service.onvo.OnvoBillingClient;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("OnvoBillingClient: validación del id antes del GET")
class OnvoBillingClientIdTest {

    @Test
    @DisplayName("idValido acepta ids de ONVO y rechaza traversal, query, espacios, vacío y largo > 64")
    void idValidoForma() {
        assertThat(OnvoBillingClient.idValido("clsub0001")).isTrue();
        assertThat(OnvoBillingClient.idValido("pi_ab-12")).isTrue();
        assertThat(OnvoBillingClient.idValido("a".repeat(64))).isTrue();
        assertThat(OnvoBillingClient.idValido("a".repeat(65))).isFalse();
        for (String malo : new String[] {null, "", " ", "../customers", "a/b", "a?x=1", "a b", "a%2Fb", "id\n", "id#x"}) {
            assertThat(OnvoBillingClient.idValido(malo)).as(String.valueOf(malo)).isFalse();
        }
    }

    @Test
    @DisplayName("Los GET de verificación rechazan un id inválido con IllegalArgumentException antes de cualquier llamada")
    void getConIdInvalidoFalla() {
        OnvoBillingClient client = new OnvoBillingClient(new RestTemplate());
        assertThatThrownBy(() -> client.obtenerSuscripcion("../x")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> client.obtenerRenovacion("a/b")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> client.obtenerPaymentIntent("a?b=1")).isInstanceOf(IllegalArgumentException.class);
    }
}
