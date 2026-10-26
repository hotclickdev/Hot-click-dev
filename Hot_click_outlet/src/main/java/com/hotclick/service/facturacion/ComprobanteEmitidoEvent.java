package com.hotclick.service.facturacion;

/** Se publica al crear un comprobante PENDIENTE; el envío arranca después del commit. */
public record ComprobanteEmitidoEvent(Long comprobanteId) {}
