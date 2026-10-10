package com.hotclick.service.payment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Toda ruta que confirma un pago (Tilopay, SINPE admin, comprobante SINPE, pago manual del panel,
 * Stripe) pasa por {@link PaymentOrderConfirmationService#confirmarPedido}, que reclama cada paquete
 * con reclamarParaConfirmar. Si alguien consume stock o acredita la billetera por fuera, este test
 * lo marca: ese camino quedaría sin la idempotencia atómica.
 */
@DisplayName("Pagos: todas las confirmaciones pasan por el reclamo atómico")
class RutasConfirmacionPagoTest {

    private static final Path MAIN = Path.of("src/main/java/com/hotclick");

    private static List<Path> fuentesQueLlaman(String llamada) throws IOException {
        try (Stream<Path> s = Files.walk(MAIN)) {
            return s.filter(p -> p.toString().endsWith(".java")).filter(p -> {
                try { return Files.readString(p).contains(llamada); } catch (IOException e) { throw new RuntimeException(e); }
            }).map(MAIN::relativize).toList();
        }
    }

    private static String leer(String rel) throws IOException {
        return Files.readString(MAIN.resolve(rel));
    }

    @Test
    void consumoDeStockYAcreditacion_soloDesdeLaConfirmacion() throws IOException {
        assertThat(fuentesQueLlaman("confirmAndConsumeStock("))
            .containsExactlyInAnyOrder(Path.of("service/payment/StockReservationService.java"),
                Path.of("service/payment/PaymentOrderConfirmationService.java"));
        assertThat(fuentesQueLlaman(".acreditarVentaEnTransaccion("))
            .containsExactly(Path.of("service/payment/PaymentNotificationsFacade.java"));
        assertThat(fuentesQueLlaman("onPedidoConfirmado("))
            .containsExactlyInAnyOrder(Path.of("service/payment/PaymentNotificationsFacade.java"),
                Path.of("service/payment/PaymentOrderConfirmationService.java"));
    }

    @Test
    void cadaRuta_delegaEnConfirmarPedido() throws IOException {
        assertThat(leer("service/payment/SinpePaymentAdminService.java")).contains("orderConfirmationService.confirmarPedido(");
        assertThat(leer("service/sinpe/SinpeComprobanteService.java")).contains("paymentService.confirmarPedido(");
        assertThat(leer("service/pedido/PedidoPagoManualService.java")).contains("paymentService.confirmarPedido(");
        assertThat(leer("payment/StripePaymentProvider.java")).contains("paymentService.confirmarPedido(");
        assertThat(leer("service/payment/TilopayConfirmacionService.java")).contains("paymentService.confirmarPedido(");
        assertThat(leer("service/PaymentService.java")).contains("orderConfirmationService.confirmarPedido(");
    }

    @Test
    void laConfirmacionReclamaCadaPaquete_yElFalloEsCondicional() throws IOException {
        assertThat(leer("service/payment/PaymentOrderConfirmationService.java"))
            .contains("pedidoRepository.reclamarParaConfirmar(pedido.getId(), YA_CONFIRMADOS) == 0");
        assertThat(leer("service/payment/PaymentFailureHandler.java"))
            .contains("pagoRepository.marcarFallidoSiPendiente(");
    }
}
