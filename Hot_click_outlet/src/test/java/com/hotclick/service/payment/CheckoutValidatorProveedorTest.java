package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.payment.PaymentProvider;
import com.hotclick.payment.PaymentProviderFactory;
import com.hotclick.payment.PaymentSession;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Checkout sin proveedor: se rechaza con mensaje claro, sin caer en una pasarela por defecto")
class CheckoutValidatorProveedorTest {

    private static PaymentProvider proveedor(String nombre) {
        return new PaymentProvider() {
            @Override public String getNombre() { return nombre; }
            @Override public PaymentSession crearSesion(com.hotclick.model.Pedido p, com.hotclick.model.Usuario u) { return null; }
        };
    }

    private final PaymentProviderFactory factory =
        new PaymentProviderFactory(List.of(proveedor("STRIPE"), proveedor("SINPE"), proveedor("ONVO")));

    private CheckoutValidator validator(boolean onvo) {
        CheckoutValidator v = new CheckoutValidator();
        ReflectionTestUtils.setField(v, "onvoEnabled", onvo);
        return v;
    }

    private static PaymentCheckoutRequest req(String provider) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setProvider(provider);
        return r;
    }

    @Test
    void sinProveedor_rechaza_noCaeEnStripe() {
        assertThatThrownBy(() -> validator(false).resolveProvider(req(null), factory))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage(CheckoutValidator.MENSAJE_SIN_METODO);
        assertThatThrownBy(() -> validator(false).resolveProvider(req("  "), factory))
            .hasMessage(CheckoutValidator.MENSAJE_SIN_METODO);
        assertThatThrownBy(() -> factory.get(null)).isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Elegí un método de pago");
    }

    @Test
    void proveedorRetiradoONoRegistrado_rechaza() {
        assertThatThrownBy(() -> validator(false).resolveProvider(req("PAYPAL"), factory))
            .hasMessage(CheckoutValidator.MENSAJE_SIN_METODO);
        assertThatThrownBy(() -> validator(false).resolveProvider(req("TARJETA"), factory))
            .hasMessage(CheckoutValidator.MENSAJE_SIN_METODO);
    }

    @Test
    void onvoApagado_mensajeClaro_yEncendidoPasa() {
        assertThatThrownBy(() -> validator(false).resolveProvider(req("onvo"), factory))
            .hasMessage(CheckoutValidator.MENSAJE_PASARELA_NO_DISPONIBLE);
        assertThat(validator(true).resolveProvider(req("onvo"), factory)).isEqualTo("ONVO");
        assertThat(validator(false).resolveProvider(req("sinpe"), factory)).isEqualTo("SINPE");
    }
}
