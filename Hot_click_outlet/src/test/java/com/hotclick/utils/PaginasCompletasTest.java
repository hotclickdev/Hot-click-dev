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
                PageRequest.of(0, 5), 10);
            assertThat(out).as("n=%s", n).containsExactlyElementsOf(todos);
            assertThat(pedidas).allSatisfy(p -> assertThat(p.getPageSize()).isEqualTo(5));
        }
    }

    @Test
    @DisplayName("Pasado el tope de páginas lanza; no trunca en silencio")
    void topeLanza() {
        List<Integer> todos = IntStream.range(0, 11).boxed().toList();
        assertThatThrownBy(() -> PaginasCompletas.todas(p -> pagina(todos, p), PageRequest.of(0, 5), 2))
            .isInstanceOf(IllegalStateException.class);
        assertThat(PaginasCompletas.todas(p -> pagina(todos, p), PageRequest.of(0, 5), 3)).hasSize(11);
    }

    @Test
    @DisplayName("Rechaza una consulta sin paginar o un tope inválido")
    void argumentos() {
        assertThatThrownBy(() -> PaginasCompletas.todas(p -> pagina(List.of(), p), Pageable.unpaged(), 3))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> PaginasCompletas.todas(p -> pagina(List.of(), p), PageRequest.of(0, 5), 0))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
