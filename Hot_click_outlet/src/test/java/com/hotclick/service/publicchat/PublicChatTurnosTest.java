package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Fichas de catálogo con intención de producto")
class PublicChatTurnosTest {

    @Test
    @DisplayName("Turno de usuario cuenta mensajes previos")
    void turnoUsuario() {
        assertThat(PublicChatTurnos.turnoUsuario(null)).isEqualTo(1);
        assertThat(PublicChatTurnos.turnoUsuario(List.of())).isEqualTo(1);

        List<Map<String, Object>> unUser = List.of(Map.of("rol", "user", "texto", "hola"));
        assertThat(PublicChatTurnos.turnoUsuario(unUser)).isEqualTo(2);
    }

    @Test
    @DisplayName("Intención de producto muestra fichas desde el primer mensaje")
    void intencionProducto() {
        assertThat(PublicChatTurnos.tieneIntencionProducto(false, false, false)).isFalse();
        assertThat(PublicChatTurnos.tieneIntencionProducto(false, false, true)).isTrue();
        assertThat(PublicChatTurnos.tieneIntencionProducto(true, false, false)).isTrue();
        assertThat(PublicChatTurnos.tieneIntencionProducto(false, true, false)).isTrue();

        assertThat(PublicChatDiscoveryHandler.fichasEnPantalla("GENERAL", false, false, false)).isFalse();
        assertThat(PublicChatDiscoveryHandler.fichasEnPantalla("GENERAL", false, false, true)).isTrue();
        assertThat(PublicChatDiscoveryHandler.fichasEnPantalla("GENERAL", true, false, false)).isTrue();
        assertThat(PublicChatDiscoveryHandler.fichasEnPantalla("CARRITO:x:1", false, false, false)).isTrue();
    }
}
