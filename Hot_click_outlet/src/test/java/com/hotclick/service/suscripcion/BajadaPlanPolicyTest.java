package com.hotclick.service.suscripcion;

import com.hotclick.model.Plan;
import com.hotclick.service.tenant.UsoTenant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Regla de bajar de plan")
class BajadaPlanPolicyTest {

    private static Plan plan(String nombre, int productos, int bodegas, int cajas, int usuarios) {
        Plan plan = new Plan();
        plan.setNombre(nombre);
        plan.setMaxProductos(productos);
        plan.setMaxBodegas(bodegas);
        plan.setMaxCajas(cajas);
        plan.setMaxUsuarios(usuarios);
        return plan;
    }

    @Test
    @DisplayName("Solo bajar es bajada; nombres desconocidos no cuentan")
    void soloBajarEsBajada() {
        assertThat(BajadaPlanPolicy.esBajada("NEGOCIO_PLUS", "PYME")).isTrue();
        assertThat(BajadaPlanPolicy.esBajada("PYME", "EMPRENDEDOR")).isTrue();
        assertThat(BajadaPlanPolicy.esBajada("EMPRENDEDOR", "PYME")).isFalse();
        assertThat(BajadaPlanPolicy.esBajada("PYME", "PYME")).isFalse();
        assertThat(BajadaPlanPolicy.esBajada(null, "EMPRENDEDOR")).isFalse();
        assertThat(BajadaPlanPolicy.esBajada("PYME", "OTRO")).isFalse();
    }

    @Test
    @DisplayName("Reporta un exceso por cada recurso que se pasa, en orden fijo")
    void reportaExcesoPorRecurso() {
        Plan destino = plan("EMPRENDEDOR", 50, 1, 1, 2);

        var excesos = BajadaPlanPolicy.excesos(destino, new UsoTenant(63, 2, 1, 5));

        assertThat(excesos).containsExactly(
            new BajadaPlanPolicy.ExcesoPlan("productos", 63, 50, 13),
            new BajadaPlanPolicy.ExcesoPlan("bodegas", 2, 1, 1),
            new BajadaPlanPolicy.ExcesoPlan("usuarios", 5, 2, 3));
    }

    @Test
    @DisplayName("Uso igual al límite entra; -1 es sin límite")
    void igualAlLimiteEntraYSinLimiteNoBloquea() {
        assertThat(BajadaPlanPolicy.excesos(plan("EMPRENDEDOR", 50, 1, 1, 2), new UsoTenant(50, 1, 1, 2))).isEmpty();
        assertThat(BajadaPlanPolicy.excesos(plan("PYME", -1, -1, -1, -1), new UsoTenant(900, 40, 9, 40))).isEmpty();
    }
}
