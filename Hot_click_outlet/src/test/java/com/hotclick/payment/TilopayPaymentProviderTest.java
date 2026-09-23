package com.hotclick.payment;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.TilopayService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TilopayPaymentProviderTest {

    @Mock private TilopayService tilopayService;
    @InjectMocks private TilopayPaymentProvider provider;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(provider, "appUrl", "http://localhost:3000");
    }

    @Test
    void getNombre_esTilopay() {
        assertEquals(Constants.PROVEEDOR_TILOPAY, provider.getNombre());
    }

    @Test
    void crearSesion_mockTokenYRedirectPropio() {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-123");
        when(tilopayService.loginSdk()).thenReturn("mock-sdk-token");
        when(tilopayService.isMockMode()).thenReturn(true);

        PaymentSession session = provider.crearSesion(pedido, new Usuario());

        assertEquals("ORD-123", session.externalId());
        assertEquals("mock-sdk-token", session.sdkToken());
        assertTrue(session.modoEmbebido());
        assertEquals("http://localhost:3000/pago/tilopay/respuesta?order=ORD-123", session.redirectUrl());
    }
}
