package com.hotclick.service.payment;

import com.hotclick.model.Compra;
import com.hotclick.repository.CompraRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.GiftCardService;
import com.hotclick.service.pos.PosQrVentaService;
import org.springframework.test.util.ReflectionTestUtils;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;

/** Arma a mano la cadena de compra por paquetes para tests unitarios sin Spring. */
public final class CompraCheckoutTestWiring {

    private CompraCheckoutTestWiring() {}

    public record Piezas(
        CheckoutValidator checkoutValidator,
        StockReservationService stockReservationService,
        OrderPricingService orderPricingService,
        CheckoutOrderFactory checkoutOrderFactory,
        PaymentNotificationsFacade paymentNotificationsFacade,
        CompraRepository compraRepository,
        PedidoRepository pedidoRepository,
        GiftCardService giftCardService,
        PosQrVentaService posQrVentaService
    ) {}

    /** Inyecta {@code compraCheckoutService} y {@code compraGiftCardService} en {@code destino}. */
    public static void conectar(Object destino, Piezas piezas) {
        lenient().when(piezas.compraRepository().save(any(Compra.class))).thenAnswer(inv -> {
            Compra compra = inv.getArgument(0);
            if (compra.getId() == null) compra.setId(500L);
            return compra;
        });
        ReflectionTestUtils.setField(destino, "compraCheckoutService", compraCheckoutService(piezas));
        ReflectionTestUtils.setField(destino, "compraGiftCardService", compraGiftCardService(piezas));
    }

    private static CompraCheckoutService compraCheckoutService(Piezas piezas) {
        PaquetesCheckoutBuilder builder = new PaquetesCheckoutBuilder();
        ReflectionTestUtils.setField(builder, "checkoutValidator", piezas.checkoutValidator());

        CompraCheckoutService compra = new CompraCheckoutService();
        ReflectionTestUtils.setField(compra, "stockReservationService", piezas.stockReservationService());
        ReflectionTestUtils.setField(compra, "paquetesCheckoutBuilder", builder);
        ReflectionTestUtils.setField(compra, "orderPricingService", piezas.orderPricingService());
        ReflectionTestUtils.setField(compra, "checkoutOrderFactory", piezas.checkoutOrderFactory());
        ReflectionTestUtils.setField(compra, "compraRepository", piezas.compraRepository());
        return compra;
    }

    private static CompraGiftCardService compraGiftCardService(Piezas piezas) {
        CompraGiftCardService gift = new CompraGiftCardService();
        ReflectionTestUtils.setField(gift, "stockReservationService", piezas.stockReservationService());
        ReflectionTestUtils.setField(gift, "pedidoRepository", piezas.pedidoRepository());
        ReflectionTestUtils.setField(gift, "giftCardService", piezas.giftCardService());
        ReflectionTestUtils.setField(gift, "paymentNotificationsFacade", piezas.paymentNotificationsFacade());
        ReflectionTestUtils.setField(gift, "posQrVentaService", piezas.posQrVentaService());
        return gift;
    }
}
