package com.hotclick.service.suscripcion;

import com.hotclick.service.onvo.OnvoBillingClient;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

/**
 * MEDIO-1: los tests previos arman la factura vía latestInvoiceId. Este stub hace que la factura "del período actual"
 * del mock sea esa misma (sin latestInvoiceId → mapa vacío), para que sigan probando la verificación y no el listado.
 */
final class OnvoFacturaPeriodoStub {
    private OnvoFacturaPeriodoStub() {}

    static void comoLatestInvoice(OnvoBillingClient onvo) {
        lenient().when(onvo.obtenerFacturaDelPeriodoActual(any())).thenAnswer(inv -> {
            Map<?, ?> sub = inv.getArgument(0);
            Object id = sub == null ? null : sub.get("latestInvoiceId");
            if (id == null || !OnvoBillingClient.idValido(String.valueOf(id))) return Map.of();
            Map<?, ?> f = onvo.obtenerRenovacion(String.valueOf(id));
            return f == null ? Map.of() : f;
        });
    }
}
