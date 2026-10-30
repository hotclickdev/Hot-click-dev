package com.hotclick.integration;

import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.service.payment.GuestUserResolver;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Seguridad sobre #399 (NO APTO, MEDIO 2): PaymentService y SinpeCheckoutService le pasan a GuestUserResolver el
 * correo GUARDADO del usuario autenticado. Con el correo normalizado, una cuenta antigua guardada con mayúsculas
 * («Juan@X.com») no se encontraba y se creaba un Invitado nuevo: el pedido quedaba en otra cuenta.
 * Datos ficticios; la comparación es sin distinguir mayúsculas y se usa la base real (H2).
 */
@DisplayName("[MEDIO] GuestUserResolver resuelve a la cuenta antigua con mayúsculas y no crea invitado")
class GuestUserResolverCuentaAntiguaTest extends BaseIntegrationTest {

    @Autowired private GuestUserResolver resolver;

    private long total(String correo) {
        return usuarioRepository.findAllByCorreoIgnoreCase(correo).size();
    }

    @Test
    @DisplayName("Juan@X.com guardada con mayúsculas: el correo exacto, en minúsculas o con espacios → la misma cuenta")
    void cuentaAntiguaConMayusculas() {
        Rol rol = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario juan = crearUsuario("Juan@X.com", "Juan", rol);

        // Lo que pasan PaymentService/SinpeCheckoutService: el correo guardado del usuario autenticado.
        assertThat(resolver.resolve("Juan@X.com", null).getId()).as("correo exacto").isEqualTo(juan.getId());
        assertThat(resolver.resolve("juan@x.com", null).getId()).as("minúsculas").isEqualTo(juan.getId());
        assertThat(resolver.resolve("  JUAN@X.COM ", null).getId()).as("mayúsculas y espacios").isEqualTo(juan.getId());
        assertThat(total("juan@x.com")).as("no se creó ningún invitado").isEqualTo(1);
    }

    @Test
    @DisplayName("Dos cuentas que solo difieren en mayúsculas: se elige la más antigua (menor id) y no se crea otra")
    void variantesElige_laMasAntigua() {
        Rol rol = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario antigua = crearUsuario("Ana@X.com", "Ana", rol);
        Usuario otra = crearUsuario("ANA@X.COM", "Ana2", rol);
        assertThat(otra.getId()).isGreaterThan(antigua.getId());

        assertThat(resolver.resolve("aNa@x.com", null).getId()).as("variante intermedia").isEqualTo(antigua.getId());
        assertThat(resolver.resolve("ANA@X.COM", null).getId()).as("el correo exacto manda").isEqualTo(otra.getId());
        assertThat(total("ana@x.com")).as("sigue habiendo solo las 2 originales").isEqualTo(2);
    }

    @Test
    @DisplayName("Correo nuevo (sin cuenta): se crea un único invitado con el correo normalizado")
    void correoNuevoCreaInvitadoNormalizado() {
        obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario g = resolver.resolve(" Nuevo.Cliente@X.COM ", "8888-1111");
        assertThat(g.getCorreo()).isEqualTo("nuevo.cliente@x.com");
        assertThat(resolver.resolve("nuevo.cliente@x.com", null).getId()).isEqualTo(g.getId());
        assertThat(total("nuevo.cliente@x.com")).isEqualTo(1);
    }
}
