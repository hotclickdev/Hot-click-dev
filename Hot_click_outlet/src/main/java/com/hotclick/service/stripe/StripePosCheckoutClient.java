package com.hotclick.service.stripe;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class StripePosCheckoutClient {

    private static final Logger log = LoggerFactory.getLogger(StripePosCheckoutClient.class);

    public String crearCheckoutPOS(Integer totalColones, List<Map<String, Object>> items,
                                   String successUrl, String cancelUrl,
                                   Long empresaId, String posQrToken, boolean mockMode) throws StripeException {
        if (mockMode) {
            return successUrl;
        }

        long amountCentimos = totalColones * 100L;

        String descripcion = items.stream()
            .map(i -> i.getOrDefault("nombre", "Producto") + " x" + i.getOrDefault("cantidad", 1))
            .reduce((a, b) -> a + ", " + b)
            .orElse("Compra POS");

        SessionCreateParams params = SessionCreateParams.builder()
            .setMode(SessionCreateParams.Mode.PAYMENT)
            .setSuccessUrl(successUrl + "&session_id={CHECKOUT_SESSION_ID}")
            .setCancelUrl(cancelUrl)
            .addLineItem(
                SessionCreateParams.LineItem.builder()
                    .setQuantity(1L)
                    .setPriceData(
                        SessionCreateParams.LineItem.PriceData.builder()
                            .setCurrency("crc")
                            .setUnitAmount(amountCentimos)
                            .setProductData(
                                SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                    .setName("HOTCLICK — " + descripcion.substring(0, Math.min(descripcion.length(), 100)))
                                    .build())
                            .build())
                    .build())
            .putMetadata("empresa_id",   String.valueOf(empresaId))
            .putMetadata("pos_qr_token", posQrToken)
            .putMetadata("origen",       "POS")
            .build();

        Session session = Session.create(params);
        log.info("[stripe-pos] Checkout session {} creada para empresa={} token={}", session.getId(), empresaId, posQrToken);
        return session.getUrl();
    }

    public boolean checkoutSessionPagada(String sessionId, boolean mockMode) throws StripeException {
        if (mockMode || sessionId == null || sessionId.startsWith("cs_mock")) return false;
        Session session = Session.retrieve(sessionId);
        return "paid".equals(session.getPaymentStatus());
    }
}
