package com.hotclick.integration;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.Rol;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/**
 * PUT /api/empresa/perfil/pin-cert por HTTP: guarda de propietario, empresa solo de la sesión (el id del body se
 * ignora) y tope fail-closed de intentos (5 fallos / 15 min → 429, por empresa, usuario e IP).
 * Todo con un .p12 desechable y PINs de prueba.
 */
@TestPropertySource(properties = "totp.encryption.key=abababababababababababababababababababababababababababababababab")
@DisplayName("PIN del .p12 por HTTP — guarda de propietario, empresa de sesión y tope de intentos")
class PinCertHttpTest extends BaseIntegrationTest {

    private static final String RUTA = "certs/prueba.p12";
    /** 14 caracteres inventados para el test; es el PIN del .p12 que devuelve {@link #p12()}. */
    private static final String PIN_OK = "Zz9!Zz9!Zz9!Zz";
    private static final String PIN_MAL = "1111";

    @Autowired private EmpresaRepository empresaRepository;

    private Empresa empA, empB;
    private String tokenDueno, tokenDuenoB;
    private Rol rolEmp;
    private int seq;

    @BeforeEach
    void preparar() {
        rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empA = empresa("pinhttp-a");
        empB = empresa("pinhttp-b");
        tokenDueno = miembro("pinhttp-dueno@test.cr", "PROPIETARIO", empA);
        tokenDuenoB = miembro("pinhttp-duenob@test.cr", "PROPIETARIO", empB);
        when(supabaseStorageService.leerPrivado(anyString())).thenReturn(p12());
    }

    @AfterEach
    void limpiar() {
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    /** .p12 desechable reempaquetado con el PIN de 14 caracteres de prueba. */
    private static byte[] p12() {
        try {
            CertificadoDePrueba c = CertificadoDePrueba.obtener();
            java.security.KeyStore ks = java.security.KeyStore.getInstance("PKCS12");
            ks.load(null, null);
            ks.setKeyEntry("firma", c.llave, PIN_OK.toCharArray(), new java.security.cert.Certificate[]{c.certificado});
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            ks.store(out, PIN_OK.toCharArray());
            return out.toByteArray();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private Empresa empresa(String slug) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(slug); e.setNombreComercial(slug); e.setSlug(slug);
        e.setCorreoEmpresa(slug + "@test.cr"); e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        e.setCertP12Path(RUTA);
        return empresaRepository.saveAndFlush(e);
    }

    private String miembro(String correo, String rolEquipo, Empresa emp) {
        Usuario u = crearUsuario(correo, rolEquipo, rolEmp);
        u.setEmpresa(emp);
        u = usuarioRepository.saveAndFlush(u);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(u, emp, rolEquipo));
        return "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR, emp.getId(), emp.getSlug());
    }

    private MockHttpServletRequestBuilder pin(String token, String json) {
        return put("/api/empresa/perfil/pin-cert").header("Authorization", token)
            .contentType(MediaType.APPLICATION_JSON).content(json);
    }

    private int estado(String token, String json) throws Exception {
        return mockMvc.perform(pin(token, json)).andReturn().getResponse().getStatus();
    }

    private String pinEnBD(Long empresaId) {
        return empresaRepository.findById(empresaId).orElseThrow().getPinCertEnc();
    }

    // ── Bloqueo 3: autorización ───────────────────────────────────────────────

    @Test
    @DisplayName("PIN-HTTP-1 | sin empresa asociada → 403")
    void sinEmpresa_403() throws Exception {
        Usuario u = crearUsuario("pinhttp-sinemp@test.cr", "Sin Empresa", rolEmp);
        String token = "Bearer " + jwtUtil.generateToken(u.getCorreo(), u.getId(), Constants.ROL_EMPRENDEDOR);
        assertThat(estado(token, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(403);
    }

    @Test
    @DisplayName("PIN-HTTP-2 | EDITOR, LECTOR, CAJERO y ADMIN de equipo (pasan el matcher de rol) no son propietarios → 403")
    void noPropietario_403() throws Exception {
        for (String rolEquipo : new String[]{"EDITOR", "LECTOR", "CAJERO", "ADMIN"}) {
            String token = miembro("pinhttp-" + rolEquipo.toLowerCase() + "@test.cr", rolEquipo, empA);
            assertThat(estado(token, "{\"pin\":\"" + PIN_MAL + "\"}"))
                .as("rolEquipo=%s", rolEquipo).isEqualTo(403);
        }
        assertThat(pinEnBD(empA.getId())).isNull();
    }

    @Test
    @DisplayName("PIN-HTTP-3 | un empresaId en el body se ignora: el PIN se guarda en la empresa de la sesión, nunca en otra")
    void empresaIdDelBodyIgnorado() throws Exception {
        // El dueño de A manda el id de B (misma .p12 de prueba en ambas). Debe guardar en A y dejar B intacta.
        int st = estado(tokenDueno, "{\"pin\":\"" + PIN_OK + "\",\"empresaId\":" + empB.getId()
            + ",\"idEmpresa\":" + empB.getId() + ",\"empresa_id\":" + empB.getId() + "}");
        assertThat(st).isEqualTo(200);
        assertThat(pinEnBD(empB.getId())).isNull();
        String guardado = pinEnBD(empA.getId());
        assertThat(guardado).startsWith("ENC:").doesNotContain(PIN_OK);
    }

    // ── Bloqueo 1: tope de intentos ───────────────────────────────────────────

    @Test
    @DisplayName("PIN-HTTP-4 | 5 PIN incorrectos → el 6.º da 429 aunque sea correcto; sigue 429; otra empresa sí guarda")
    void topeDeIntentos_429() throws Exception {
        for (int i = 1; i <= 5; i++) {
            assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).as("intento %d", i).isEqualTo(400);
        }
        // 6.º: aunque el PIN sea el correcto, ya está bloqueado (no se prueba)
        MvcResult r6 = mockMvc.perform(pin(tokenDueno, "{\"pin\":\"" + PIN_OK + "\"}")).andReturn();
        assertThat(r6.getResponse().getStatus()).isEqualTo(429);
        assertThat(r6.getResponse().getHeader("Retry-After")).isNotNull();
        assertThat(r6.getResponse().getContentAsString())
            .contains("Demasiados intentos").doesNotContain(PIN_OK);
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_OK + "\"}")).isEqualTo(429);
        assertThat(pinEnBD(empA.getId())).isNull();
    }

    @Test
    @DisplayName("PIN-HTTP-5 | el bloqueo es por empresa, usuario e IP: otro dueño de otra empresa desde otra IP no queda bloqueado")
    void bloqueoNoAfectaAOtraEmpresa() throws Exception {
        for (int i = 0; i < 5; i++) estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}");
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(429);
        // Otra empresa y otro usuario; IP distinta → ningún eje bloqueado: llega a probar el PIN (400, no 429)
        MvcResult r = mockMvc.perform(pin(tokenDuenoB, "{\"pin\":\"" + PIN_MAL + "\"}").with(rq -> { rq.setRemoteAddr("198.51.100.7"); return rq; })).andReturn();
        assertThat(r.getResponse().getStatus()).isEqualTo(400);
    }

    @Test
    @DisplayName("PIN-HTTP-6 | el eje IP bloquea aunque cambie la empresa/usuario (misma IP, dos dueños)")
    void bloqueoPorIp() throws Exception {
        for (int i = 0; i < 5; i++) estado(tokenDuenoB, "{\"pin\":\"" + PIN_MAL + "\"}");
        // El dueño de A comparte IP con quien agotó el tope: se niega aunque sea otra empresa y usuario
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(429);
    }

    @Test
    @DisplayName("PIN-HTTP-7 | tras liberar los buckets, el dueño vuelve a poder intentar")
    void liberarDesbloquea() throws Exception {
        for (int i = 0; i < 5; i++) estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}");
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(429);
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(400);
    }

    @Test
    @DisplayName("PIN-HTTP-7b | un PIN correcto cuenta como éxito y libera los fallos viejos (no bloquea al dueño)")
    void exitoLiberaFallos() throws Exception {
        for (int i = 0; i < 4; i++) assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(400);
        assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_OK + "\"}")).isEqualTo(200);
        // sin liberar, el 5.º fallo acumulado dejaría bloqueado; con liberación se parte de cero
        for (int i = 0; i < 4; i++) assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(400);
    }

    @Test
    @DisplayName("PIN-HTTP-8 | fail-closed: si la BD del límite no responde no se prueba ningún PIN (503)")
    void bdCaida_503() throws Exception {
        jdbcTemplate.execute("ALTER TABLE hot_click_rate_limit_tb RENAME TO hot_click_rate_limit_tb_x");
        try {
            assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).isEqualTo(503);
        } finally {
            jdbcTemplate.execute("ALTER TABLE hot_click_rate_limit_tb_x RENAME TO hot_click_rate_limit_tb");
        }
    }

    // ── Reserva atómica antes de cargar(): el formato inválido también cuenta ──────────────────────

    @Test
    @DisplayName("PIN-HTTP-9 | 5 formatos inválidos (vacío, corto, largo, 4 no dígitos) consumen cupo: el 6.º da 429 aunque el PIN sea correcto y NO se abre el .p12")
    void formatoInvalidoCuentaParaElTope() throws Exception {
        String[] malos = {"{\"pin\":\"\"}", "{\"pin\":\"123\"}", "{\"pin\":\"abcd\"}",
            "{\"pin\":\"123456789012345\"}", "{}"};
        for (int i = 0; i < malos.length; i++) {
            assertThat(estado(tokenDueno, malos[i])).as("formato inválido %d", i + 1).isEqualTo(400);
        }
        MvcResult r6 = mockMvc.perform(pin(tokenDueno, "{\"pin\":\"" + PIN_OK + "\"}")).andReturn();
        assertThat(r6.getResponse().getStatus()).isEqualTo(429);
        assertThat(r6.getResponse().getContentAsString()).contains("Demasiados intentos");
        verify(supabaseStorageService, never()).leerPrivado(anyString()); // ni el 6.º ni los de formato abrieron el .p12
        assertThat(pinEnBD(empA.getId())).isNull();
    }

    @Test
    @DisplayName("PIN-HTTP-10 | el contador se reserva UNA vez por pedido (PIN incorrecto no suma dos veces): 5 incorrectos pasan, el 6.º no")
    void noDobleConteo() throws Exception {
        for (int i = 1; i <= 5; i++) assertThat(estado(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")).as("intento %d", i).isEqualTo(400);
        Integer fail = jdbcTemplate.queryForObject(
            "SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key = ?", Integer.class, "pincert:fail:emp:" + empA.getId());
        assertThat(fail).isEqualTo(5);
    }

    // ── X-Forwarded-For: la IP del tope sale de ClientIpResolver, no del header crudo ──────────────

    @Test
    @DisplayName("PIN-HTTP-11 | peer público: un X-Forwarded-For distinto en cada pedido NO evade el eje IP (se ignora el header)")
    void xffNoEvadeEjeIp_peerNoConfiable() throws Exception {
        String[] tokens = {tokenDueno, tokenDueno, tokenDueno, tokenDuenoB, tokenDuenoB};
        for (int i = 0; i < 5; i++) {
            final String xff = "10.9.8." + (i + 1);
            assertThat(mockMvc.perform(pin(tokens[i], "{\"pin\":\"" + PIN_MAL + "\"}")
                .with(rq -> { rq.setRemoteAddr("203.0.113.9"); return rq; }).header("X-Forwarded-For", xff))
                .andReturn().getResponse().getStatus()).isEqualTo(400);
        }
        // empresa A (3) y B (2) y usuarios: ningún otro eje llegó a 5; solo el eje IP del peer real
        assertThat(mockMvc.perform(pin(tokenDueno, "{\"pin\":\"" + PIN_MAL + "\"}")
            .with(rq -> { rq.setRemoteAddr("203.0.113.9"); return rq; }).header("X-Forwarded-For", "192.0.2.77"))
            .andReturn().getResponse().getStatus()).isEqualTo(429);
        assertThat(jdbcTemplate.queryForObject("SELECT count FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:fail:ip:%'",
            Integer.class)).isGreaterThanOrEqualTo(5);
        assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hot_click_rate_limit_tb WHERE bucket_key LIKE 'pincert:fail:ip:%'",
            Integer.class)).isEqualTo(1); // una sola llave de IP: nunca se usó el header crudo
    }

    @Test
    @DisplayName("PIN-HTTP-12 | peer de confianza: el cliente es la última entrada no confiable del XFF; una entrada falsa a la izquierda no cambia el eje IP")
    void xffDeProxyConfiable_usaResolver() throws Exception {
        String[] tokens = {tokenDueno, tokenDueno, tokenDueno, tokenDuenoB, tokenDuenoB};
        for (int i = 0; i < 5; i++) {
            final String xff = "1.1.1." + (i + 1) + ", 198.51.100.50"; // lo de la izquierda lo puede escribir el cliente
            assertThat(mockMvc.perform(pin(tokens[i], "{\"pin\":\"" + PIN_MAL + "\"}")
                .with(rq -> { rq.setRemoteAddr("127.0.0.1"); return rq; }).header("X-Forwarded-For", xff))
                .andReturn().getResponse().getStatus()).isEqualTo(400);
        }
        // mismo cliente real (.50) con otra firma falsa a la izquierda: bloqueado por IP
        assertThat(mockMvc.perform(pin(tokenDuenoB, "{\"pin\":\"" + PIN_MAL + "\"}")
            .with(rq -> { rq.setRemoteAddr("127.0.0.1"); return rq; }).header("X-Forwarded-For", "8.8.8.8, 198.51.100.50"))
            .andReturn().getResponse().getStatus()).isEqualTo(429);
        // otro cliente real (.51) con otra empresa/usuario con cupo: pasa a probar el PIN
        String otro = miembro("pinhttp-otro@test.cr", "PROPIETARIO", empresa("pinhttp-c"));
        assertThat(mockMvc.perform(pin(otro, "{\"pin\":\"" + PIN_MAL + "\"}")
            .with(rq -> { rq.setRemoteAddr("127.0.0.1"); return rq; }).header("X-Forwarded-For", "198.51.100.51"))
            .andReturn().getResponse().getStatus()).isEqualTo(400);
    }
}
