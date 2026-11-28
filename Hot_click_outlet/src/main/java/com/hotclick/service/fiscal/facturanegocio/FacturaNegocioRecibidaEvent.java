package com.hotclick.service.fiscal.facturanegocio;

/**
 * Se publica cuando el ADMIN aprueba la factura de un negocio (ACEPTADA). La Fase 3 cancela solo los enlaces de cobro
 * abiertos atados a esa factura.
 */
public record FacturaNegocioRecibidaEvent(Long empresaId, Long facturaId) {}
