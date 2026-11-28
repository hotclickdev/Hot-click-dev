package com.hotclick.service.payment;

public record OrderPricingResult(
    int costoEnvio,
    int descuento,
    int total,
    int impuesto
) {}
