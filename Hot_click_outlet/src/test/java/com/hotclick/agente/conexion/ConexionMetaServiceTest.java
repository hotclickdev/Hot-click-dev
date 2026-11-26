package com.hotclick.agente.conexion;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.conexion.ConexionDtos.ConexionResultado;
import com.hotclick.agente.conexion.ConexionDtos.WhatsappRequest;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.exception.IntegracionExternaException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/** Conexión de cuentas de Meta con MockRestServiceServer: sin llamadas reales. */
class ConexionMetaServiceTest {

    private static final String G = "https://graph.facebook.com/v23.0/";
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();

    private final CanalCuentaService cuentas = mock(CanalCuentaService.class);
    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer meta = MockRestServiceServer.createServer(http);
    private ConexionMetaService service;

    private static MetaConexionConfig config(String appId, String secreto, String signup, String login) {
        return new MetaConexionConfig(appId, secreto, signup, login, "v23.0");
    }

    @BeforeEach
    void init() {
        armar(config("APP-1", "secreto-app", "CFG-WA", "CFG-LOGIN"));
        when(cuentas.buscar(any(), anyString())).thenReturn(Optional.empty());
        when(cuentas.registrarCuenta(any(), any(), anyString(), any(), anyString(), anyString())).thenAnswer(i -> {
            CanalCuenta c = new CanalCuenta();
            c.setId(1L);
            c.setEmpresaId(i.getArgument(0));
            c.setTipo(i.getArgument(1));
            c.setIdExterno(i.getArgument(2));
            c.setNombre(i.getArgument(4));
            c.setEstado(com.hotclick.agente.canal.EstadoCanal.ACTIVA);
            return c;
        });
    }

    private void armar(MetaConexionConfig cfg) {
        service = new ConexionMetaService(cfg, new MetaGraphCliente(cfg, http), cuentas);
    }

    private void esperarFlujoWhatsapp(boolean registroOk) {
        meta.expect(requestTo(G + "oauth/access_token")).andExpect(method(HttpMethod.POST))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("code=CODE-1")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("client_id=APP-1")))
            .andRespond(withSuccess("{\"access_token\":\"TOK-NEGOCIO\",\"token_type\":\"bearer\"}", MediaType.APPLICATION_JSON));
        meta.expect(requestTo(G + "111222?fields=verified_name")).andExpect(method(HttpMethod.GET))
            .andExpect(header("Authorization", "Bearer TOK-NEGOCIO"))
            .andRespond(withSuccess("{\"verified_name\":\"Tienda Luna\",\"id\":\"111222\"}", MediaType.APPLICATION_JSON));
        meta.expect(requestTo(G + "999888/subscribed_apps")).andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer TOK-NEGOCIO"))
            .andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));
        var registro = meta.expect(requestTo(G + "111222/register")).andExpect(method(HttpMethod.POST))
            .andExpect(jsonPath("$.messaging_product").value("whatsapp"))
            .andExpect(jsonPath("$.pin").value(org.hamcrest.Matchers.matchesPattern("\\d{6}")));
        if (registroOk) registro.andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));
        else registro.andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
            .body("{\"error\":{\"message\":\"texto\",\"code\":133005}}"));
    }

    private static final WhatsappRequest WA = new WhatsappRequest("CODE-1", "111222", "999888");

    @Test
    void whatsappIntercambiaSuscribeRegistraYGuardaConElToken() {
        esperarFlujoWhatsapp(true);
        ConexionResultado r = service.conectarWhatsapp(7L, WA);
        meta.verify();
        ArgumentCaptor<String> token = ArgumentCaptor.forClass(String.class);
        verify(cuentas).registrarCuenta(eq(7L), eq(Canal.WHATSAPP), eq("111222"), eq("999888"), eq("Tienda Luna"),
            token.capture());
        assertThat(token.getValue()).isEqualTo("TOK-NEGOCIO");
        assertThat(r.avisos()).isEmpty();
        assertThat(r.cuentas()).singleElement().satisfies(c -> assertThat(c.tipo()).isEqualTo("WHATSAPP"));
    }

    @Test
    void fallaElRegistroDelNumeroSeAvisaPeroLaCuentaQueda() {
        esperarFlujoWhatsapp(false);
        ConexionResultado r = service.conectarWhatsapp(7L, WA);
        assertThat(r.avisos()).containsExactly("REGISTRO_NUMERO_PENDIENTE");
        verify(cuentas).registrarCuenta(eq(7L), eq(Canal.WHATSAPP), eq("111222"), any(), anyString(), anyString());
    }

    @Test
    void codigoRechazadoPorMetaNoGuardaNada() {
        meta.expect(requestTo(G + "oauth/access_token")).andRespond(withStatus(HttpStatus.BAD_REQUEST)
            .contentType(MediaType.APPLICATION_JSON)
            .body("{\"error\":{\"message\":\"This authorization code has expired\",\"code\":100}}"));
        assertThatThrownBy(() -> service.conectarWhatsapp(7L, WA))
            .isInstanceOf(MetaRechazoException.class).hasMessageContaining("100")
            .hasMessageNotContaining("expired");
        verify(cuentas, never()).registrarCuenta(any(), any(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void metaCaidaSeTraduceAIntegracionExternaSinFiltrarUrlNiSecreto() {
        meta.expect(requestTo(G + "oauth/access_token")).andRespond(withStatus(HttpStatus.BAD_GATEWAY));
        assertThatThrownBy(() -> service.conectarWhatsapp(7L, WA))
            .isInstanceOf(IntegracionExternaException.class)
            .satisfies(e -> assertThat(e.getMessage() + e.getCause()).doesNotContain("secreto-app"));
    }

    @Test
    void timeoutDeRedNoPropagaLaUrl() {
        meta.expect(requestTo(G + "oauth/access_token")).andRespond(request -> { throw new IOException("timeout " + request.getURI()); });
        assertThatThrownBy(() -> service.conectarWhatsapp(7L, WA))
            .isInstanceOf(IntegracionExternaException.class)
            .satisfies(e -> {
                assertThat(((IntegracionExternaException) e).getTipo()).isEqualTo(IntegracionExternaException.Tipo.TIMEOUT);
                assertThat(e.getMessage()).doesNotContain("graph.facebook.com");
                assertThat(e.getCause()).isNull();
            });
    }

    @Test
    void sinConfiguracionResponde503ElLlamadorYNoLlamaAMeta() {
        armar(config("", "", "", ""));
        assertThatThrownBy(() -> service.conectarWhatsapp(7L, WA)).isInstanceOf(ConexionNoConfiguradaException.class);
        assertThatThrownBy(() -> service.listarPaginas("tok")).isInstanceOf(ConexionNoConfiguradaException.class);
        assertThatThrownBy(() -> service.conectarPagina(7L, "tok", "123456")).isInstanceOf(ConexionNoConfiguradaException.class);
        meta.verify(); // ninguna llamada esperada ni hecha
        assertThat(service.configPublica().appId()).isEmpty();
        assertThat(service.configPublica().whatsappDisponible()).isFalse();
    }

    @Test
    void configParcialTampocoServe() {
        armar(config("APP-1", "secreto-app", "", "CFG-LOGIN"));
        assertThatThrownBy(() -> service.conectarWhatsapp(7L, WA)).isInstanceOf(ConexionNoConfiguradaException.class);
        assertThat(service.configPublica().metaLoginDisponible()).isTrue();
    }

    @Test
    void cuentaDeOtroNegocioSeRechazaAntesDeLlamarAMeta() {
        CanalCuenta ajena = new CanalCuenta();
        ajena.setEmpresaId(99L);
        when(cuentas.buscar(Canal.WHATSAPP, "111222")).thenReturn(Optional.of(ajena));
        assertThatThrownBy(() -> service.conectarWhatsapp(7L, WA)).isInstanceOf(IllegalStateException.class);
        meta.verify();
        verify(cuentas, never()).registrarCuenta(any(), any(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void adminConectaCuentaDeHotClickConEmpresaNula() {
        esperarFlujoWhatsapp(true);
        service.conectarWhatsapp(null, WA);
        verify(cuentas).registrarCuenta(eq(null), eq(Canal.WHATSAPP), eq("111222"), any(), anyString(), anyString());
    }

    // ── Instagram y Facebook ──────────────────────────────────────────────────

    private void esperarPaginas() {
        meta.expect(requestTo(G + "oauth/access_token")).andExpect(method(HttpMethod.POST))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("fb_exchange_token=USR-CORTO")))
            .andRespond(withSuccess("{\"access_token\":\"USR-LARGO\"}", MediaType.APPLICATION_JSON));
        meta.expect(org.springframework.test.web.client.match.MockRestRequestMatchers
                .requestToUriTemplate(G + "me/accounts?limit=100&fields=id,name,access_token,instagram_business_account%7Bid,username%7D"))
            .andExpect(header("Authorization", "Bearer USR-LARGO"))
            .andRespond(withSuccess("{\"data\":[{\"id\":\"5551\",\"name\":\"Luna\",\"access_token\":\"TOK-PAG-1\","
                + "\"instagram_business_account\":{\"id\":\"1784\",\"username\":\"luna.cr\"}},"
                + "{\"id\":\"5552\",\"name\":\"Otra\",\"access_token\":\"TOK-PAG-2\"}]}", MediaType.APPLICATION_JSON));
    }

    @Test
    void listaPaginasSinTokensDePagina() throws Exception {
        esperarPaginas();
        var paginas = service.listarPaginas("USR-CORTO");
        meta.verify();
        assertThat(paginas).hasSize(2);
        assertThat(paginas.get(0).instagramUsuario()).isEqualTo("luna.cr");
        assertThat(paginas.get(1).instagramId()).isNull();
        assertThat(JSON.writeValueAsString(paginas)).doesNotContain("TOK-PAG").doesNotContain("USR-");
    }

    @Test
    void conectaPaginaConInstagramYSuscribeLosMensajes() {
        esperarPaginas();
        meta.expect(requestTo(G + "5551/subscribed_apps")).andExpect(method(HttpMethod.POST))
            .andExpect(header("Authorization", "Bearer TOK-PAG-1"))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("subscribed_fields=messages%2Cmessaging_postbacks")))
            .andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));
        ConexionResultado r = service.conectarPagina(7L, "USR-CORTO", "5551");
        meta.verify();
        verify(cuentas).registrarCuenta(7L, Canal.MESSENGER, "5551", null, "Luna", "TOK-PAG-1");
        verify(cuentas).registrarCuenta(7L, Canal.INSTAGRAM, "1784", null, "@luna.cr", "TOK-PAG-1");
        assertThat(r.cuentas()).extracting(c -> c.tipo()).containsExactly("MESSENGER", "INSTAGRAM");
    }

    @Test
    void paginaSinInstagramConectaSoloMessenger() {
        esperarPaginas();
        meta.expect(requestTo(G + "5552/subscribed_apps")).andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));
        ConexionResultado r = service.conectarPagina(7L, "USR-CORTO", "5552");
        assertThat(r.cuentas()).hasSize(1);
        verify(cuentas, never()).registrarCuenta(anyLong(), eq(Canal.INSTAGRAM), anyString(), any(), anyString(), anyString());
    }

    @Test
    void paginaQueElUsuarioNoAdministraSeRechaza() {
        esperarPaginas();
        assertThatThrownBy(() -> service.conectarPagina(7L, "USR-CORTO", "7777"))
            .isInstanceOf(IllegalArgumentException.class);
        verify(cuentas, never()).registrarCuenta(any(), any(), anyString(), any(), anyString(), anyString());
    }

    @Test
    void paginaDeOtroNegocioSeRechazaAntesDeSuscribir() {
        esperarPaginas();
        CanalCuenta ajena = new CanalCuenta();
        ajena.setEmpresaId(99L);
        when(cuentas.buscar(Canal.INSTAGRAM, "1784")).thenReturn(Optional.of(ajena));
        assertThatThrownBy(() -> service.conectarPagina(7L, "USR-CORTO", "5551")).isInstanceOf(IllegalStateException.class);
        meta.verify(); // no hubo suscripción (no se esperó)
    }

    @Test
    void elTokenNoApareceEnElResultadoNiEnToString() throws Exception {
        esperarFlujoWhatsapp(true);
        ConexionResultado r = service.conectarWhatsapp(7L, WA);
        assertThat(JSON.writeValueAsString(r)).doesNotContain("TOK-NEGOCIO").doesNotContain("tokenCifrado");
        assertThat(WA.toString()).doesNotContain("CODE-1");
        assertThat(config("A", "secreto-app", "C", "L").toString()).doesNotContain("secreto-app");
    }
}
