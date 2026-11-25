package com.hotclick.agente.voz;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.conexion.MetaGraphCliente;
import com.hotclick.agente.voz.AudioRechazadoException.Motivo;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class DescargadorAudioTest {

    private static final String URL_WA = "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1";
    private static final String URL_IG = "https://scontent-mia3-1.cdninstagram.com/v/audio.mp4";

    private MetaGraphCliente graph;
    private CanalCuentaService cuentas;
    private RestTemplate http;
    private MockRestServiceServer server;
    private DescargadorAudio descargador;
    private final CanalCuenta cuenta = new CanalCuenta();

    @BeforeEach
    void init() {
        graph = mock(MetaGraphCliente.class);
        cuentas = mock(CanalCuentaService.class);
        http = new RestTemplate();
        server = MockRestServiceServer.createServer(http);
        // tope pequeño (1 KiB, el mínimo de VozConfig) para probar tamaño sin memoria
        descargador = new DescargadorAudio(graph, cuentas, new VozConfig(1024, 120, 20, 0), http);
        when(cuentas.tokenDe(cuenta)).thenReturn("tok-canal");
    }

    private static MensajeEntrante msg(Canal canal, String media) {
        return new MensajeEntrante(canal, "cuenta", "remitente", null, "mid-1", "audio", null, media, 0);
    }

    @Test
    void whatsappDescargaConToken() {
        when(graph.mediaWhatsapp("123", "tok-canal"))
            .thenReturn(new MetaGraphCliente.MediaWhatsapp(URL_WA, "audio/ogg; codecs=opus", 100));
        server.expect(requestTo(URL_WA)).andExpect(method(HttpMethod.GET))
            .andExpect(header("Authorization", "Bearer tok-canal"))
            .andRespond(withSuccess(new byte[]{1, 2, 3}, org.springframework.http.MediaType.parseMediaType("audio/ogg")));

        AudioVoz a = descargador.descargar(cuenta, msg(Canal.WHATSAPP, "123"));

        assertThat(a.bytes()).containsExactly(1, 2, 3);
        assertThat(a.mime()).isEqualTo("audio/ogg");
        assertThat(a.toString()).doesNotContain("tok-canal");
        server.verify();
    }

    @Test
    void whatsappUrlDeGraphFueraDeLaListaBlancaNoSeDescargaNiSeEnviaElToken() {
        when(graph.mediaWhatsapp("123", "tok-canal"))
            .thenReturn(new MetaGraphCliente.MediaWhatsapp("https://evil.example.com/a.ogg", "audio/ogg", 10));

        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.WHATSAPP, "123")))
            .isInstanceOfSatisfying(AudioRechazadoException.class, e -> assertThat(e.motivo()).isEqualTo(Motivo.URL_NO_PERMITIDA));
        server.verify(); // ninguna llamada HTTP
    }

    @Test
    void whatsappTamanoDeclaradoExcesivoSeRechazaSinDescargar() {
        when(graph.mediaWhatsapp("123", "tok-canal"))
            .thenReturn(new MetaGraphCliente.MediaWhatsapp(URL_WA, "audio/ogg", 5_000));

        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.WHATSAPP, "123")))
            .isInstanceOfSatisfying(AudioRechazadoException.class, e -> assertThat(e.motivo()).isEqualTo(Motivo.DEMASIADO_GRANDE));
        server.verify();
    }

    @Test
    void whatsappMimeNoPermitido() {
        when(graph.mediaWhatsapp("123", "tok-canal"))
            .thenReturn(new MetaGraphCliente.MediaWhatsapp(URL_WA, "application/x-msdownload", 10));

        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.WHATSAPP, "123")))
            .isInstanceOfSatisfying(AudioRechazadoException.class, e -> assertThat(e.motivo()).isEqualTo(Motivo.TIPO_NO_PERMITIDO));
    }

    @Test
    void whatsappSinTokenNoLlamaAGraph() {
        when(cuentas.tokenDe(cuenta)).thenReturn(null);

        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.WHATSAPP, "123")))
            .isInstanceOfSatisfying(AudioRechazadoException.class, e -> assertThat(e.motivo()).isEqualTo(Motivo.SIN_TOKEN));
        verify(graph, never()).mediaWhatsapp(any(), any());
    }

    @Test
    void cuerpoMasGrandeQueElTopeSeCortaAlLeerAunqueNoDeclareTamano() {
        when(graph.mediaWhatsapp("123", "tok-canal"))
            .thenReturn(new MetaGraphCliente.MediaWhatsapp(URL_WA, "audio/ogg", 0));
        server.expect(requestTo(URL_WA)).andRespond(withSuccess(new byte[2048], org.springframework.http.MediaType.parseMediaType("audio/ogg")));

        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.WHATSAPP, "123")))
            .isInstanceOfSatisfying(AudioRechazadoException.class, e -> assertThat(e.motivo()).isEqualTo(Motivo.DEMASIADO_GRANDE));
    }

    @Test
    void redireccionOErrorHttpEsDescargaFallida() {
        when(graph.mediaWhatsapp("123", "tok-canal"))
            .thenReturn(new MetaGraphCliente.MediaWhatsapp(URL_WA, "audio/ogg", 10));
        server.expect(requestTo(URL_WA)).andRespond(withStatus(HttpStatus.FOUND).location(java.net.URI.create("http://169.254.169.254/")));

        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.WHATSAPP, "123")))
            .isInstanceOfSatisfying(AudioRechazadoException.class, e -> assertThat(e.motivo()).isEqualTo(Motivo.DESCARGA_FALLIDA));
    }

    @Test
    void instagramDescargaSinEnviarTokenYTomaElMimeDeLaRespuesta() {
        server.expect(requestTo(URL_IG)).andExpect(request -> assertThat(request.getHeaders().containsKey("Authorization")).isFalse())
            .andRespond(withSuccess(new byte[]{9}, org.springframework.http.MediaType.parseMediaType("audio/mp4")));

        AudioVoz a = descargador.descargar(cuenta, msg(Canal.INSTAGRAM, URL_IG));

        assertThat(a.mime()).isEqualTo("audio/mp4");
        verify(cuentas, never()).tokenDe(eq(cuenta));
        verify(graph, never()).mediaWhatsapp(any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "http://scontent.cdninstagram.com/a.mp4",               // sin TLS
        "https://169.254.169.254/latest/meta-data",              // metadatos de nube
        "https://localhost/a.mp4",
        "https://127.0.0.1/a.mp4",
        "https://evil.com/a.mp4",
        "https://fbcdn.net.evil.com/a.mp4",                      // sufijo falso
        "https://evilfbcdn.net/a.mp4",                           // sin punto separador
        "https://scontent.fbcdn.net@evil.com/a.mp4",             // credenciales en la URL
        "https://scontent.fbcdn.net:8443/a.mp4",                 // puerto raro
        "https://scontent.fbcdn.net\\@evil.com/a.mp4",           // barra invertida
        "file:///etc/passwd",
        "ftp://scontent.fbcdn.net/a.mp4",
        "//scontent.fbcdn.net/a.mp4",
        ""})
    void instagramMessengerUrlsFueraDeLaListaBlancaSeRechazanSinLlamadaDeRed(String url) {
        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.MESSENGER, url)))
            .isInstanceOf(AudioRechazadoException.class);
        server.verify();
    }

    @Test
    void sinMediaSeRechaza() {
        assertThatThrownBy(() -> descargador.descargar(cuenta, msg(Canal.INSTAGRAM, null)))
            .isInstanceOfSatisfying(AudioRechazadoException.class, e -> assertThat(e.motivo()).isEqualTo(Motivo.SIN_MEDIA));
    }

    @Test
    void dominiosPermitidosIncluyenSubdominiosYElExacto() {
        assertThat(DescargadorAudio.dominioPermitido("fbcdn.net")).isTrue();
        assertThat(DescargadorAudio.dominioPermitido("scontent-mia3-1.xx.fbcdn.net")).isTrue();
        assertThat(DescargadorAudio.dominioPermitido("lookaside.fbsbx.com")).isTrue();
        assertThat(DescargadorAudio.dominioPermitido("facebook.com")).isFalse();
    }
}
