package com.hotclick.integration;

import com.hotclick.service.analytics.MetaConversionApiService;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

/** Con meta.pixel-id y meta.capi-access-token configurados, el bean de Spring igual no hace HTTP. */
@TestPropertySource(properties = {"meta.pixel-id=1234567890", "meta.capi-access-token=token-de-prueba"})
@DisplayName("Meta CAPI apagada con config META_* puesta")
class MetaCapiApagadaIT extends BaseIntegrationTest {

    @Autowired private MetaConversionApiService metaCapi;
    @MockitoBean private RestTemplate restTemplate;

    @Test
    void sinLlamadas() {
        Pedido p = new Pedido();
        p.setId(99L);
        p.setNumeroPedido("ORD-META-IT");
        metaCapi.enviarPurchase(p);
        assertThat(metaCapi.isEnabled()).isFalse();
        verifyNoInteractions(restTemplate);
    }
}
