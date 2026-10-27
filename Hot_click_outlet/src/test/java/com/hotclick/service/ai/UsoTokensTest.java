package com.hotclick.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("UsoTokens — lectura del usage de Claude")
class UsoTokensTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("Lee entrada, salida y los dos contadores de cache")
    void leeCuatroContadores() throws Exception {
        var usage = mapper.readTree("""
            {"input_tokens": 120, "output_tokens": 45,
             "cache_read_input_tokens": 3000, "cache_creation_input_tokens": 800}""");
        UsoTokens u = UsoTokens.desdeUsage(usage);
        assertThat(u.entrada()).isEqualTo(120);
        assertThat(u.salida()).isEqualTo(45);
        assertThat(u.cacheLectura()).isEqualTo(3000L);
        assertThat(u.cacheEscritura()).isEqualTo(800L);
    }

    @Test
    @DisplayName("usage ausente o null → vacio")
    void ausente() throws Exception {
        assertThat(UsoTokens.desdeUsage(null).esVacio()).isTrue();
        assertThat(UsoTokens.desdeUsage(mapper.readTree("{}").path("usage")).esVacio()).isTrue();
        assertThat(UsoTokens.desdeUsage(mapper.readTree("{\"usage\":null}").path("usage")).esVacio()).isTrue();
    }

    @Test
    @DisplayName("Sin cache (respuestas viejas) los contadores de cache quedan en 0")
    void sinCache() throws Exception {
        UsoTokens u = UsoTokens.desdeUsage(mapper.readTree("{\"input_tokens\":7,\"output_tokens\":3}"));
        assertThat(u).isEqualTo(UsoTokens.de(7, 3));
    }

    @Test
    @DisplayName("mas() suma las rondas de un loop con herramientas y no admite negativos")
    void sumaYClamp() {
        UsoTokens total = UsoTokens.de(10, 5).mas(new UsoTokens(20, 6, 100, 50));
        assertThat(total).isEqualTo(new UsoTokens(30, 11, 100, 50));
        assertThat(new UsoTokens(-1, -2, -3, -4).esVacio()).isTrue();
    }
}
