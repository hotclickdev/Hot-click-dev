package com.hotclick.service.catalogo;

import com.hotclick.service.publicchat.PublicChatIntentHelper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Términos ILIKE del fallback RAG")
class ChatSearchTermsTest {

    @Test
    @DisplayName("Parte el tsquery OR y no deja quiero/productos")
    void fromTsQuery_sala() {
        PublicChatIntentHelper helper = new PublicChatIntentHelper();
        String ts = helper.buildTsQuery("quiero ver productos para sala");
        List<String> terms = ChatSearchTerms.fromTsQuery(ts);

        assertThat(terms).contains("sala", "living", "sofa", "mueble");
        assertThat(terms).doesNotContain("quiero", "productos", "para", "ver");
    }

    @Test
    @DisplayName("Slug vacío o hotclick es marketplace; otro slug es tienda")
    void slugMarketplace() {
        assertThat(MarketplaceCatalogo.esMarketplace(null)).isTrue();
        assertThat(MarketplaceCatalogo.esMarketplace("")).isTrue();
        assertThat(MarketplaceCatalogo.esMarketplace("hotclick")).isTrue();
        assertThat(MarketplaceCatalogo.esMarketplace("HOTCLICK")).isTrue();
        assertThat(MarketplaceCatalogo.esMarketplace("mi-pyme")).isFalse();
    }
}
