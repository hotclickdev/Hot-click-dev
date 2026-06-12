package com.hotclick.rag.event;

import org.springframework.context.ApplicationEvent;

/**
 * Fired after a Producto is persisted (create or update).
 *
 * All text fields needed to build the embedding are carried in the event so the
 * async handler never needs a secondary DB round-trip against hot_click_producto_tb.
 * This also makes the handler safe under PgBouncer transaction-mode: the Gemini
 * call + upsert happen in their own short transaction, completely independent of
 * the product-save transaction that already committed.
 */
public class ProductoGuardadoEvent extends ApplicationEvent {

    private final Long   productoId;
    private final Long   empresaId;        // null for legacy single-tenant products
    private final String nombreProducto;
    private final String descripcionCorta;
    private final String marcaTexto;
    private final String sku;
    private final String tags;
    private final String especificaciones;

    public ProductoGuardadoEvent(
            Object source,
            Long   productoId,
            Long   empresaId,
            String nombreProducto,
            String descripcionCorta,
            String marcaTexto,
            String sku,
            String tags,
            String especificaciones) {
        super(source);
        this.productoId       = productoId;
        this.empresaId        = empresaId;
        this.nombreProducto   = nombreProducto;
        this.descripcionCorta = descripcionCorta;
        this.marcaTexto       = marcaTexto;
        this.sku              = sku;
        this.tags             = tags;
        this.especificaciones = especificaciones;
    }

    public Long   getProductoId()       { return productoId; }
    public Long   getEmpresaId()        { return empresaId; }
    public String getNombreProducto()   { return nombreProducto; }
    public String getDescripcionCorta() { return descripcionCorta; }
    public String getMarcaTexto()       { return marcaTexto; }
    public String getSku()              { return sku; }
    public String getTags()             { return tags; }
    public String getEspecificaciones() { return especificaciones; }
}
