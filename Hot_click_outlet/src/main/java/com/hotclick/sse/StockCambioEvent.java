package com.hotclick.sse;

import org.springframework.context.ApplicationEvent;

/**
 * Evento de dominio disparado cuando stock_actual cambia con éxito.
 * Lleva primitivos — no referencias a entidades — para evitar
 * LazyInitializationException fuera de la sesión Hibernate.
 */
public class StockCambioEvent extends ApplicationEvent {

    private final Long    productoId;
    private final Long    empresaId;   // clave de tenant para aislamiento multi-tenant
    private final Integer stockActual; // valor post-commit

    public StockCambioEvent(Object source, Long productoId, Long empresaId, Integer stockActual) {
        super(source);
        this.productoId  = productoId;
        this.empresaId   = empresaId;
        this.stockActual = stockActual;
    }

    public Long    getProductoId()  { return productoId; }
    public Long    getEmpresaId()   { return empresaId; }
    public Integer getStockActual() { return stockActual; }
}
