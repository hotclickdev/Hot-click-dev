package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Términos de búsqueda del chat público")
class PublicChatIntentHelperTest {

    private final PublicChatIntentHelper helper = new PublicChatIntentHelper();

    @Test
    @DisplayName("quiero ver productos para sala → sala y sinónimos, no stopwords")
    void querySala_expandeSinonimosSinStopwords() {
        String ts = helper.buildTsQuery("quiero ver productos para sala");

        assertThat(ts).contains("sala");
        assertThat(ts).contains("living");
        assertThat(ts).contains("sofa");
        assertThat(ts).contains("mueble");
        assertThat(ts).doesNotContain("quiero");
        assertThat(ts).doesNotContain("productos");
        assertThat(ts).doesNotContain("para");
    }

    @Test
    @DisplayName("algo para la cocina no se clasifica como off-topic")
    void cocina_noEsOffTopic() {
        assertThat(helper.isOffTopic("quiero algo para la cocina")).isFalse();
        assertThat(helper.isOffTopic("productos para cocinar")).isFalse();
    }
}
