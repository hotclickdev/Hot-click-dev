package com.hotclick.service.payment;

/** La compra marketplace quedó pagada. El tiquete se emite después del commit. */
public record CompraPagadaEvent(Long compraId) {}
