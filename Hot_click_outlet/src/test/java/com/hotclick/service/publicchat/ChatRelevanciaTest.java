package com.hotclick.service.publicchat;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ChatRelevanciaTest {

    @Test
    void regaloParaPapaBuscaPorPapaNoPorRegalo() {
        assertThat(PublicChatProductSearch.sinRegaloGenerico(List.of("regalo", "papá"))).containsExactly("papá");
        assertThat(PublicChatProductSearch.sinRegaloGenerico(List.of("regalo"))).containsExactly("regalo");
    }

    @Test
    void sinonimosConTildeYCarro() {
        assertThat(PublicChatSynonymExpander.expandSynonyms(List.of("papá"))).contains("hombre");
        assertThat(PublicChatSynonymExpander.expandSynonyms(List.of("carro"))).contains("auto", "vehiculo");
        assertThat(PublicChatSynonymExpander.expandSynonyms(List.of("perro"))).contains("mascota");
    }

    @Test
    void sinResultadoDiceQueSeBusco() {
        assertThat(PublicChatDiscoveryHandler.mensajeSinResultado(false, List.of("carro"))).contains("carro");
    }
}
