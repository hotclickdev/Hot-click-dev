package com.hotclick.integration;

import com.hotclick.model.Pago;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.TreeSet;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * P-01 (Seguridad): ningún camino fuera del webhook ONVO (succeeded + GET) pone CAPTURADO un pago SINPE.
 * Fija la lista de clases que escriben PAGO_CAPTURADO; cada una está atada a su proveedor. Si alguien
 * agrega otra, este test falla y obliga a revisarla.
 */
class CapturaSinpeSoloOnvoTest {

    @Test
    @DisplayName("Solo estas clases capturan pagos; la única que acepta SINPE es SinpeOnvoMarketplaceService")
    void escritoresDeCapturado() throws IOException {
        Set<String> escritores = new TreeSet<>();
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            for (Path p : (Iterable<Path>) files.filter(f -> f.toString().endsWith(".java"))::iterator) {
                String src = Files.readString(p);
                if (src.matches("(?s).*setEstadoPago\\(\\s*(Constants\\.)?PAGO_CAPTURADO\\s*\\).*")
                        || src.matches("(?s).*setEstadoPago\\(\\s*\"CAPTURADO\"\\s*\\).*")
                        || src.matches("(?s).*estado_?[pP]ago\\s*=\\s*'CAPTURADO'.*")) {
                    escritores.add(p.getFileName().toString());
                }
            }
        }
        assertThat(escritores).containsExactlyInAnyOrder(
            "OnvoCapturaService.java",          // exige proveedor ONVO
            "StripePaymentProvider.java",       // exige proveedor STRIPE
            "TilopayConfirmacionService.java",  // exige proveedor TILOPAY
            "PedidoPagoManualService.java",     // solo proveedor MANUAL
            "SinpeOnvoMarketplaceService.java"  // SINPE: webhook succeeded + GET
        );
    }

    @Test
    @DisplayName("El cobro manual ya no acepta SINPE Móvil ni pagos con intent ONVO; el efectivo sigue")
    void sinpeNoEsManual() throws Exception {
        var m = com.hotclick.service.pedido.PedidoPagoManualService.class.getDeclaredMethod("esPagoManual", Pago.class);
        m.setAccessible(true);
        Pago sinpe = new Pago();
        sinpe.setProveedor(Constants.PROVEEDOR_SINPE);
        Pago manual = new Pago();
        manual.setProveedor(Constants.PROVEEDOR_MANUAL);
        com.hotclick.model.Pedido pedSinpe = new com.hotclick.model.Pedido();
        pedSinpe.setMetodoPago("SINPE");
        sinpe.setPedido(pedSinpe);
        assertThat((boolean) m.invoke(null, sinpe)).as("SINPE Móvil").isFalse();
        assertThat((boolean) m.invoke(null, manual)).isTrue();
        // Efectivo se guarda con proveedor SINPE: sigue siendo cobro a mano, salvo que tenga intent ONVO.
        com.hotclick.model.Pedido pedEfectivo = new com.hotclick.model.Pedido();
        pedEfectivo.setMetodoPago("EFECTIVO");
        Pago efectivo = new Pago();
        efectivo.setProveedor(Constants.PROVEEDOR_SINPE);
        efectivo.setPedido(pedEfectivo);
        assertThat((boolean) m.invoke(null, efectivo)).as("efectivo").isTrue();
        efectivo.setMerchantToken("ONVOPI:pi_x");
        assertThat((boolean) m.invoke(null, efectivo)).as("con intent ONVO").isFalse();
    }
}
