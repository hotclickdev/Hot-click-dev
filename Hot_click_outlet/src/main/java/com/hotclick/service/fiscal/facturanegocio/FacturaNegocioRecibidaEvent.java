package com.hotclick.service.fiscal.facturanegocio;

/** Se publica cuando una factura de un negocio queda ACEPTADA (la Fase 3 cancela sus enlaces de cobro abiertos). */
public record FacturaNegocioRecibidaEvent(Long empresaId) {}
