package com.hotclick.service.email;

import java.time.LocalDateTime;

/** Fila del correo resumen de REEMBOLSO_PENDIENTE viejos (punto 4 de #477): solo id, monto, moneda y fecha. Sin PII. */
public record ReembolsoPendienteResumenItem(Long pagoId, Integer monto, String moneda, LocalDateTime fecha) {}
