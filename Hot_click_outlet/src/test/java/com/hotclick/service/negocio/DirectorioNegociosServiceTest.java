package com.hotclick.service.negocio;

import com.hotclick.dto.NegocioPublicoDTO;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.NegocioPublicoFila;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("[VISITANTE] Directorio y buscador público de negocios por plan")
class DirectorioNegociosServiceTest {

    private record Fila(String getSlug, String getNombre, String getLogoUrl, String getCategoria, String getPlan, Long getProductos)
        implements NegocioPublicoFila {}

    private DirectorioNegociosService servicio(Fila... filas) {
        EmpresaRepository repo = mock(EmpresaRepository.class);
        when(repo.findNegociosPublicos(any())).thenReturn(List.of(filas));
        return new DirectorioNegociosService(repo);
    }

    private static final Fila CAFE = new Fila("bruma-cafe", "Bruma Café", "", "Comidas", "GRATUITO", 8L);
    private static final Fila LUNA = new Fila("casa-luna-506", "Casa Luna 506", "https://x/logo.png", "Hogar", "PYME", 8L);
    private static final Fila CEIBA = new Fila("taller-ceiba", "Taller Ceiba", null, null, "NEGOCIO_PLUS", 3L);
    private static final Fila VACIA = new Fila("sin-productos", "Sin productos", "", "", "PYME", 0L);

    @Test
    @DisplayName("Sin filtros: todos los negocios con productos, por nombre")
    void sinFiltros() {
        List<NegocioPublicoDTO> r = servicio(LUNA, CEIBA, CAFE, VACIA).buscar(null, null, null);
        assertThat(r).extracting(NegocioPublicoDTO::slug).containsExactly("bruma-cafe", "casa-luna-506", "taller-ceiba");
    }

    @ParameterizedTest(name = "plan={0} → {1}")
    @CsvSource({
        "emprendimientos, bruma-cafe",
        "EMPRENDEDOR, bruma-cafe",
        "pymes, casa-luna-506",
        "negocio-plus, taller-ceiba",
        "NEGOCIO_PLUS, taller-ceiba",
    })
    void filtraPorPlan(String plan, String slug) {
        assertThat(servicio(LUNA, CEIBA, CAFE).buscar("", plan, null)).extracting(NegocioPublicoDTO::slug).containsExactly(slug);
    }

    @Test
    @DisplayName("Plan desconocido: lista vacía (no cae a 'todos')")
    void planDesconocido() {
        assertThat(servicio(LUNA, CEIBA, CAFE).buscar("", "oro", null)).isEmpty();
    }

    @ParameterizedTest(name = "\"{0}\" encuentra {1}")
    @CsvSource({
        "cafe, bruma-cafe",
        "CAFÉ, bruma-cafe",
        "bruma, bruma-cafe",
        "luna 506, casa-luna-506",
        "casa-luna, casa-luna-506",
        "ceiba, taller-ceiba",
    })
    void buscaPorNombreOSlugSinTildes(String q, String slug) {
        assertThat(servicio(LUNA, CEIBA, CAFE).buscar(q, null, null)).extracting(NegocioPublicoDTO::slug).containsExactly(slug);
    }

    @Test
    @DisplayName("Primero los que empiezan con lo buscado")
    void ordenPorRango() {
        Fila lunaNueva = new Fila("luna-nueva", "Luna Nueva", "", "", "PYME", 2L);
        assertThat(servicio(LUNA, lunaNueva).buscar("luna", null, null)).extracting(NegocioPublicoDTO::slug)
            .containsExactly("luna-nueva", "casa-luna-506");
    }

    @Test
    @DisplayName("Respeta el límite pedido y el tope")
    void limite() {
        assertThat(servicio(LUNA, CEIBA, CAFE).buscar("", null, 2)).hasSize(2);
        assertThat(servicio(LUNA, CEIBA, CAFE).buscar("", null, 10_000)).hasSize(3);
    }

    @Test
    @DisplayName("Plan público normalizado y nulos como vacío")
    void mapeo() {
        NegocioPublicoDTO n = servicio(CEIBA).buscar("", null, null).get(0);
        assertThat(n.plan()).isEqualTo("NEGOCIO_PLUS");
        assertThat(n.logoUrl()).isEmpty();
        assertThat(n.categoria()).isEmpty();
        assertThat(servicio(CAFE).buscar("", null, null).get(0).plan()).isEqualTo("EMPRENDEDOR");
    }

    @Test
    @DisplayName("El DTO público no tiene campos de contacto")
    void sinContacto() {
        List<String> campos = Arrays.stream(NegocioPublicoDTO.class.getRecordComponents()).map(RecordComponent::getName).toList();
        assertThat(campos).containsExactly("slug", "nombre", "logoUrl", "categoria", "plan", "productos");
        assertThat(campos).noneMatch(c -> c.matches("(?i).*(whatsapp|instagram|telefono|correo|email|direccion).*"));
    }

    @ParameterizedTest(name = "{0} → {1}")
    @CsvSource({ "PYME, PYME", "pyme, PYME", "NEGOCIO_PLUS, NEGOCIO_PLUS", "GRATUITO, EMPRENDEDOR", "EMPRENDEDOR, EMPRENDEDOR", "'', EMPRENDEDOR" })
    void planPublico(String interno, String publico) {
        assertThat(PlanPublico.de(interno)).isEqualTo(publico);
    }
}
