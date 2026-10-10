package com.hotclick.service.payment;

import com.hotclick.model.Bodega;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Lista blanca de métodos de envío del checkout (merge 89c1795b2, L4): un método desconocido caía en
 * {@code OrderPricingService.calcularCostoEnvio} → default 0, o sea envío gratis. ENVIO_A_DOMICILIO es
 * solo para pedidos manuales del panel, no para el checkout del comprador.
 */
class MetodoEnvioCheckoutTest {

    private final CheckoutValidator validator = new CheckoutValidator();

    private static Bodega bodegaConRetiro() {
        Bodega b = new Bodega();
        b.setPermiteRetiroCliente(true);
        return b;
    }

    @ParameterizedTest
    @ValueSource(strings = {"ENVIO_GRATIS", "envio_rapido", "ENVIO_A_DOMICILIO", "", "RETIRO"})
    @DisplayName("método desconocido o solo-manual ⇒ rechazado")
    void metodoNoPermitido_seRechaza(String metodo) {
        assertThatThrownBy(() -> validator.validarRetiroPaquete(metodo, bodegaConRetiro()))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"RETIRO_EN_TIENDA", "ENCOMIENDA_PROPIA", "ENVIO_NORMAL_GAM", "ENVIO_NORMAL_FUERA_GAM", "ENVIO_RAPIDO"})
    @DisplayName("métodos del checkout ⇒ aceptados")
    void metodoPermitido_pasa(String metodo) {
        assertThatCode(() -> validator.validarRetiroPaquete(metodo, bodegaConRetiro())).doesNotThrowAnyException();
    }
}
