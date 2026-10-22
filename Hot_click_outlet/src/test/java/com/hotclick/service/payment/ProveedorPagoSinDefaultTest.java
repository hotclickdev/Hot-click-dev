package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.payment.PaymentProvider;
import com.hotclick.payment.PaymentProviderFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Checkout | sin proveedor por defecto, allowlist Tilopay sin SINPE (ONVO con flag)")
class ProveedorPagoSinDefaultTest {

    private static PaymentProvider prov(String n) {
        PaymentProvider p = mock(PaymentProvider.class);
        when(p.getNombre()).thenReturn(n);
        return p;
    }

    private final PaymentProviderFactory factory = new PaymentProviderFactory(
        List.of(prov("STRIPE"), prov("TILOPAY"), prov("SINPE"), prov("ONVO")));

    private static PaymentCheckoutRequest req(String provider) {
        PaymentCheckoutRequest r = new PaymentCheckoutRequest();
        r.setProvider(provider);
        return r;
    }

    private CheckoutValidator validator(boolean onvo) {
        CheckoutValidator v = new CheckoutValidator();
        ReflectionTestUtils.setField(v, "onvoEnabled", onvo);
        return v;
    }

    @Test
    void factorySinNombreNoCaeAStripe() {
        assertThatThrownBy(() -> factory.get(null)).hasMessage("Elegí un método de pago");
        assertThatThrownBy(() -> factory.get("  ")).hasMessage("Elegí un método de pago");
    }

    @Test
    void validatorRechazaFaltanteYStripe() {
        assertThatThrownBy(() -> validator(false).resolveProvider(req(null), factory)).hasMessage("Elegí un método de pago");
        assertThatThrownBy(() -> validator(false).resolveProvider(req(""), factory)).hasMessage("Elegí un método de pago");
        assertThatThrownBy(() -> validator(false).resolveProvider(req("stripe"), factory)).hasMessageContaining("no soportado");
    }

    @Test
    void allowlistTilopayYOnvoSoloConFlag_sinSinpe() {
        assertThat(validator(false).resolveProvider(req("tilopay"), factory)).isEqualTo("TILOPAY");
        assertThatThrownBy(() -> validator(false).resolveProvider(req("SINPE"), factory)).hasMessageContaining("no soportado");
        assertThatThrownBy(() -> validator(false).resolveProvider(req("ONVO"), factory)).hasMessageContaining("ONVO no está habilitado");
        assertThat(validator(true).resolveProvider(req("ONVO"), factory)).isEqualTo("ONVO");
    }
}
