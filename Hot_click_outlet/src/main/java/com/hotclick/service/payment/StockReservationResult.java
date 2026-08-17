package com.hotclick.service.payment;

import com.hotclick.model.Producto;

import java.util.Map;

public record StockReservationResult(
    int subtotal,
    int costoTotal,
    Map<Long, Producto> productosMap
) {}
