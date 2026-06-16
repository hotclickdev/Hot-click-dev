package com.hotclick.dto.marketplace;

import com.hotclick.model.CatalogoMaestro;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

public class ProductoMarketplaceDTO {

    public Long         catalogoId;
    public String       nombre;
    public String       descripcionCorta;
    public String       descripcionLarga;
    public String       imagenPrincipalUrl;
    public List<String> imagenesExtra;
    public String       skuFabricante;
    public String       codigoBarras;
    public Long         categoriaId;
    public Long         marcaId;
    public String       modelo;
    public String       tags;

    public VendedorOfertaDTO       vendedorPrincipal;   // Buy Box winner
    public List<VendedorOfertaDTO> alternativas;        // otros vendedores

    public static ProductoMarketplaceDTO fromCatalogo(CatalogoMaestro cm) {
        ProductoMarketplaceDTO dto = new ProductoMarketplaceDTO();
        dto.catalogoId          = cm.getId();
        dto.nombre              = cm.getNombre();
        dto.descripcionCorta    = cm.getDescripcionCorta();
        dto.descripcionLarga    = cm.getDescripcionLarga();
        dto.imagenPrincipalUrl  = cm.getImagenPrincipalUrl();
        dto.imagenesExtra       = parseImagenes(cm.getImagenesExtra());
        dto.skuFabricante       = cm.getSkuFabricante();
        dto.codigoBarras        = cm.getCodigoBarras();
        dto.categoriaId         = cm.getCategoriaId();
        dto.marcaId             = cm.getMarcaId();
        dto.modelo              = cm.getModelo();
        dto.tags                = cm.getTags();
        return dto;
    }

    private static List<String> parseImagenes(String raw) {
        if (raw == null || raw.isBlank()) return Collections.emptyList();
        return Arrays.stream(raw.split(","))
                     .map(String::trim)
                     .filter(s -> !s.isEmpty())
                     .toList();
    }
}
