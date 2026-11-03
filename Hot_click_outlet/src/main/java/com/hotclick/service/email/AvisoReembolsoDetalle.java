package com.hotclick.service.email;

/**
 * Datos operativos del aviso individual (lo que antes llevaba la alerta de sobreventa): números de pedido,
 * monto y proveedor. Sin PII del cliente.
 */
public record AvisoReembolsoDetalle(String pedidos, Integer monto, String proveedor) { }
