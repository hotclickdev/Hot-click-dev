package com.hotclick.service.publicchat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Fichas de catálogo a partir del 3.er turno")
class PublicChatTurnosTest {

    @Test
    @DisplayName("Sin historial es turno 1; el tercero ya muestra fichas")
    void turnosYUmbral() {
        assertThat(PublicChatTurnos.turnoUsuario(null)).isEqualTo(1);
        assertThat(PublicChatTurnos.turnoUsuario(List.of())).isEqualTo(1);
        assertThat(PublicChatTurnos.mostrarFichasCatalogo(List.of())).isFalse();

        List<Map<String, Object>> unUser = List.of(Map.of("rol", "user", "texto", "hola"));
        assertThat(PublicChatTurnos.turnoUsuario(unUser)).isEqualTo(2);
        assertThat(PublicChatTurnos.mostrarFichasCatalogo(unUser)).isFalse();

        List<Map<String, Object>> dosUsers = List.of(
            Map.of("rol", "user", "texto", "a"),
            Map.of("rol", "assistant", "texto", "ok"),
            Map.of("rol", "user", "texto", "b"));
        assertThat(PublicChatTurnos.turnoUsuario(dosUsers)).isEqualTo(3);
        assertThat(PublicChatTurnos.mostrarFichasCatalogo(dosUsers)).isTrue();
        assertThat(PublicChatDiscoveryHandler.fichasEnPantalla("GENERAL", List.of(), false, false)).isFalse();
        assertThat(PublicChatDiscoveryHandler.fichasEnPantalla("GENERAL", List.of(), true, false)).isTrue();
        assertThat(PublicChatDiscoveryHandler.fichasEnPantalla("CARRITO:x:1", List.of(), false, false)).isTrue();
    }
}
