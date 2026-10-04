package com.hotclick.seo;

/** Umbrales para no indexar páginas finas. */
public final class SeoIndexacion {

    /** Una landing de sector entra al sitemap solo con este mínimo de productos públicos. */
    public static final int MINIMO_PRODUCTOS_SECTOR = 3;

    /** Tope de fichas en la landing; el resto se ve en el catálogo. */
    public static final int MAX_PRODUCTOS_LANDING = 24;

    private SeoIndexacion() {}
}
