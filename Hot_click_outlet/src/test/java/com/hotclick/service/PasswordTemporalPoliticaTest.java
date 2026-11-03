package com.hotclick.service;

import com.hotclick.service.auth.AuthSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

/** BAJO: la clave temporal de "invitar miembro" (admin) siempre cumple la política (8 + mayúscula + número). */
@DisplayName("[BAJO] EmpresaAdminService.generarPasswordTemporal cumple la política de contraseña")
class PasswordTemporalPoliticaTest {

    @Test
    @DisplayName("10.000 claves generadas: todas cumplen cumplePoliticaContrasena, largo 12, sin repetidas")
    void diezMilClavesCumplen() {
        Set<String> vistas = new HashSet<>();
        for (int i = 0; i < 10_000; i++) {
            String clave = EmpresaAdminService.generarPasswordTemporal();
            // Sin imprimir la clave: el mensaje de fallo solo dice el índice.
            if (!AuthSupport.cumplePoliticaContrasena(clave)) fail("la clave #" + i + " no cumple la política");
            if (clave.length() != EmpresaAdminService.LARGO_PASSWORD_TEMPORAL) fail("la clave #" + i + " no tiene 12 caracteres");
            if (clave.chars().noneMatch(Character::isLowerCase)) fail("la clave #" + i + " no tiene minúscula");
            vistas.add(clave);
        }
        assertThat(vistas).as("SecureRandom no repite en 10.000").hasSize(10_000);
    }
}
