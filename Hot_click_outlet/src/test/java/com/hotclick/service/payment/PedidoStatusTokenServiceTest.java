package com.hotclick.service.payment;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.concurrent.atomic.AtomicLong;
import java.util.function.LongSupplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Token de estado del retorno ONVO: firmado, de vida corta, por pedido y separado del cancelToken")
public class PedidoStatusTokenServiceTest {

    /** Instancia con una clave de prueba (no es un secreto real). */
    public static PedidoStatusTokenService servicio() {
        PedidoStatusTokenService s = new PedidoStatusTokenService();
        ReflectionTestUtils.setField(s, "secret", "test-secret-for-ci-only-not-production");
        return s;
    }

    @Test
    void validoSoloParaSuPedidoYAntesDeVencer() {
        AtomicLong ahora = new AtomicLong(1_000_000L);
        PedidoStatusTokenService s = servicio();
        s.relojSegundos = (LongSupplier) ahora::get;
        String t = s.emitir("HC-1");
        assertThat(s.esValido("HC-1", t)).isTrue();
        assertThat(s.esValido("HC-2", t)).isFalse();
        ahora.addAndGet(60 * 60 - 1);
        assertThat(s.esValido("HC-1", t)).isTrue();
        ahora.addAndGet(1);
        assertThat(s.esValido("HC-1", t)).isFalse(); // venció a los 60 min
    }

    @Test
    void rechazaAdulteradoYFormatosRaros() {
        PedidoStatusTokenService s = servicio();
        String t = s.emitir("HC-1");
        String firma = t.substring(t.indexOf('.') + 1);
        assertThat(s.esValido("HC-1", "99999999999." + firma)).isFalse(); // alargar la vida rompe la firma
        assertThat(s.esValido("HC-1", t.substring(0, t.length() - 1) + (t.endsWith("0") ? "1" : "0"))).isFalse();
        for (String raro : new String[] {null, "", ".", "abc", "1.", ".abc", "x.y", "1".repeat(200)}) {
            assertThat(s.esValido("HC-1", raro)).isFalse();
        }
        assertThat(s.esValido(null, t)).isFalse();
    }

    @Test
    void noSirveComoCancelTokenNiAlReves() {
        PedidoStatusTokenService s = servicio();
        GuestCancelTokenService c = new GuestCancelTokenService();
        ReflectionTestUtils.setField(c, "secret", "test-secret-for-ci-only-not-production");
        assertThat(c.esValido("HC-1", s.emitir("HC-1"))).isFalse();
        assertThat(s.esValido("HC-1", c.emitir("HC-1"))).isFalse();
    }

    @Test
    void otraClaveNoValidaYSinClaveFallaCerrado() {
        PedidoStatusTokenService otra = new PedidoStatusTokenService();
        ReflectionTestUtils.setField(otra, "secret", "otra-clave-de-prueba");
        assertThat(otra.esValido("HC-1", servicio().emitir("HC-1"))).isFalse();
        PedidoStatusTokenService sin = new PedidoStatusTokenService();
        assertThatThrownBy(() -> sin.emitir("HC-1")).isInstanceOf(IllegalStateException.class);
    }
}
