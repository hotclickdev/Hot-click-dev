package com.hotclick.service.payment;

public record OrderPricingResult(
    int costoEnvio,
    int descuento,
    String codigoCuponAplicado,
    int total,
    int impuesto
) {}
