package com.hotclick.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.integration.BaseIntegrationTest;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDateTime;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Bloqueo por fallos (BAJO del Mentor): quien tiene el correo o la contraseña no puede dejar fuera al dueño.
 * Tope por usuario + IP; el bloqueo global de la cuenta es TEMPORAL y solo lo alcanza un ataque repartido en IP.
 */
@DisplayName("[Auth] bloqueo por fallos: por usuario+IP, global temporal, 2FA cuenta igual")
class LockoutPorIpIntegrationTest extends BaseIntegrationTest {

    @Autowired private ObjectMapper mapper;

    private static final String PASS = "Test1234!";
    private static final String IP_ATACANTE = "203.0.113.5";
    private static final String IP_DUENO    = "198.51.100.7";

    private static RequestPostProcessor desde(String ip) {
        return req -> { req.setRemoteAddr(ip); return req; };
    }

    private MockHttpServletResponse login(String ip, String clave) throws Exception {
        return mockMvc.perform(post("/api/auth/login").with(desde(ip)).contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("correo", testUser.getCorreo(), "contrasena", conFormatoValido(clave)))))
            .andReturn().getResponse();
    }

    /** El DTO exige un formato mínimo: una clave "mala" tiene que pasar la validación para llegar a contar como fallo. */
    private static String conFormatoValido(String clave) {
        return clave.startsWith("mala") ? "Mala1234!" + clave : clave;
    }

    private MockHttpServletResponse activar(String ip, String clave) throws Exception {
        return mockMvc.perform(post("/api/auth/2fa/activate").with(desde(ip)).header("Authorization", userToken)
            .contentType(MediaType.APPLICATION_JSON)
            .content(mapper.writeValueAsString(Map.of("code", "000000", "contrasena", conFormatoValido(clave)))))
            .andReturn().getResponse();
    }

    private Usuario recargar() {
        return usuarioRepository.findById(testUser.getId()).orElseThrow();
    }

    @Test
    @DisplayName("Un tercero que falla la clave muchas veces desde su IP no deja fuera al dueño desde otra")
    void terceroNoPuedeBloquearAlDueno() throws Exception {
        for (int i = 1; i <= 8; i++) {
            assertThat(login(IP_ATACANTE, "mala" + i).getStatus()).as("intento " + i).isEqualTo(401);
        }
        assertThat(recargar().getBloqueadoHasta()).as("la cuenta no queda bloqueada").isNull();
        assertThat(login(IP_DUENO, PASS).getStatus()).as("el dueño entra desde su IP").isEqualTo(200);
    }

    @Test
    @DisplayName("La IP agotada recibe el mismo 401 que una clave mala (sin delatar que el correo existe), aun con la clave correcta")
    void ipAgotadaRespondeComoClaveMala() throws Exception {
        String claveMala = login(IP_ATACANTE, "mala0").getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", "");
        for (int i = 1; i < 5; i++) login(IP_ATACANTE, "mala" + i);
        var conLaBuena = login(IP_ATACANTE, PASS);
        assertThat(conLaBuena.getStatus()).isEqualTo(401);
        assertThat(conLaBuena.getContentAsString().replaceAll("\"timestamp\":\"[^\"]*\"", "")).isEqualTo(claveMala);
        assertThat(login(IP_DUENO, PASS).getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("Ataque repartido en muchas IP: bloqueo global TEMPORAL (no permanente) que se levanta al vencer")
    void ataqueRepartidoBloqueaTemporalmente() throws Exception {
        for (int i = 1; i <= 19; i++) login("192.0.2." + i, "mala");
        assertThat(recargar().getBloqueadoHasta()).as("19 fallos: todavía no").isNull();
        login("192.0.2.20", "mala");
        LocalDateTime hasta = recargar().getBloqueadoHasta();
        assertThat(hasta).as("20 fallos: bloqueo temporal").isNotNull();
        assertThat(hasta).isBefore(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).plusMinutes(40)).isAfter(LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).plusMinutes(10));
        assertThat(login(IP_DUENO, PASS).getStatus()).as("bloqueada").isEqualTo(403);

        usuarioRepository.bloquearUsuario(testUser.getId(), LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR).minusMinutes(1)); // vence
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
        assertThat(login(IP_DUENO, PASS).getStatus()).as("al vencer, el dueño entra").isEqualTo(200);
    }

    @Test
    @DisplayName("Un login bien hecho borra los tropiezos de esa IP: 3 malas + buena + 4 malas no bloquean")
    void loginExitosoLiberaLosFallosDeLaIp() throws Exception {
        for (int i = 0; i < 3; i++) login(IP_DUENO, "mala");
        assertThat(login(IP_DUENO, PASS).getStatus()).isEqualTo(200);
        for (int i = 0; i < 4; i++) login(IP_DUENO, "mala");
        assertThat(login(IP_DUENO, PASS).getStatus()).isEqualTo(200);
    }

    @Test
    @DisplayName("La contraseña mala en /2fa/setup y /2fa/activate cuenta igual que en el login: 5 fallos y esa IP queda en 403")
    void contrasenaMalaEnGestion2faCuenta() throws Exception {
        for (int i = 0; i < 3; i++) {
            var r = mockMvc.perform(post("/api/auth/2fa/setup").with(desde(IP_ATACANTE)).header("Authorization", userToken)
                .contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(Map.of("contrasena", "mala"))))
                .andReturn().getResponse();
            assertThat(r.getStatus()).isEqualTo(401);
        }
        assertThat(activar(IP_ATACANTE, "mala").getStatus()).isEqualTo(401);
        assertThat(activar(IP_ATACANTE, "mala").getStatus()).isEqualTo(401);
        assertThat(activar(IP_ATACANTE, PASS).getStatus()).as("5 fallos acumulados entre setup y activate").isEqualTo(403);
        // el dueño, desde su IP, ni se entera: conserva su login y su gestión
        assertThat(login(IP_DUENO, PASS).getStatus()).isEqualTo(200);
        assertThat(activar(IP_DUENO, PASS).getStatus()).as("no es 403").isNotEqualTo(403);
    }
}
