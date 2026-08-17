package com.hotclick.service.payment;

public record OrderPricingResult(
    int costoEnvio,
    int descuento,
    String codigoCuponAplicado,
    int gcMonto,
    String gcCodigo,
    int total,
    int totalConGC,
    boolean pagoGC
) {}
