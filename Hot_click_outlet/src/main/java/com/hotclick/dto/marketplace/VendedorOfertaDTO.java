package com.hotclick.dto.marketplace;

import com.hotclick.repository.CatalogoMaestroRepository.VendedorOfertaProjection;

public class VendedorOfertaDTO {

    public Long    productoId;
    public Long    empresaId;
    public String  nombreTienda;
    public String  nombreComercial;
    public String  logoUrl;
    public String  empresaSlug;
    public Integer precioEfectivo;
    public Integer precioVenta;
    public Integer precioOferta;
    public Boolean enOferta;
    public Integer stockDisponible;
    public String  condicion;
    public Integer garantiaDias;
    public String  provincia;
    public String  canton;
    public Integer scoreGeo;
    public String  etiquetaGeo;    // "En tu cantón" / "En tu provincia" / "Nacional"

    public static VendedorOfertaDTO from(VendedorOfertaProjection p) {
        VendedorOfertaDTO dto = new VendedorOfertaDTO();
        dto.productoId       = p.getIdProducto();
        dto.empresaId        = p.getIdEmpresa();
        dto.nombreTienda     = p.getNombreEmpresa();
        dto.nombreComercial  = p.getNombreComercial();
        dto.logoUrl          = p.getLogoUrl();
        dto.empresaSlug      = p.getEmpresaSlug();
        dto.precioEfectivo   = p.getPrecioEfectivo();
        dto.precioVenta      = p.getPrecioVenta();
        dto.precioOferta     = p.getPrecioOferta();
        dto.enOferta         = p.getEnOferta();
        dto.stockDisponible  = p.getStockDisponible();
        dto.condicion        = p.getCondicion();
        dto.garantiaDias     = p.getGarantiaDias();
        dto.provincia        = p.getProvincia();
        dto.canton           = p.getCanton();
        dto.scoreGeo         = p.getScoreGeo();
        dto.etiquetaGeo      = resolverEtiqueta(p.getScoreGeo());
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
