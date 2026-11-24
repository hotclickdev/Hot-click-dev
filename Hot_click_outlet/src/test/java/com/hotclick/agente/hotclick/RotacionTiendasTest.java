package com.hotclick.agente.hotclick;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.motor.BuscarProductosHerramienta;
import com.hotclick.agente.motor.ContextoHerramienta;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoHerramienta;
import com.hotclick.rag.dto.ProductoContexto;
import com.hotclick.rag.service.VectorSearchService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("AG-25: rotación justa entre tiendas en el marketplace")
class RotacionTiendasTest {

    private static final ObjectMapper OM = new ObjectMapper();

    private static ProductoContexto prod(long id, String tienda) {
        return new ProductoContexto(id, "Producto " + id, "S" + id, 1000, "d", null, 3, null, "Cat", null, null,
            false, null, null, null, null, null, null, "Negocio " + tienda, tienda);
    }

    /** Tienda "a" con 8 productos muy relevantes y otras tres con 2 cada una, en orden de relevancia. */
    private static List<ProductoContexto> escenario() {
        List<ProductoContexto> l = new ArrayList<>();
        long id = 1;
        for (int i = 0; i < 8; i++) l.add(prod(id++, "a"));
        for (String t : List.of("b", "c", "d")) {
            l.add(prod(id++, t));
            l.add(prod(id++, t));
        }
        return l;
    }

    private static Set<String> tiendas(List<ProductoContexto> l) {
        Set<String> s = new HashSet<>();
        l.forEach(p -> s.add(p.empresaSlug()));
        return s;
    }

    @Test
    @DisplayName("Ninguna tienda ocupa todos los resultados cuando hay varias")
    void ningunaAcapara() {
        for (long semilla = 0; semilla < 30; semilla++) {
            List<ProductoContexto> r = RotacionTiendas.rotar(escenario(), 5, semilla);
            assertThat(r).hasSize(5);
            assertThat(tiendas(r)).hasSizeGreaterThan(1);
            assertThat(r.stream().filter(p -> "a".equals(p.empresaSlug())).count()).isLessThanOrEqualTo(2);
        }
    }

    @Test
    @DisplayName("El resultado más relevante se mantiene primero")
    void mejorPrimero() {
        List<ProductoContexto> r = RotacionTiendas.rotar(escenario(), 5, 7);
        assertThat(r.get(0).id()).isEqualTo(1L);
    }

    @Test
    @DisplayName("La semilla diaria cambia el orden entre tiendas; la misma semilla es estable")
    void semillaRota() {
        List<ProductoContexto> base = RotacionTiendas.rotar(escenario(), 4, 1);
        assertThat(RotacionTiendas.rotar(escenario(), 4, 1)).isEqualTo(base);
        Set<List<Long>> ordenes = new HashSet<>();
        for (long s = 0; s < 20; s++) {
            ordenes.add(RotacionTiendas.rotar(escenario(), 4, s).stream().map(ProductoContexto::id).toList());
        }
        assertThat(ordenes.size()).isGreaterThan(1);
    }

    @Test
    @DisplayName("Con una sola tienda devuelve sus productos (nunca oculta); límite y vacío")
    void unaTiendaYBordes() {
        List<ProductoContexto> solo = List.of(prod(1, "a"), prod(2, "a"), prod(3, "a"));
        assertThat(RotacionTiendas.rotar(solo, 2, 3)).extracting(ProductoContexto::id).containsExactly(1L, 2L);
        assertThat(RotacionTiendas.rotar(List.of(), 5, 1)).isEmpty();
        assertThat(RotacionTiendas.rotar(solo, 0, 1)).isEmpty();
        assertThat(RotacionTiendas.rotar(solo, 10, 1)).hasSize(3);
    }

    @Test
    @DisplayName("Productos sin datos de tienda no se agrupan ni se descartan")
    void sinTienda() {
        ProductoContexto sinDatos = new ProductoContexto(9L, "X", "S", 1, "d", null, 1, null, "C", null, null);
        ProductoContexto sinDatos2 = new ProductoContexto(10L, "Y", "S", 1, "d", null, 1, null, "C", null, null);
        assertThat(RotacionTiendas.rotar(List.of(sinDatos, sinDatos2), 5, 1)).hasSize(2);
    }

    @Test
    @DisplayName("buscar_productos HOTCLICK: reparte entre tiendas y cada producto trae su tienda; una oculta nunca llega")
    void herramientaMarketplace() throws Exception {
        VectorSearchService vs = mock(VectorSearchService.class);
        // La búsqueda ya aplica la regla de visibilidad: la tienda oculta "x" no está en lo que devuelve.
        when(vs.buscarSimilares(any(), anyString(), anyInt(), anyBoolean())).thenReturn(escenario());
        BuscarProductosHerramienta h = new BuscarProductosHerramienta(vs, OM);

        ResultadoHerramienta r = h.ejecutar(new ContextoHerramienta(null, "WA-1", PerfilAgente.HOTCLICK),
            OM.readTree("{\"consulta\":\"bolso\"}"));

        JsonNode productos = OM.readTree(r.contenido()).path("productos");
        assertThat(productos).hasSize(5);
        Set<String> slugs = new HashSet<>();
        for (JsonNode p : productos) {
            assertThat(p.path("negocio").asText()).startsWith("Negocio ");   // Ley 7472: indica quién vende
            slugs.add(p.path("tienda").asText());
        }
        assertThat(slugs).hasSizeGreaterThan(1).doesNotContain("x");
    }
}
