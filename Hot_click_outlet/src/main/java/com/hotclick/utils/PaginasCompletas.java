package com.hotclick.utils;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * Recorre una consulta paginada hasta la última página ({@code hasNext() == false}) y devuelve TODOS los elementos en
 * el orden del {@link Pageable} (que debe ser estable). Cada página es una consulta acotada a su tamaño; no hay
 * consultas por elemento. No hay tope de páginas: nunca devuelve una lista parcial; si una página falla, la excepción
 * sube. Acota cada consulta, no la memoria: la lista completa queda en memoria. Para que las páginas sean coherentes
 * entre sí, el llamador debe correrlas en una sola transacción con snapshot (ver PlanesActivosLector).
 */
public final class PaginasCompletas {

    private PaginasCompletas() {}

    public static <T> List<T> todas(Function<Pageable, Slice<T>> consulta, Pageable primera) {
        if (primera == null || primera.isUnpaged()) throw new IllegalArgumentException("Se requiere una página acotada");
        List<T> out = new ArrayList<>();
        Pageable actual = primera;
        while (true) {
            Slice<T> pagina = consulta.apply(actual);
            out.addAll(pagina.getContent());
            if (!pagina.hasNext()) return out;
            actual = pagina.nextPageable();
        }
    }
}
