package com.hotclick.agente.ventas;

import com.hotclick.agente.canal.CanalCuenta;
import com.hotclick.agente.canal.CanalMensajeria;
import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ModoConversacion;
import com.hotclick.agente.conversacion.PerfilConversacion;
import com.hotclick.agente.idioma.Idioma;
import com.hotclick.agente.motor.AccionAgente;
import com.hotclick.agente.motor.MotivoFin;
import com.hotclick.agente.motor.MotorAgente;
import com.hotclick.agente.motor.OpcionesMotor;
import com.hotclick.agente.motor.ResultadoAgente;
import com.hotclick.agente.panel.AgenteConfigDto;
import com.hotclick.agente.panel.AgenteConfigService;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("AG-39: el respondedor detecta el idioma y lo pasa al motor")
class RespondedorAgenteIdiomaTest {

    private static final AgenteConfigDto CFG = new AgenteConfigDto("Tina", "USTED", false, true, false,
        List.of(), "Estamos fuera de horario.", AgenteConfigDto.ZONA);

    private MotorAgente motor;
    private CanalMensajeria canal;
    private ConversacionService conversaciones;
    private RespondedorAgente respondedor;
    private final CanalCuenta cuenta = new CanalCuenta();
    private final UUID sesion = UUID.randomUUID();

    @BeforeEach
    void init() {
        motor = mock(MotorAgente.class);
        canal = mock(CanalMensajeria.class);
        conversaciones = mock(ConversacionService.class);
        AgenteConfigService config = mock(AgenteConfigService.class);
        when(config.obtener(any())).thenReturn(CFG);
        when(config.tonoDe(any())).thenReturn(CFG.tono());
        when(config.mensajeFueraHorario(any())).thenReturn(CFG.mensajeFueraHorario());
        respondedor = new RespondedorAgente(motor, canal, conversaciones, config);
    }

    private ConversacionActiva conv(String... clientes) {
        Instant t = Instant.now();
        List<ConversacionActiva.Turno> turnos = new java.util.ArrayList<>();
        for (String c : clientes) turnos.add(new ConversacionActiva.Turno("user", c, t));
        return new ConversacionActiva(sesion, PerfilConversacion.NEGOCIO_VENTAS, 7L, cuenta, "WAID-1", null,
            ModoConversacion.BOT, t, turnos);
    }

    private static MensajeEntrante msg(String texto) {
        return new MensajeEntrante(MensajeEntrante.Canal.WHATSAPP, "c1", "WAID-1", null, "wamid.1", "text", texto,
            null, 1L);
    }

    private static ResultadoAgente resultado(String texto, List<AccionAgente> acciones) {
        return new ResultadoAgente(texto, acciones, null, 0, "m", MotivoFin.COMPLETO, 1);
    }

    @Test
    @DisplayName("un turista que escribe en inglés recibe opciones con idioma EN")
    void inglesSePasaAlMotor() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("It costs 15.000 colones", List.of()));

        respondedor.responder(conv("Hello, how much is the blue bag?"), msg("Hello, how much is the blue bag?"));

        ArgumentCaptor<OpcionesMotor> op = ArgumentCaptor.forClass(OpcionesMotor.class);
        verify(motor).ejecutar(any(), any(), any(), anyString(), op.capture());
        assertThat(op.getValue().idioma()).isEqualTo(Idioma.EN);
    }

    @Test
    @DisplayName("un mensaje sin pistas ('ok') mantiene el idioma de los mensajes anteriores")
    void mensajeCortoMantieneElIdioma() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any())).thenReturn(resultado("Sure", List.of()));

        respondedor.responder(conv("Hello, do you ship to Liberia please?", "ok"), msg("ok"));

        ArgumentCaptor<OpcionesMotor> op = ArgumentCaptor.forClass(OpcionesMotor.class);
        verify(motor).ejecutar(any(), any(), any(), anyString(), op.capture());
        assertThat(op.getValue().idioma()).isEqualTo(Idioma.EN);
    }

    @Test
    @DisplayName("el traspaso fijo sale en inglés para un cliente en inglés y en español de siempre para uno en español")
    void traspasoFijoPorIdioma() {
        when(motor.ejecutar(any(), any(), any(), anyString(), any()))
            .thenReturn(resultado("", List.of(AccionAgente.pasarAPersona("x"))));

        respondedor.responder(conv("I want to talk to a person please"), msg("I want to talk to a person please"));
        verify(canal).enviarTexto(cuenta, "WAID-1", RespondedorAgente.textoTraspaso(Idioma.EN));
        assertThat(RespondedorAgente.textoTraspaso(Idioma.EN)).contains("team will continue");

        assertThat(RespondedorAgente.textoTraspaso(Idioma.ES)).isEqualTo(RespondedorAgente.TEXTO_TRASPASO);
        assertThat(RespondedorAgente.textoTraspaso(null)).isEqualTo(RespondedorAgente.TEXTO_TRASPASO);
    }
}
