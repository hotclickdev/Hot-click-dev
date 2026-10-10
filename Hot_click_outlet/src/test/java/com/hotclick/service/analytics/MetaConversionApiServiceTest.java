package com.hotclick.service.analytics;

import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

@DisplayName("Meta CAPI apagada: sin publicidad, ninguna llamada HTTP")
class MetaConversionApiServiceTest {

    @Test
    @DisplayName("enviarPurchase no toca el RestTemplate y isEnabled es false")
    void nuncaEnvia() {
        RestTemplate http = mock(RestTemplate.class);
        MetaConversionApiService svc = new MetaConversionApiService(http);
        Pedido pedido = new Pedido();
        pedido.setId(1L);
        pedido.setNumeroPedido("ORD-META-1");
        svc.enviarPurchase(pedido);
        svc.enviarPurchase(pedido);
        svc.enviarPurchase(null);
        assertThat(svc.isEnabled()).isFalse();
        verifyNoInteractions(http);
    }
}
