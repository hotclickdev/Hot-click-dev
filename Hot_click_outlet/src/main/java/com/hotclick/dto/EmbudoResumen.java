package com.hotclick.dto;

/** Conteos del embudo. Los pedidos pagados salen de ventas, no del navegador. */
public record EmbudoResumen(
    int dias,
    long visita,
    long producto,
    long carrito,
    long checkout,
    long pagoIntento,
    long pedidosPagados,
    long busquedaVacia,
    long errorDatos,
    long errorEntrega,
    long sinComprobante,
    long pagoFallido,
    long pagoCancelado,
    long carritosPendientes,
    long carritosEmailEnviado
) {}
