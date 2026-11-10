package com.hotclick.service.auth;

import com.hotclick.dto.AuthResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Alta de empresa: la respuesta trae correoVerificado del servidor")
class AuthRegistroEmpresaResultadoTest {

    @Test
    @DisplayName("correo sin verificar viaja en el mapa; no se omite el campo")
    void sinVerificar() {
        AuthResponse auth = auth(false);
        Map<String, Object> out = AuthRegistroEmpresaHandler.buildRegistroResultado(auth, true, null);
        assertThat(out).containsEntry("correoVerificado", false);
        assertThat(out).containsEntry("accessToken", "tok");
    }

    @Test
    @DisplayName("si el servidor dice verificado, el mapa también")
    void verificado() {
        Map<String, Object> out = AuthRegistroEmpresaHandler.buildRegistroResultado(auth(true), false, "smtp");
        assertThat(out).containsEntry("correoVerificado", true);
        assertThat(out).containsEntry("otpError", "smtp");
    }

    private static AuthResponse auth(boolean verificado) {
        AuthResponse auth = new AuthResponse("tok", "ref", 7L, "dueno@hotclick.test", "EMPRENDEDOR", "Dueño");
        auth.setCorreoVerificado(verificado);
        auth.setEmpresaId(25L);
        return auth;
    }
}
