package com.hotclick.service.tenant;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("TenantLimitChecker — mensajes de planes.bloqueo.*")
class TenantLimitCheckerMensajesTest {

    @Test
    @DisplayName("Límites en vos y sin la ruta inexistente «Configuración → Suscripción»")
    void limites() {
        assertThat(TenantLimitChecker.mensajeLimitePlan("productos", 1, 50, 50, 0))
            .isEqualTo("Tu plan permite 50 productos y ya tenés 50. Para publicar más, mejorá tu plan.");
        assertThat(TenantLimitChecker.mensajeLimitePlan("productos", 5, 48, 50, 2))
            .isEqualTo("Podés agregar 2 más: tu plan permite 50 y ya tenés 48.");
        assertThat(TenantLimitChecker.mensajeLimitePlan("usuarios", 1, 2, 2, 0)).contains("Tu plan permite 2 usuarios en tu equipo");
        assertThat(TenantLimitChecker.mensajeLimitePlan("bodegas", 1, 1, 1, 0)).doesNotContain("Suscripción");
        assertThat(TenantLimitChecker.textoPlanActual("NEGOCIO_PLUS")).isEqualTo("Tu plan actual es Negocio Plus.");
    }

    @Test
    @DisplayName("Funciones fuera del plan")
    void funciones() {
        assertThat(TenantLimitChecker.mensajeFuncionBloqueada("ai")).isEqualTo("Las consultas de IA están en Pyme y Negocio Plus.");
        assertThat(TenantLimitChecker.mensajeFuncionBloqueada("giftCards")).isEqualTo("Vendé gift cards desde el plan Pyme.");
        assertThat(TenantLimitChecker.mensajeFuncionBloqueada("api")).doesNotContain("no incluye");
    }
}
