package com.hotclick.service.catalogo;

import com.hotclick.service.publicchat.PublicChatIntentHelper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Términos de búsqueda del chat")
class ChatSearchTermsTest {

    @Test
    @DisplayName("Términos de usuario sin sinónimos; sinónimos solo como boost")
    void userTerms_sinSinonimosEnMatch() {
        PublicChatIntentHelper helper = new PublicChatIntentHelper();
        List<String> terms = helper.userTerms("quiero ver productos para sala");
        String ts = helper.buildTsQuery("quiero ver productos para sala");

        assertThat(terms).contains("sala");
        assertThat(terms).doesNotContain("mueble", "living", "sofa");
        assertThat(ChatSearchTerms.fromTsQuery(ts)).containsExactlyElementsOf(terms);
        assertThat(helper.synonymBoostTerms("quiero ver productos para sala"))
            .contains("living", "sofa", "mueble");
        assertThat(ChatSearchTerms.websearchQuery(terms)).isEqualTo("sala");
        assertThat(ChatSearchTerms.sanitizarLike("Sala%_Living")).isEqualTo("salaliving");
        assertThat(ChatSearchTerms.quitarComodinesLike("%sofá_")).isEqualTo("sofá");
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
