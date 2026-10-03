package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.service.TilopayService;
import com.hotclick.service.payment.TilopayCobroVerificador.Decision;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TilopayCobroVerificadorTest {

    @Test
    void montoConDecimalesIgualAlPedido_acepta() {
        Pago pago = pago(10000, "ORD-1");
        var consulta = new TilopayService.ConsultaResultado(
                true, "1", "ok", "AUTH", new BigDecimal("10000.00"), "crc", "ORD-1", false);

        assertEquals(Decision.ACEPTAR, TilopayCobroVerificador.decidir(pago, consulta, false));
    }

    @Test
    void montoDistinto_rechaza() {
        Pago pago = pago(10000, "ORD-1");
        var consulta = new TilopayService.ConsultaResultado(
                true, "1", "ok", "AUTH", BigDecimal.ONE, "CRC", "ORD-1", false);

        assertEquals(Decision.RECHAZAR_MONTO, TilopayCobroVerificador.decidir(pago, consulta, false));
    }

    @Test
    void monedaDistinta_rechaza() {
        Pago pago = pago(10000, "ORD-1");
        var consulta = new TilopayService.ConsultaResultado(
                true, "1", "ok", "AUTH", BigDecimal.valueOf(10000), "USD", "ORD-1", false);

        assertEquals(Decision.RECHAZAR_MONTO, TilopayCobroVerificador.decidir(pago, consulta, false));
    }

    @Test
    void simulacionSoloEnMock() {
        Pago pago = pago(10000, "ORD-1");
        var consulta = TilopayService.ConsultaResultado.simulada(true, "ORD-1");

        assertEquals(Decision.RECHAZAR_SIMULACION, TilopayCobroVerificador.decidir(pago, consulta, false));
        assertEquals(Decision.ACEPTAR, TilopayCobroVerificador.decidir(pago, consulta, true));
    }

    private static Pago pago(int monto, String order) {
        Pago pago = new Pago();
        pago.setMonto(monto);
        pago.setMoneda("CRC");
        pago.setMerchantToken(order);
        return pago;
    }
}
