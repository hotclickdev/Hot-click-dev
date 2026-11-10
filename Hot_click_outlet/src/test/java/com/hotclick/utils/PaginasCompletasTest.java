package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("PaginasCompletas: recorre todas las páginas, nunca devuelve una lista parcial")
class PaginasCompletasTest {

    private static Slice<Integer> pagina(List<Integer> todos, Pageable p) {
        int desde = (int) Math.min(p.getOffset(), todos.size());
        int hasta = Math.min(desde + p.getPageSize(), todos.size());
        return new SliceImpl<>(todos.subList(desde, hasta), p, hasta < todos.size());
    }

    @Test
    @DisplayName("Junta todas las páginas en orden (exacta, con resto y vacía)")
    void juntaTodas() {
        for (int n : new int[]{0, 1, 5, 6, 7, 23}) {
            List<Integer> todos = IntStream.range(0, n).boxed().toList();
            List<Pageable> pedidas = new ArrayList<>();
            List<Integer> out = PaginasCompletas.todas(p -> { pedidas.add(p); return pagina(todos, p); },
                PageRequest.of(0, 5));
            assertThat(out).as("n=%s", n).containsExactlyElementsOf(todos);
            assertThat(pedidas).allSatisfy(p -> assertThat(p.getPageSize()).isEqualTo(5));
        }
    }

    @Test
    @DisplayName("Sin tope: 1.203 elementos en 241 páginas, todos; si una página falla, lanza y no devuelve nada parcial")
    void sinTopeYErrorSinParcial() {
        List<Integer> todos = IntStream.range(0, 1203).boxed().toList();
        assertThat(PaginasCompletas.todas(p -> pagina(todos, p), PageRequest.of(0, 5))).containsExactlyElementsOf(todos);
        assertThatThrownBy(() -> PaginasCompletas.todas(p -> {
            if (p.getPageNumber() == 7) throw new IllegalStateException("caída");
            return pagina(todos, p);
        }, PageRequest.of(0, 5))).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Rechaza una consulta sin paginar")
    void argumentos() {
        assertThatThrownBy(() -> PaginasCompletas.todas(p -> pagina(List.of(), p), Pageable.unpaged()))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PaginasCompletas.todas(p -> pagina(List.of(), p), null))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
