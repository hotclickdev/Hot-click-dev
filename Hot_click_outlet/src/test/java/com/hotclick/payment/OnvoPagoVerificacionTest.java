package com.hotclick.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("WH-1: la sesión leída de ONVO debe coincidir con el pago local")
class OnvoPagoVerificacionTest {

    private static Pago pago(int monto, long empresaId) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        Pedido p = new Pedido();
        p.setEmpresa(e);
        p.setTotalPedido(monto);
        Pago pago = new Pago();
        pago.setPedido(p);
        pago.setMonto(monto);
        return pago;
    }

    @Test
    void coincide_todo() {
        assertThat(OnvoPaymentProvider.coincide(pago(15000, 7L),
            Map.of("amount", 15000, "currency", "CRC", "metadata", Map.of("empresaId", "7")))).isTrue();
    }

    @Test
    void monto_distinto_moneda_distinta_o_empresa_distinta() {
        assertThat(OnvoPaymentProvider.coincide(pago(15000, 7L),
            Map.of("amount", 14999, "currency", "CRC", "metadata", Map.of("empresaId", "7")))).isFalse();
        assertThat(OnvoPaymentProvider.coincide(pago(15000, 7L),
            Map.of("amount", 15000, "currency", "USD", "metadata", Map.of("empresaId", "7")))).isFalse();
        assertThat(OnvoPaymentProvider.coincide(pago(15000, 7L),
            Map.of("amount", 15000, "currency", "CRC", "metadata", Map.of("empresaId", "8")))).isFalse();
        assertThat(OnvoPaymentProvider.coincide(pago(15000, 7L),
            Map.of("amount", 15000, "currency", "CRC"))).isFalse();
    }
}
