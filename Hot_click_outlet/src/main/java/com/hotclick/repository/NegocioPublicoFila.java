package com.hotclick.repository;

/** Fila de {@link EmpresaRepository#findNegociosPublicos}: datos de vitrina, nunca de contacto. */
public interface NegocioPublicoFila {
    String getSlug();
    String getNombre();
    String getLogoUrl();
    String getCategoria();
    String getPlan();
    Long getProductos();
}
