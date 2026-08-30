package com.hotclick.service.whatsapp;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("WhatsAppOperacionStatus — PRODUCCION vs SIMULADO")
class WhatsAppOperacionStatusTest {

    @Mock WhatsAppMetaApiClient metaApiClient;

    @Test
    void modoSimuladoSinCredenciales() {
        when(metaApiClient.credencialesConfiguradas()).thenReturn(false);
        assertThat(new WhatsAppOperacionStatus(metaApiClient).modo()).isEqualTo("SIMULADO");
    }

    @Test
    void modoProduccionConCredenciales() {
        when(metaApiClient.credencialesConfiguradas()).thenReturn(true);
        assertThat(new WhatsAppOperacionStatus(metaApiClient).modo()).isEqualTo("PRODUCCION");
    }
}
