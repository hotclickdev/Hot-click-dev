package com.hotclick.service.negocio;

import com.hotclick.repository.NegocioDestacadoFila;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class NegociosDestacadosServiceTest {

    private static NegocioDestacadoFila fila(String slug, String plan, long productos, long conFoto, String logo,
                                             boolean destacado, Integer orden, LocalDateTime desde) {
        return new NegocioDestacadoFila() {
            public Long getId() { return 1L; }
            public String getSlug() { return slug; }
            public String getNombre() { return slug; }
            public String getLogoUrl() { return logo; }
            public String getCategoria() { return ""; }
            public String getPlan() { return plan; }
            public Long getProductos() { return productos; }
            public Long getConFoto() { return conFoto; }
            public Boolean getDestacado() { return destacado; }
            public Integer getDestacadoOrden() { return orden; }
            public LocalDateTime getDestacadoDesde() { return desde; }
        };
    }

    @Test
    void d1PlanesPagosPrimeroLuegoProductosYExigeFoto() {
        var dia = LocalDate.of(2026, 10, 16);
        var r = NegociosDestacadosService.ordenar(List.of(
            fila("emp-grande", "GRATUITO", 50, 1, null, false, null, null),
            fila("pyme-chica", "PYME", 2, 0, "/logo.png", false, null, null),
            fila("plus-grande", "NEGOCIO_PLUS", 9, 3, null, false, null, null),
            fila("sin-foto", "PYME", 99, 0, "", false, null, null)), dia);
        assertEquals(List.of("plus-grande", "pyme-chica", "emp-grande"), r.stream().map(NegocioDestacadoFila::getSlug).toList());
    }

    @Test
    void d1DesempateEstableEnElMismoDia() {
        var dia = LocalDate.of(2026, 10, 16);
        var lista = List.of(fila("a", "PYME", 3, 1, null, false, null, null), fila("b", "PYME", 3, 1, null, false, null, null));
        assertEquals(NegociosDestacadosService.ordenar(lista, dia), NegociosDestacadosService.ordenar(lista.reversed(), dia));
    }

    @Test
    void curadosGananPorOrdenYFecha() {
        var t = LocalDateTime.of(2026, 10, 1, 0, 0);
        var r = NegociosDestacadosService.ordenar(List.of(
            fila("plus", "NEGOCIO_PLUS", 99, 9, "/l.png", false, null, null),
            fila("sin-orden", "PYME", 1, 1, null, true, null, t),
            fila("dos", "PYME", 1, 1, null, true, 2, t),
            fila("uno-nuevo", "PYME", 1, 1, null, true, 1, t.plusDays(2)),
            fila("uno-viejo", "PYME", 1, 1, null, true, 1, t)), LocalDate.now());
        assertEquals(List.of("uno-viejo", "uno-nuevo", "dos", "sin-orden"), r.stream().map(NegocioDestacadoFila::getSlug).toList());
    }
}
