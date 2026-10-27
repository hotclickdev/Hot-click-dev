package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.service.GiftCardService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Locale;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** La normalización del código de gift card no depende del locale del servidor (turco: i → İ). */
class OrderPricingCodigoGiftCardLocaleTest {

    @Test
    void codigoSeNormalizaConLocaleRootAunqueElDefaultSeaTurco() {
        Locale original = Locale.getDefault();
        try {
            Locale.setDefault(Locale.forLanguageTag("tr-TR"));
            GiftCardService gift = mock(GiftCardService.class);
            when(gift.validar(any(), anyLong())).thenReturn(Optional.empty());
            OrderPricingService s = new OrderPricingService();
            ReflectionTestUtils.setField(s, "giftCardService", gift);
            Empresa e = new Empresa();
            e.setId(1L);
            Bodega b = new Bodega();
            b.setEmpresa(e);
            PaymentCheckoutRequest req = new PaymentCheckoutRequest();
            req.setCodigoGiftCard(" regalo-idili-01 ");

            OrderPricingResult r = s.calcularPaquete(req, b, 10_000, null, Integer.MAX_VALUE);

            ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
            verify(gift).validar(codigo.capture(), anyLong());
            assertThat(codigo.getValue()).isEqualTo("REGALO-IDILI-01");
            assertThat(r.gcCodigo()).isEqualTo("REGALO-IDILI-01");
        } finally {
            Locale.setDefault(original);
        }
    }
}
