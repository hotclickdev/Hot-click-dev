package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Términos de búsqueda del chat público")
class PublicChatIntentHelperTest {

    private final PublicChatIntentHelper helper = new PublicChatIntentHelper();

    @Test
    @DisplayName("quiero ver productos para sala → sala sin stopwords; sinónimos en boost")
    void querySala_expandeSinonimosSinStopwords() {
        String ts = helper.buildTsQuery("quiero ver productos para sala");

        assertThat(ts).contains("sala");
        assertThat(ts).doesNotContain("quiero");
        assertThat(ts).doesNotContain("productos");
        assertThat(ts).doesNotContain("para");

        assertThat(helper.synonymBoostTerms("quiero ver productos para sala"))
            .contains("living", "sofa", "mueble");
    }

    @Test
    @DisplayName("algo para la cocina no se clasifica como off-topic")
    void cocina_noEsOffTopic() {
        assertThat(helper.isOffTopic("quiero algo para la cocina")).isFalse();
        assertThat(helper.isOffTopic("productos para cocinar")).isFalse();
    }

    @Test
    @DisplayName("qué productos tienes no busca 'tienes'; muestra catálogo")
    void queProductosTienes_esCatalogo() {
        assertThat(helper.userTerms("que productos tienes")).isEmpty();
        assertThat(helper.isCatalogBrowseQuery("que productos tienes")).isTrue();
        assertThat(helper.isCatalogBrowseQuery("qué tenés")).isTrue();
        assertThat(helper.isCatalogBrowseQuery("que venden")).isTrue();
    }

    @Test
    @DisplayName("busco algo como zapatos deja el término zapatos")
    void zapatos_noSePierdeComoStopword() {
        assertThat(helper.userTerms("busco algo como zapatos")).containsExactly("zapatos");
        assertThat(helper.isCatalogBrowseQuery("busco algo como zapatos")).isFalse();
        assertThat(helper.synonymBoostTerms("busco algo como zapatos"))
            .contains("zapatilla", "tenis", "calzado");
    }

    @Test
    @DisplayName("qué tenés en zapatos sigue buscando zapatos")
    void queTenesEnZapatos_noEsTodoElCatalogo() {
        assertThat(helper.userTerms("que tenes en zapatos")).contains("zapatos");
        assertThat(helper.isCatalogBrowseQuery("que tenes en zapatos")).isFalse();
        assertThat(helper.isCatalogBrowseQuery("quiero ver productos para sala")).isFalse();
    }

    @Test
    @DisplayName("categoría de una sola palabra no es saludo ni off-topic")
    void categoriaCorta_noEsSaludoNiOffTopic() {
        for (String cat : List.of("gorras", "tazas", "camisas", "lámpara")) {
            assertThat(helper.isGreeting(cat)).as(cat + " saludo").isFalse();
            assertThat(helper.isOffTopic(cat)).as(cat + " off-topic").isFalse();
            assertThat(helper.buildTsQuery(cat)).as(cat + " tsQuery").isNotBlank();
            assertThat(helper.isCatalogBrowseQuery(cat)).as(cat + " browse").isFalse();
        }
    }

    @Test
    @DisplayName("hola y buenas tardes siguen siendo saludo")
    void saludosReales_siguenSiendoSaludo() {
        assertThat(helper.isGreeting("hola")).isTrue();
        assertThat(helper.isGreeting("Hola!")).isTrue();
        assertThat(helper.isGreeting("buenas tardes")).isTrue();
        assertThat(helper.isGreeting("buenas")).isTrue();
    }

    @Test
    @DisplayName("consola no es off-topic por coincidencia parcial con sol")
    void consola_noEsOffTopicPorSol() {
        assertThat(helper.isOffTopic("consola")).isFalse();
        assertThat(helper.isOffTopic("camisola")).isFalse();
        assertThat(helper.isOffTopic("cómo está el clima hoy")).isTrue();
    }
}
