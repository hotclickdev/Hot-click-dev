package com.hotclick.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El umbral de envío gratis vive en {@code config/tiempos-envio.json} ({@code envioGratis.desdeColones}).
 * Hoy es {@code null}: el checkout cobra tarifa fija y la barra "Te faltan ₡X para envío gratis" no se muestra.
 * Si alguien pone un monto sin implementar el descuento en el cobro, la tienda prometería algo que no cobra así.
 */
@DisplayName("Envío gratis — el umbral de la config solo puede existir si el cobro lo aplica")
class EnvioGratisConfigTest {

    private static final Path CONFIG = Path.of("src/main/resources/config/tiempos-envio.json");
    private static final Path PRICING = Path.of("src/main/java/com/hotclick/service/payment/OrderPricingService.java");

    @Test
    @DisplayName("envioGratis.desdeColones es null o un monto positivo")
    void umbralNuloOPositivo() throws Exception {
        JsonNode umbral = new ObjectMapper().readTree(CONFIG.toFile()).at("/envioGratis/desdeColones");
        assertThat(umbral.isMissingNode()).as("la clave envioGratis.desdeColones existe").isFalse();
        if (!umbral.isNull()) {
            assertThat(umbral.isIntegralNumber()).as("monto entero en colones").isTrue();
            assertThat(umbral.asInt()).isPositive();
        }
    }

    @Test
    @DisplayName("Con un umbral configurado, OrderPricingService tiene que leerlo y aplicarlo")
    void conUmbralElCobroLoAplica() throws Exception {
        JsonNode umbral = new ObjectMapper().readTree(CONFIG.toFile()).at("/envioGratis/desdeColones");
        if (umbral.isNull() || umbral.isMissingNode()) return;
        String pricing = Files.readString(PRICING);
        assertThat(pricing)
            .as("el umbral de envío gratis se promete en la hoja 'Agregado': el cobro debe aplicarlo")
            .containsIgnoringCase("envioGratis");
    }
}
