package com.hotclick.repository;

import java.time.LocalDateTime;

/** Fila de {@link EmpresaRepository#findCandidatosDestacados}: datos de vitrina del carrusel, nunca de contacto. */
public interface NegocioDestacadoFila {
    Long getId();
    String getSlug();
    String getNombre();
    String getLogoUrl();
    String getCategoria();
    String getPlan();
    Long getProductos();
    Long getConFoto();
    Boolean getDestacado();
    Integer getDestacadoOrden();
    LocalDateTime getDestacadoDesde();
}
