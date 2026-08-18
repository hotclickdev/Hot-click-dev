package com.hotclick.service.catalogo;

/**
 * Home y /productos usan el slug de la plataforma: el chat debe ver el catálogo
 * marketplace (todas las empresas aprobadas), no solo los productos de HOTCLICK.
 * /tienda/{slug} de un emprendedor sigue filtrado por esa empresa.
 */
public final class MarketplaceCatalogo {

    public static final String SLUG = "hotclick";

    private MarketplaceCatalogo() {}

    public static boolean esMarketplace(String slug) {
        return slug == null || slug.isBlank() || SLUG.equalsIgnoreCase(slug.trim());
    }
}
