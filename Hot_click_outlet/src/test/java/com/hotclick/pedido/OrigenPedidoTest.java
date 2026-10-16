package com.hotclick.pedido;

import com.hotclick.model.OrigenPedido;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("[HOTFIX] origen del pedido: solo ONLINE/POS/MANUAL (chk_pedido_origen)")
class OrigenPedidoTest {

    @Test
    void enumCoincideConElCheckDeV25() throws IOException {
        String v25 = Files.readString(Path.of("src/main/resources/db/migration/V25__pedido_origen_turno_caja.sql"));
        assertThat(v25).contains("CHECK (origen IN ('ONLINE','POS','MANUAL'))");
        assertThat(Stream.of(OrigenPedido.values()).map(OrigenPedido::codigo)).containsExactly("ONLINE", "POS", "MANUAL");
        assertThat(new Pedido().getOrigen()).isEqualTo("ONLINE");
    }

    @Test
    void normalizaAliasYRechazaDesconocidos() {
        assertThat(OrigenPedido.normalizar("tienda_web")).isEqualTo(OrigenPedido.ONLINE);
        assertThat(OrigenPedido.normalizar("QR")).isEqualTo(OrigenPedido.POS);
        assertThat(OrigenPedido.normalizar(" telegram ")).isEqualTo(OrigenPedido.MANUAL);
        assertThat(OrigenPedido.normalizar("ASIGNACION_MANUAL")).isEqualTo(OrigenPedido.MANUAL);
        assertThat(OrigenPedido.normalizar(null)).isNull();
        assertThat(OrigenPedido.normalizar(" ")).isNull();
        assertThatThrownBy(() -> OrigenPedido.normalizar("WHATSAPP")).isInstanceOf(IllegalArgumentException.class);
    }

    /** Ningún setOrigen("literal") en código de producción: todo pasa por OrigenPedido. */
    @Test
    void sinLiteralesDeOrigenEnElCodigo() throws IOException {
        Pattern literal = Pattern.compile("setOrigen\\(\\s*\"");
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            List<String> malos = files.filter(p -> p.toString().endsWith(".java"))
                .filter(p -> { try { return literal.matcher(Files.readString(p)).find(); } catch (IOException e) { throw new IllegalStateException(e); } })
                .map(Path::toString).toList();
            assertThat(malos).isEmpty();
        }
    }
}
