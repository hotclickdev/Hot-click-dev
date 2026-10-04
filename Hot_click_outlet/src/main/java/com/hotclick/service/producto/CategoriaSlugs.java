package com.hotclick.service.producto;

import com.hotclick.model.Categoria;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.seo.SeoSlugs;

import java.util.HashSet;
import java.util.Set;

/** Asigna un slug único y no lo cambia si ya existe: la URL indexada se queda. */
public final class CategoriaSlugs {

    private static final int TOPE_SUFIJO = 40;

    private CategoriaSlugs() {}

    public static void asegurar(Categoria cat, CategoriaRepository repo) {
        asegurar(cat, repo, new HashSet<>());
    }

    public static void asegurar(Categoria cat, CategoriaRepository repo, Set<String> reservados) {
        if (cat.getSlug() != null && !cat.getSlug().isBlank()) return;
        cat.setSlug(unico(cat.getNombreCategoria(), cat.getId(), repo, reservados));
        reservados.add(cat.getSlug());
    }

    private static String unico(String nombre, Long idActual, CategoriaRepository repo, Set<String> reservados) {
        String base = SeoSlugs.desde(nombre);
        if (base.isEmpty()) base = "categoria";
        String candidato = base;
        int n = 2;
        while (ocupado(candidato, idActual, repo, reservados)) {
            candidato = recortar(base) + "-" + n;
            n++;
            if (n > TOPE_SUFIJO) return recortar(base) + "-" + (idActual != null ? idActual : n);
        }
        return candidato;
    }

    private static boolean ocupado(String slug, Long idActual, CategoriaRepository repo, Set<String> reservados) {
        if (reservados.contains(slug)) return true;
        return repo.findBySlug(slug)
            .filter(otra -> idActual == null || !idActual.equals(otra.getId()))
            .isPresent();
    }

    private static String recortar(String base) {
        return base.length() > 90 ? base.substring(0, 90).replaceAll("-$", "") : base;
    }
}
