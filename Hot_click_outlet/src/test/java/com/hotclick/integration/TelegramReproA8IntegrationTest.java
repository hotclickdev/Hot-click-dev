package com.hotclick.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.*;
import com.hotclick.repository.*;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** QA8: tests que reproducen A8-C2, A8-C4 y A8-C7. Deben FALLAR mientras el bug exista. */
class TelegramReproA8IntegrationTest extends BaseIntegrationTest {

    private static final String VALOR_CABECERA_WEBHOOK = "test-webhook-secret";
    private static final String WEBHOOK = "/api/webhooks/telegram";
    private static final long CHAT_ID = 555_801L;

    @MockitoBean protected TelegramClienteBotService bot;

    @Autowired TelegramVinculacionRepository vinculacionRepository;
    @Autowired EmpresaRepository empresaRepository;

    private final ObjectMapper json = new ObjectMapper();
    private Empresa empresaA;
    private Empresa empresaB;
    private Usuario duenno;
    private String tokenDuenno;

    @BeforeEach
    void setUp() {
        when(bot.isConfigured()).thenReturn(true);
        when(bot.getBotUsername()).thenReturn("HotClickTestBot");
        when(bot.validarSecret(VALOR_CABECERA_WEBHOOK)).thenReturn(true);
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");

        Rol rolEmp = obtenerOCrearRol(Constants.ROL_EMPRENDEDOR, 5);
        empresaA = crearEmpresa("Tienda QA8 A", "tienda-qa8-a", "qa8-a@test.cr");
        empresaB = crearEmpresa("Tienda QA8 B", "tienda-qa8-b", "qa8-b@test.cr");
        duenno = crearUsuario("qa8-duenno@test.cr", "Duenno QA8", rolEmp);
        duenno.setEmpresa(empresaA);
        duenno = usuarioRepository.saveAndFlush(duenno);
        tokenDuenno = tokenPara(duenno, Constants.ROL_EMPRENDEDOR);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(duenno, empresaA, "PROPIETARIO"));
    }

    @AfterEach
    void tearDown() {
        jdbcTemplate.update("DELETE FROM hot_click_rate_limit_tb");
        vinculacionRepository.deleteAll();
        miembroEmpresaRepository.deleteAll();
        usuarioRepository.findAll().forEach(u -> { u.setEmpresa(null); usuarioRepository.save(u); });
        empresaRepository.deleteAll();
    }

    @Test
    @DisplayName("A8-C2: dos ráfagas de 4 callbacks separadas >30 s no deben suspender la cuenta 365 días")
    void dosRafagas_noSuspenden365Dias() throws Exception {
        vincularDirecto(duenno, empresaA, CHAT_ID);

        for (int i = 0; i < 4; i++) postUpdate(callback(CHAT_ID, "inv"));   // ráfaga 1 (<1 s)
        // Simula que pasaron 31 s: se corren hacia atrás todas las ventanas del rate limiter.
        jdbcTemplate.update("UPDATE hot_click_rate_limit_tb SET window_start = window_start - 31");
        for (int i = 0; i < 4; i++) postUpdate(callback(CHAT_ID, "inv"));   // ráfaga 2 (<1 s)

        Usuario u = usuarioRepository.findById(duenno.getId()).orElseThrow();
        assertThat(u.getEstado()).as("estado del usuario").isNotEqualTo(Constants.ESTADO_SUSPENDIDO);
        assertThat(u.getBloqueadoHasta()).as("bloqueadoHasta")
            .satisfiesAnyOf(
                b -> assertThat(b).isNull(),
                b -> assertThat(b).isBefore(LocalDateTime.now(Constants.ZONA_CR).plusDays(2)));
    }

    @Test
    @DisplayName("A8-C4: revocar a un miembro en la empresa A no corta su Telegram en la empresa B")
    void revocarEnUnaEmpresa_conservaVinculoEnLaOtra() throws Exception {
        Rol rolUser = obtenerOCrearRol(Constants.ROL_USUARIO_FINAL, 1);
        Usuario socio = crearUsuario("qa8-socio@test.cr", "Socio QA8", rolUser);
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(socio, empresaA, "ADMIN"));
        miembroEmpresaRepository.saveAndFlush(new MiembroEmpresa(socio, empresaB, "ADMIN"));
        vincularDirecto(socio, empresaB, CHAT_ID + 1);

        mockMvc.perform(delete("/api/telegram/equipo/" + socio.getId())
                .header("Authorization", tokenDuenno))
            .andExpect(status().isOk());

        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(socio.getId()).orElseThrow();
        assertThat(v.getEstado()).as("vínculo del socio, que sigue activo en la empresa B")
            .isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(CHAT_ID + 1);
    }

    @Test
    @DisplayName("A8-C7: /start con el código en minúsculas vincula")
    void start_codigoEnMinusculas_vincula() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/telegram/vincular").header("Authorization", tokenDuenno))
            .andExpect(status().isOk()).andReturn();
        JsonNode body = json.readTree(res.getResponse().getContentAsString());
        String codigo = body.get("codigo").asText();

        postUpdate(mensajeTexto(CHAT_ID + 2, "/start " + codigo.toLowerCase()));

        TelegramVinculacion v = vinculacionRepository.findByUsuarioId(duenno.getId()).orElseThrow();
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(CHAT_ID + 2);
    }

    private void postUpdate(String body) throws Exception {
        mockMvc.perform(post(WEBHOOK)
                .header("X-Telegram-Bot-Api-Secret-Token", VALOR_CABECERA_WEBHOOK)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isOk());
    }

    private String mensajeTexto(long chatId, String texto) {
        return """
            {"message":{"chat":{"id":%d,"type":"private"},"from":{"username":"tester"},"text":"%s"}}
            """.formatted(chatId, texto);
    }

    private String callback(long chatId, String data) {
        return """
            {"callback_query":{"id":"cb-1","data":"%s","message":{"chat":{"id":%d,"type":"private"}}}}
            """.formatted(data, chatId);
    }

    private TelegramVinculacion vincularDirecto(Usuario u, Empresa e, long chatId) {
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(chatId);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setEmpresaActivaId(e.getId());
        v.setFechaVinculacion(LocalDateTime.now(Constants.ZONA_CR));
        return vinculacionRepository.saveAndFlush(v);
    }

    private Empresa crearEmpresa(String nombre, String slug, String correo) {
        Empresa e = new Empresa();
        e.setNombreEmpresa(nombre);
        e.setSlug(slug);
        e.setCorreoEmpresa(correo);
        e.setEstadoEmpresa("ACTIVO");
        e.setFechaRegistro(LocalDateTime.now());
        return empresaRepository.saveAndFlush(e);
    }
}
