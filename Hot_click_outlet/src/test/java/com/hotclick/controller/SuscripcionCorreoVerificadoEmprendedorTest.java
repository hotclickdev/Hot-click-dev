package com.hotclick.controller;

import com.hotclick.model.Plan;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Cambio de plan: el correo verificado también se exige para Emprendedor")
class SuscripcionCorreoVerificadoEmprendedorTest {

    private static Plan plan(String nombre, Integer precio) {
        Plan p = new Plan();
        p.setNombre(nombre);
        p.setPrecioMensual(precio);
        return p;
    }

    @Test
    @DisplayName("Emprendedor exige correo verificado aunque su precio en colones sea 0 o nulo")
    void emprendedorExigeCorreoVerificado() {
        assertThat(SuscripcionController.exigeCorreoVerificado(plan("EMPRENDEDOR", 0))).isTrue();
        assertThat(SuscripcionController.exigeCorreoVerificado(plan("EMPRENDEDOR", null))).isTrue();
        assertThat(SuscripcionController.exigeCorreoVerificado(plan("Emprendedor", 0))).isTrue();
    }

    @Test
    @DisplayName("Los planes de pago siguen exigiéndolo y un plan gratuito sin precio no")
    void planesDePagoSiguenExigiendolo() {
        assertThat(SuscripcionController.exigeCorreoVerificado(plan("PYME", 15000))).isTrue();
        assertThat(SuscripcionController.exigeCorreoVerificado(plan("GRATIS", 0))).isFalse();
        assertThat(SuscripcionController.exigeCorreoVerificado(plan("GRATIS", null))).isFalse();
        assertThat(SuscripcionController.exigeCorreoVerificado(null)).isFalse();
    }
}
