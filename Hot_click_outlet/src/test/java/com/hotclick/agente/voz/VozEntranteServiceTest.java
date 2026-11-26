package com.hotclick.agente.voz;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.conversacion.RespondedorDespacho;
import com.hotclick.agente.conversacion.spi.AgenteRespondedor;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.idioma.TextosFijos;
import com.hotclick.agente.motor.CostoAgenteListener;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.mock.env.MockEnvironment;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class VozEntranteServiceTest {

    private TranscriptorVoz transcriptor;
    private DescargadorAudio descargador;
    private CanalMensajeria canal;
    private ConversacionService conversaciones;
    private CostoAgenteListener costo;
    private VozEntranteService servicio;
    private ConversacionActiva conv;
    private final MensajeEntrante audio =
        new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "c", "r", null, "wamid-12345678", "audio", null, "55", 0);

    @SuppressWarnings("unchecked")
    @BeforeEach
    void init() {
        transcriptor = mock(TranscriptorVoz.class);
        when(transcriptor.habilitado()).thenReturn(true);
        descargador = mock(DescargadorAudio.class);
        canal = mock(CanalMensajeria.class);
        conversaciones = mock(ConversacionService.class);
        costo = mock(CostoAgenteListener.class);
        ObjectProvider<TranscriptorVoz> tp = mock(ObjectProvider.class);
        when(tp.getIfAvailable()).thenReturn(transcriptor);
        ObjectProvider<CostoAgenteListener> cp = mock(ObjectProvider.class);
        when(cp.orderedStream()).thenAnswer(i -> Stream.of(costo));
        servicio = new VozEntranteService(tp, descargador, canal, conversaciones, new VozConfig(1024, 60, 20, 0.006), cp);
        conv = new ConversacionActiva(UUID.randomUUID(), PerfilConversacion.NEGOCIO_VENTAS, 7L, new CanalCuenta(),
            "contacto", null, ModoConversacion.BOT, Instant.now(), List.of());
        when(descargador.descargar(any(), any())).thenReturn(new AudioVoz(new byte[]{1}, "audio/ogg"));
    }

    @Test
    void transcribeMarcaElHistorialYDevuelveElMensajeConTexto() {
        when(transcriptor.transcribir(any())).thenReturn(new ResultadoVoz(" quiero unos zapatos ", 30));

        MensajeEntrante out = servicio.procesar(conv, audio);

        assertThat(out.texto()).isEqualTo("quiero unos zapatos");
        assertThat(out.tipo()).isEqualTo("audio");
        assertThat(out.mediaId()).isEqualTo("55");
        verify(conversaciones).marcarTranscripcionVoz(conv.sesionId(), 7L, "quiero unos zapatos");
        verify(canal, never()).enviarTexto(any(), anyString(), anyString());
        // 30 s a 0.006 USD/min = 0.003 USD contra el tope del negocio
        verify(costo).costo(eq(7L), org.mockito.ArgumentMatchers.doubleThat(d -> Math.abs(d - 0.003) < 1e-9));
    }

    @Test
    void sinProveedorPideQueEscribanYNoDescarga() {
        when(transcriptor.habilitado()).thenReturn(false);

        assertThat(servicio.procesar(conv, audio)).isNull();

        verify(canal).enviarTexto(conv.cuenta(), "contacto", TextosFijos.vozDeshabilitada(Idioma.ES));
        verify(conversaciones).registrarSalienteBot(conv.sesionId(), 7L, TextosFijos.vozDeshabilitada(Idioma.ES));
        verify(descargador, never()).descargar(any(), any());
    }

    @Test
    void falloDelProveedorRespondeConRespaldo() {
        when(transcriptor.transcribir(any())).thenThrow(new TranscripcionException("boom"));

        assertThat(servicio.procesar(conv, audio)).isNull();

        verify(canal).enviarTexto(conv.cuenta(), "contacto", TextosFijos.vozFallo(Idioma.ES));
        verify(conversaciones, never()).marcarTranscripcionVoz(any(), any(), any());
    }

    @Test
    void audioRechazadoPorTamanoPideResumir() {
        when(descargador.descargar(any(), any()))
            .thenThrow(new AudioRechazadoException(AudioRechazadoException.Motivo.DEMASIADO_GRANDE));

        assertThat(servicio.procesar(conv, audio)).isNull();

        verify(canal).enviarTexto(conv.cuenta(), "contacto", TextosFijos.vozLarga(Idioma.ES));
        verify(transcriptor, never()).transcribir(any());
    }

    @Test
    void audioRechazadoPorOtraRazonUsaElRespaldoGeneral() {
        when(descargador.descargar(any(), any()))
            .thenThrow(new AudioRechazadoException(AudioRechazadoException.Motivo.URL_NO_PERMITIDA));

        assertThat(servicio.procesar(conv, audio)).isNull();

        verify(canal).enviarTexto(conv.cuenta(), "contacto", TextosFijos.vozFallo(Idioma.ES));
    }

    @Test
    void duracionSobreElLimiteSeDescartaPeroElCostoSeCuenta() {
        when(transcriptor.transcribir(any())).thenReturn(new ResultadoVoz("hola", 61));

        assertThat(servicio.procesar(conv, audio)).isNull();

        verify(canal).enviarTexto(conv.cuenta(), "contacto", TextosFijos.vozLarga(Idioma.ES));
        verify(costo).costo(eq(7L), anyDouble());
        verify(conversaciones, never()).marcarTranscripcionVoz(any(), any(), any());
    }

    @Test
    void transcripcionVaciaUsaElRespaldo() {
        when(transcriptor.transcribir(any())).thenReturn(new ResultadoVoz("   ", 5));

        assertThat(servicio.procesar(conv, audio)).isNull();

        verify(canal).enviarTexto(conv.cuenta(), "contacto", TextosFijos.vozFallo(Idioma.ES));
    }

    @Test
    void siElCanalFallaAlResponderNoSePropagaLaExcepcion() {
        when(transcriptor.transcribir(any())).thenThrow(new TranscripcionException("x"));
        when(canal.enviarTexto(any(), anyString(), anyString())).thenThrow(new IllegalStateException("red"));

        assertThat(servicio.procesar(conv, audio)).isNull();
    }

    @Test
    void sinCostoConfiguradoNoSeLlamaAlListener() {
        @SuppressWarnings("unchecked")
        ObjectProvider<TranscriptorVoz> tp = mock(ObjectProvider.class);
        when(tp.getIfAvailable()).thenReturn(transcriptor);
        @SuppressWarnings("unchecked")
        ObjectProvider<CostoAgenteListener> cp = mock(ObjectProvider.class);
        when(cp.orderedStream()).thenAnswer(i -> Stream.of(costo));
        VozEntranteService s = new VozEntranteService(tp, descargador, canal, conversaciones, new VozConfig(1024, 60, 20, 0), cp);
        when(transcriptor.transcribir(any())).thenReturn(new ResultadoVoz("hola", 10));

        assertThat(s.procesar(conv, audio)).isNotNull();

        verify(costo, never()).costo(any(), anyDouble());
    }

    @Test
    void respaldoSaleEnElIdiomaDeLaConversacion() {
        when(transcriptor.transcribir(any())).thenThrow(new TranscripcionException("boom"));
        ConversacionActiva en = new ConversacionActiva(UUID.randomUUID(), PerfilConversacion.NEGOCIO_VENTAS, 7L,
            new CanalCuenta(), "contacto", null, ModoConversacion.BOT, Instant.now(),
            List.of(new ConversacionActiva.Turno("user", "Hello, how much is the shipping to my hotel?", Instant.now())));

        servicio.procesar(en, audio);

        verify(canal).enviarTexto(en.cuenta(), "contacto", TextosFijos.vozFallo(Idioma.EN));
    }

    @Test
    void respaldoDeDeshabilitadoYLargaSalenEnPortugues() {
        ConversacionActiva pt = new ConversacionActiva(UUID.randomUUID(), PerfilConversacion.NEGOCIO_VENTAS, 7L,
            new CanalCuenta(), "contacto", null, ModoConversacion.BOT, Instant.now(),
            List.of(new ConversacionActiva.Turno("user", "Ola, quanto custa o frete? Quero comprar", Instant.now())));
        when(transcriptor.habilitado()).thenReturn(false);
        servicio.procesar(pt, audio);
        verify(canal).enviarTexto(pt.cuenta(), "contacto", TextosFijos.vozDeshabilitada(Idioma.PT));

        when(transcriptor.habilitado()).thenReturn(true);
        when(descargador.descargar(any(), any()))
            .thenThrow(new AudioRechazadoException(AudioRechazadoException.Motivo.DEMASIADO_GRANDE));
        servicio.procesar(pt, audio);
        verify(canal).enviarTexto(pt.cuenta(), "contacto", TextosFijos.vozLarga(Idioma.PT));
    }

    // ── cableado ──────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    @Test
    void despachoUsaElTextoTranscritoYNoLlamaAlBotSiYaSeRespondio() {
        AgenteRespondedor respondedor = mock(AgenteRespondedor.class);
        ObjectProvider<AgenteRespondedor> rp = mock(ObjectProvider.class);
        when(rp.getIfAvailable()).thenReturn(respondedor);
        VozEntranteService voz = mock(VozEntranteService.class);
        ObjectProvider<VozEntranteService> vp = mock(ObjectProvider.class);
        when(vp.getIfAvailable()).thenReturn(voz);
        RespondedorDespacho despacho = new RespondedorDespacho(rp, null, vp);

        MensajeEntrante conTexto = new MensajeEntrante(audio.canal(), "c", "r", null, "m", "audio", "hola", "55", 0);
        when(voz.procesar(conv, audio)).thenReturn(conTexto);
        despacho.despachar(conv, audio);
        verify(respondedor).responder(conv, conTexto);

        MensajeEntrante otro = new MensajeEntrante(audio.canal(), "c", "r", null, "m2", "audio", null, "56", 0);
        when(voz.procesar(conv, otro)).thenReturn(null);
        despacho.despachar(conv, otro);
        verify(respondedor, never()).responder(conv, otro);
    }

    @SuppressWarnings("unchecked")
    @Test
    void despachoNoTocaMensajesDeTexto() {
        AgenteRespondedor respondedor = mock(AgenteRespondedor.class);
        ObjectProvider<AgenteRespondedor> rp = mock(ObjectProvider.class);
        when(rp.getIfAvailable()).thenReturn(respondedor);
        VozEntranteService voz = mock(VozEntranteService.class);
        ObjectProvider<VozEntranteService> vp = mock(ObjectProvider.class);
        when(vp.getIfAvailable()).thenReturn(voz);
        MensajeEntrante texto = new MensajeEntrante(audio.canal(), "c", "r", null, "m", "text", "hola", null, 0);

        new RespondedorDespacho(rp, null, vp).despachar(conv, texto);

        verify(voz, never()).procesar(any(), any());
        verify(respondedor).responder(conv, texto);
    }

    // ── selección por propiedad ───────────────────────────────────────────

    @Test
    void proveedorVacioRegistraElTranscriptorDeshabilitado() {
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext()) {
            ctx.setEnvironment(entorno(""));
            ctx.register(TranscriptorDeshabilitado.class);
            ctx.refresh();
            TranscriptorVoz t = ctx.getBean(TranscriptorVoz.class);
            assertThat(t.habilitado()).isFalse();
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> t.transcribir(new AudioVoz(new byte[0], "audio/ogg")))
                .isInstanceOf(TranscripcionException.class);
        }
    }

    @Test
    void proveedorConfiguradoDesactivaElTranscriptorDeshabilitado() {
        try (AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext()) {
            ctx.setEnvironment(entorno("whisper"));
            ctx.register(TranscriptorDeshabilitado.class);
            ctx.refresh();
            assertThat(ctx.getBeansOfType(TranscriptorVoz.class)).isEmpty();
        }
    }

    private static MockEnvironment entorno(String proveedor) {
        return new MockEnvironment().withProperty("agente.voz.proveedor", proveedor);
    }

    @Test
    void losRecordsNoImprimenContenido() {
        assertThat(new AudioVoz(new byte[]{1, 2}, "audio/ogg").toString()).doesNotContain("[B@").contains("2 bytes");
        assertThat(new ResultadoVoz("secreto del cliente", 4).toString()).doesNotContain("secreto");
        assertThat(new com.hotclick.agente.conexion.MetaGraphCliente.MediaWhatsapp("https://x.fbsbx.com/?t=abc", "audio/ogg", 1)
            .toString()).doesNotContain("fbsbx");
    }
}
