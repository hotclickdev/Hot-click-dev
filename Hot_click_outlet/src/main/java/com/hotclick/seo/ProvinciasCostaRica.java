package com.hotclick.seo;

import java.util.List;
import java.util.Optional;

/** Las 7 provincias. Un texto de bodega solo cuenta si normaliza a una de estas. */
public final class ProvinciasCostaRica {

    public record Provincia(String slug, String nombre) {}

    private static final List<Provincia> TODAS = List.of(
        new Provincia("san-jose", "San José"),
        new Provincia("alajuela", "Alajuela"),
        new Provincia("cartago", "Cartago"),
        new Provincia("heredia", "Heredia"),
        new Provincia("guanacaste", "Guanacaste"),
        new Provincia("puntarenas", "Puntarenas"),
        new Provincia("limon", "Limón")
    );

    private ProvinciasCostaRica() {}

    public static List<Provincia> todas() {
        return TODAS;
    }

    public static Optional<Provincia> porSlug(String slug) {
        if (!SeoSlugs.esSeguro(slug)) return Optional.empty();
        return TODAS.stream().filter(p -> p.slug().equals(slug)).findFirst();
    }

    public static Optional<Provincia> desdeTexto(String provinciaBodega) {
        String slug = SeoSlugs.desde(provinciaBodega);
        return porSlug(slug);
    }
}
