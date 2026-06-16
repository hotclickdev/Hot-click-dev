package com.hotclick.dto.marketplace;

import com.hotclick.repository.CatalogoMaestroRepository.CatalogoCardProjection;

public class CatalogoCardDTO {

    public Long    catalogoId;
    public String  nombre;
    public String  descripcionCorta;
    public String  imagenPrincipalUrl;
    public String  skuFabricante;
    public String  codigoBarras;
    public Long    categoriaId;
    public Long    marcaId;
    public Integer precioDesde;
    public Long    totalVendedores;

    public Long    buyBoxProductoId;
    public Long    buyBoxEmpresaId;
    public String  buyBoxTienda;
    public String  buyBoxTiendaComercial;
    public String  buyBoxLogo;
    public String  buyBoxSlug;
    public Integer buyBoxPrecio;
    public Integer buyBoxStock;
    public String  buyBoxProvincia;
    public String  buyBoxCanton;
    public Integer scoreGeo;
    public String  etiquetaGeo;

    public static CatalogoCardDTO from(CatalogoCardProjection p) {
        CatalogoCardDTO dto      = new CatalogoCardDTO();
        dto.catalogoId           = p.getIdCatalogoMaestro();
        dto.nombre               = p.getNombre();
        dto.descripcionCorta     = p.getDescripcionCorta();
        dto.imagenPrincipalUrl   = p.getImagenPrincipalUrl();
        dto.skuFabricante        = p.getSkuFabricante();
        dto.codigoBarras         = p.getCodigoBarras();
        dto.categoriaId          = p.getFkIdCategoria();
        dto.marcaId              = p.getFkIdMarca();
        dto.precioDesde          = p.getPrecioDesde();
        dto.totalVendedores      = p.getTotalVendedores();
        dto.buyBoxProductoId     = p.getBuyBoxProductoId();
        dto.buyBoxEmpresaId      = p.getBuyBoxEmpresaId();
        dto.buyBoxTienda         = p.getBuyBoxTienda();
        dto.buyBoxTiendaComercial = p.getBuyBoxTiendaComercial();
        dto.buyBoxLogo           = p.getBuyBoxLogo();
        dto.buyBoxSlug           = p.getBuyBoxSlug();
        dto.buyBoxPrecio         = p.getBuyBoxPrecio();
        dto.buyBoxStock          = p.getBuyBoxStock();
        dto.buyBoxProvincia      = p.getBuyBoxProvincia();
        dto.buyBoxCanton         = p.getBuyBoxCanton();
        dto.scoreGeo             = p.getScoreGeo();
        dto.etiquetaGeo          = resolverEtiqueta(p.getScoreGeo());
        return dto;
    }

    private static String resolverEtiqueta(Integer score) {
        if (score == null) return "Nacional";
        return switch (score) {
            case 2  -> "En tu cantón";
            case 1  -> "En tu provincia";
            default -> "Nacional";
        };
    }
}
