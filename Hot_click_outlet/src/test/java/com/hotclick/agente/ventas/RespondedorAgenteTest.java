package com.hotclick.agente.ventas;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.panel.AgenteConfigDto;
import com.hotclick.agente.panel.AgenteConfigService;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.PerfilAgente;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.motor.TurnoConversacion;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class RespondedorAgenteTest {

    private MotorAgente motor;
    private CanalMensajeria canal;
    private ConversacionService conversaciones;
    private RespondedorAgente respondedor;
    private AgenteConfigService config;
    private static final AgenteConfigDto CFG = new AgenteConfigDto("Tina", "USTED", false, true, false,
        List.of(), "Estamos fuera de horario.", AgenteConfigDto.ZONA);
    private final CanalCuenta cuenta = new CanalCuenta();
    private final UUID sesion = UUID.randomUUID();

    @BeforeEach
    void init() {
        motor = mock(MotorAgente.class);
        canal = mock(CanalMensajeria.class);
        conversaciones = mock(ConversacionService.class);
        config = mock(AgenteConfigService.class);
        when(config.obtener(any())).thenReturn(CFG);
        when(config.tonoDe(any())).thenReturn(CFG.tono());
        when(config.mensajeFueraHorario(any())).thenReturn(CFG.mensajeFueraHorario());
        respondedor = new RespondedorAgente(motor, canal, conversaciones, config);
    }

    private ConversacionActiva conv(PerfilConversacion perfil, Long empresaId) {
        Instant t = Instant.now();
        return new ConversacionActiva(sesion, perfil, empresaId, cuenta, "WAID-1", null, ModoConversacion.BOT, t,
            List.of(new ConversacionActiva.Turno("user", "hola", t),
                    new ConversacionActiva.Turno("assistant", "buenas", t),
                    new ConversacionActiva.Turno("user", "precio del bolso?", t)));
    }

    private static MensajeEntrante msg(String texto) {
        return new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "c1", "WAID-1", null, "wamid.1", "text", texto,
            null, 1L);
    }

    private static ResultadoAgente resultado(String texto, List<AccionAgente> acciones) {
        return new ResultadoAgente(texto, acciones, null, 0, "m", MotivoFin.COMPLETO, 1);
    }

    @Test
    @SuppressWarnings("unchecked")
    void respuestaNormalSeEnviaYSeGuarda() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Cuesta 15.000", List.of()));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("precio del bolso?"));

        ArgumentCaptor<List<TurnoConversacion>> historial = ArgumentCaptor.forClass(List.class);
        verify(motor).ejecutar(eq(PerfilAgente.NEGOCIO_VENTAS), any(), historial.capture(), eq("precio del bolso?"), any());
        // El mensaje actual no se duplica en el historial.
        assertThat(historial.getValue()).containsExactly(
            TurnoConversacion.usuario("hola"), TurnoConversacion.asistente("buenas"));
        verify(canal).enviarTexto(cuenta, "WAID-1", "Cuesta 15.000");
        verify(conversaciones).registrarSalienteBot(sesion, 7L, "Cuesta 15.000");
        verify(conversaciones, never()).pausarBot(any(), any());
    }

    @Test
    void traspasoAPersonaPausaElBotYResponde() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any()))
            .thenReturn(resultado("", List.of(AccionAgente.pasarAPersona("reclamo"))));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("quiero un reclamo"));

        verify(canal).enviarTexto(cuenta, "WAID-1", RespondedorAgente.TEXTO_TRASPASO);
        verify(conversaciones).registrarSalienteBot(sesion, 7L, RespondedorAgente.TEXTO_TRASPASO);
        verify(conversaciones).pausarBot(sesion, 7L);
    }

    @Test
    void traspasoConservaElTextoDelMotorSiLoHay() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any()))
            .thenReturn(resultado("Le paso con una persona", List.of(AccionAgente.pasarAPersona("x"))));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("ayuda"));

        verify(canal).enviarTexto(cuenta, "WAID-1", "Le paso con una persona");
        verify(conversaciones).pausarBot(sesion, 7L);
    }

    @Test
    void sinEmpresaYPerfilQueLaRequiereNoResponde() {
        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, null), msg("hola"));

        verifyNoInteractions(motor, canal, conversaciones);
    }

    @Test
    void botonRealConTituloVisibleUsaElIdDelBoton() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Listo", List.of()));
        MensajeEntrante boton = new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "c1", "WAID-1", null, "wamid.2",
            "interactive", "Comprar", null, 1L, "comprar:42");

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), boton);

        verify(motor).ejecutar(eq(PerfilAgente.NEGOCIO_VENTAS), any(), any(), eq("quiero comprar el producto 42"), any());
    }

    @Test
    void botonComprarSeConvierteEnEntradaParaElMotor() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Listo", List.of()));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("comprar:42"));

        verify(motor).ejecutar(eq(PerfilAgente.NEGOCIO_VENTAS), any(), any(), eq("quiero comprar el producto 42"), any());
    }

    @Test
    void botonHablarConPersonaTraspasaSinLlamarAlMotor() {
        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("persona"));

        verifyNoInteractions(motor);
        verify(canal).enviarTexto(cuenta, "WAID-1", RespondedorAgente.TEXTO_TRASPASO);
        verify(conversaciones).pausarBot(sesion, 7L);
    }

    @Test
    void tituloDelBotonHablarConPersonaTambienTraspasa() {
        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("Hablar con persona"));

        verifyNoInteractions(motor);
        verify(conversaciones).pausarBot(sesion, 7L);
    }

    @Test
    void contextoLlevaCanalYSesion() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Hola", List.of()));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("hola"));

        ArgumentCaptor<com.hotclick.agente.motor.ContextoHerramienta> c =
            ArgumentCaptor.forClass(com.hotclick.agente.motor.ContextoHerramienta.class);
        verify(motor).ejecutar(any(), c.capture(), any(), anyString(), any());
        assertThat(c.getValue().canal()).isEqualTo(MensajeEntrante.Canal.WHATSAPP);
        assertThat(c.getValue().sesionId()).isEqualTo(sesion);
    }

    @Test
    void enlaceCreadoSeAgregaSiElTextoNoLoTrae() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Aquí está su compra",
            List.of(new AccionAgente(AccionAgente.Tipo.ENLACE_CREADO, "https://x/c/abc"))));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("sí, comprar"));

        verify(canal).enviarTexto(cuenta, "WAID-1", "Aquí está su compra\nhttps://x/c/abc");
    }

    @Test
    void perfilHotclickSinEmpresaSiResponde() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Hola", List.of()));

        respondedor.responder(conv(PerfilConversacion.HOTCLICK, null), msg("hola"));

        verify(canal).enviarTexto(cuenta, "WAID-1", "Hola");
    }

    @Test
    void fueraDeHorarioElTraspasoRespondeElMensajeFueraDeHorario() {
        when(config.fueraDeHorario(any(), any())).thenReturn(true);
        when(motor.ejecutar(any(), any(), any(), anyString(), any()))
            .thenReturn(resultado("Le paso con una persona", List.of(AccionAgente.pasarAPersona("x"))));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("ayuda"));

        verify(canal).enviarTexto(cuenta, "WAID-1", "Estamos fuera de horario.");
        verify(conversaciones).pausarBot(sesion, 7L);
    }

    @Test
    void fueraDeHorarioElBotSigueVendiendoSinTraspaso() {
        when(config.fueraDeHorario(any(), any())).thenReturn(true);
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Cuesta 15.000", List.of()));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("precio?"));

        verify(canal).enviarTexto(cuenta, "WAID-1", "Cuesta 15.000");
        verify(conversaciones, never()).pausarBot(any(), any());
    }

    @Test
    void botDesactivadoPorElNegocioNoResponde() {
        when(config.obtener(any())).thenReturn(new AgenteConfigDto("Tina", "USTED", false, false, false,
            List.of(), null, AgenteConfigDto.ZONA));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("hola"));

        verifyNoInteractions(motor, canal);
    }

    @Test
    void elMotorRecibeElTonoDelNegocio() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Hola", List.of()));

        respondedor.responder(conv(PerfilConversacion.NEGOCIO_VENTAS, 7L), msg("hola"));

        ArgumentCaptor<com.hotclick.agente.motor.OpcionesMotor> op =
            ArgumentCaptor.forClass(com.hotclick.agente.motor.OpcionesMotor.class);
        verify(motor).ejecutar(any(), any(), any(), anyString(), op.capture());
        assertThat(op.getValue().tono().nombreBot()).isEqualTo("Tina");
    }
}
