package com.hotclick.utils;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Recorre una consulta paginada hasta la última página y devuelve TODOS los elementos, en el orden del
 * {@link Pageable} (que debe ser estable). Cada página es una sola consulta acotada a su tamaño; no hay consultas por
 * elemento. Nunca trunca en silencio: si se pasa de {@code maxPaginas}, lanza en vez de devolver una lista parcial.
 */
public final class PaginasCompletas {

    private PaginasCompletas() {}

    public static <T> List<T> todas(Function<Pageable, Slice<T>> consulta, Pageable primera, int maxPaginas) {
        if (primera == null || primera.isUnpaged()) throw new IllegalArgumentException("Se requiere una página acotada");
        if (maxPaginas < 1) throw new IllegalArgumentException("maxPaginas debe ser >= 1");
        List<T> out = new ArrayList<>();
        Pageable actual = primera;
        for (int leidas = 1; ; leidas++) {
            Slice<T> pagina = consulta.apply(actual);
            out.addAll(pagina.getContent());
            if (!pagina.hasNext()) return out;
            if (leidas >= maxPaginas) {
                throw new IllegalStateException("Listado de más de " + maxPaginas + " páginas de "
                    + primera.getPageSize() + ": no se devuelve una lista parcial");
            }
            actual = pagina.nextPageable();
        }
    }
}
