package com.hotclick.dto.seo;

import java.util.List;

public final class SeoPublicoDtos {

    private SeoPublicoDtos() {}

    public record TiendaSeo(String slug, String nombre, String tagline, String logoUrl, String provincia) {}

    public record ProductoSeo(long id, String nombre, int precio, String imagenUrl) {}

    public record SectorResumen(String slug, String nombre, long cantidad) {}

    public record SectorDetalle(String slug, String nombre, String descripcion, long cantidad, List<ProductoSeo> productos) {}

    public record ProvinciaSeo(String slug, String nombre, List<TiendaSeo> tiendas) {}
}
