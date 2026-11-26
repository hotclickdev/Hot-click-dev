package com.hotclick.agente.voz;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TranscriptorOpenAiCompatibleTest {

    private static final String CLAVE = "k-" + "test" + "-1";
    private static final AudioVoz AUDIO = new AudioVoz("abc".getBytes(StandardCharsets.UTF_8), "audio/ogg");

    private HttpServer server;
    private String base;
    private int status;
    private String cuerpo;
    private long demoraMs;
    private final AtomicReference<String> auth = new AtomicReference<>();
    private final AtomicReference<String> pedido = new AtomicReference<>();
    private final AtomicReference<String> ruta = new AtomicReference<>();

    @BeforeEach
    void init() throws IOException {
        status = 200;
        cuerpo = "{\"text\":\"hola mundo\",\"duration\":3.2}";
        demoraMs = 0;
        server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
        server.createContext("/", ex -> {
            auth.set(ex.getRequestHeaders().getFirst("Authorization"));
            ruta.set(ex.getRequestURI().getPath());
            ByteArrayOutputStream in = new ByteArrayOutputStream();
            ex.getRequestBody().transferTo(in);
            pedido.set(in.toString(StandardCharsets.ISO_8859_1));
            try {
                if (demoraMs > 0) Thread.sleep(demoraMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            byte[] b = cuerpo.getBytes(StandardCharsets.UTF_8);
            try {
                ex.getResponseHeaders().add("Content-Type", "application/json");
                ex.sendResponseHeaders(status, b.length);
                ex.getResponseBody().write(b);
            } catch (IOException ignorado) {
                // el cliente ya cortó (prueba de timeout)
            } finally {
                ex.close();
            }
        });
        server.start();
        base = "http://127.0.0.1:" + server.getAddress().getPort() + "/openai/v1";
    }

    @AfterEach
    void fin() {
        server.stop(0);
    }

    private TranscriptorOpenAiCompatible nuevo(String clave, int timeoutSeg, int maxSeg) {
        VozConfig cfg = new VozConfig(16_777_216, maxSeg, timeoutSeg, 0);
        return new TranscriptorOpenAiCompatible(cfg, base, clave, "mod-x");
    }

    @Test
    void exito() {
        var r = nuevo(CLAVE, 5, 120).transcribir(AUDIO);
        assertThat(r.texto()).isEqualTo("hola mundo");
        assertThat(r.segundos()).isEqualTo(4); // 3.2 s redondea hacia arriba
        assertThat(ruta.get()).isEqualTo("/openai/v1/audio/transcriptions");
        assertThat(auth.get()).isEqualTo("Bearer " + CLAVE);
        assertThat(pedido.get()).contains("name=\"model\"", "mod-x", "verbose_json", "name=\"file\"", "audio.ogg");
    }

    @Test
    void erroresHttpSeConvierten() {
        for (int s : new int[]{401, 429, 500}) {
            status = s;
            cuerpo = "{\"error\":\"detalle-secreto " + CLAVE + "\"}";
            assertThatThrownBy(() -> nuevo(CLAVE, 5, 120).transcribir(AUDIO))
                .isInstanceOf(TranscripcionException.class)
                .hasMessageContaining(String.valueOf(s))
                .hasMessageNotContaining(CLAVE)
                .hasMessageNotContaining("detalle-secreto");
        }
    }

    @Test
    void redireccionNoSeSigue() {
        status = 302;
        cuerpo = "";
        assertThatThrownBy(() -> nuevo(CLAVE, 5, 120).transcribir(AUDIO))
            .isInstanceOf(TranscripcionException.class);
    }

    @Test
    void timeout() {
        demoraMs = 2500;
        assertThatThrownBy(() -> nuevo(CLAVE, 1, 120).transcribir(AUDIO))
            .isInstanceOf(TranscripcionException.class)
            .hasMessageNotContaining(CLAVE)
            .hasMessageNotContaining("127.0.0.1");
    }

    @Test
    void duracionMayorAlMaximo() {
        cuerpo = "{\"text\":\"largo\",\"duration\":61}";
        assertThatThrownBy(() -> nuevo(CLAVE, 5, 60).transcribir(AUDIO))
            .isInstanceOf(TranscripcionException.class)
            .hasMessageNotContaining("largo");
    }

    @Test
    void jsonRoto() {
        cuerpo = "{no es json";
        assertThatThrownBy(() -> nuevo(CLAVE, 5, 120).transcribir(AUDIO))
            .isInstanceOf(TranscripcionException.class);
    }

    @Test
    void respuestaSinDuracionOSinTexto() {
        cuerpo = "{\"text\":\"hola\"}";
        assertThatThrownBy(() -> nuevo(CLAVE, 5, 120).transcribir(AUDIO)).isInstanceOf(TranscripcionException.class);
        cuerpo = "{\"duration\":2}";
        assertThatThrownBy(() -> nuevo(CLAVE, 5, 120).transcribir(AUDIO)).isInstanceOf(TranscripcionException.class);
    }

    @Test
    void sinClaveEstaDeshabilitado() {
        var t = nuevo("  ", 5, 120);
        assertThat(t.habilitado()).isFalse();
        assertThatThrownBy(() -> t.transcribir(AUDIO)).isInstanceOf(TranscripcionException.class);
        assertThat(pedido.get()).isNull();
    }

    @Test
    void baseHttpNoLocalSeRechaza() {
        VozConfig cfg = new VozConfig(16_777_216, 120, 5, 0);
        var t = new TranscriptorOpenAiCompatible(cfg, "http://ejemplo.com/v1", CLAVE, "m");
        assertThat(t.habilitado()).isFalse();
        assertThatThrownBy(() -> TranscriptorOpenAiCompatible.endpointDe("http://ejemplo.com/v1"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> TranscriptorOpenAiCompatible.endpointDe("ftp://ejemplo.com/v1"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> TranscriptorOpenAiCompatible.endpointDe("https://u:p@ejemplo.com/v1"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void baseHttpsYLocalSeAceptan() {
        assertThat(TranscriptorOpenAiCompatible.endpointDe("https://api.groq.com/openai/v1/").toString())
            .isEqualTo("https://api.groq.com/openai/v1/audio/transcriptions");
        assertThat(TranscriptorOpenAiCompatible.endpointDe("http://localhost:8000/v1").toString())
            .isEqualTo("http://localhost:8000/v1/audio/transcriptions");
        assertThat(TranscriptorOpenAiCompatible.endpointDe("http://127.0.0.1:8000/v1")).isNotNull();
    }

    private final ApplicationContextRunner contexto = new ApplicationContextRunner()
        .withUserConfiguration(VozConfig.class, TranscriptorOpenAiCompatible.class, TranscriptorDeshabilitado.class);

    @Test
    void contextoEligeElBeanSegunLaPropiedad() {
        contexto.withPropertyValues("agente.voz.proveedor=openai-compatible", "agente.voz.api-key=" + CLAVE)
            .run(c -> {
                assertThat(c).hasSingleBean(TranscriptorVoz.class);
                assertThat(c).hasSingleBean(TranscriptorOpenAiCompatible.class);
                assertThat(c.getBean(TranscriptorVoz.class).habilitado()).isTrue();
            });
        contexto.run(c -> {
            assertThat(c).hasSingleBean(TranscriptorVoz.class);
            assertThat(c).hasSingleBean(TranscriptorDeshabilitado.class);
        });
    }
}
