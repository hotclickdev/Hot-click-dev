package com.hotclick.agente.idioma;

import com.hotclick.agente.conversacion.ConversacionActiva;
import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class IdiomaConversacionTest {

    private final ConversacionMensajeRepository mensajes = mock(ConversacionMensajeRepository.class);
    private final ConversacionSesionRepository sesiones = mock(ConversacionSesionRepository.class);
    private final IdiomaConversacion idiomas = new IdiomaConversacion(mensajes, sesiones);

    private static ConversacionMensaje msg(String rol, String texto) {
        ConversacionMensaje m = mock(ConversacionMensaje.class);
        when(m.getRol()).thenReturn(rol);
        when(m.getContenido()).thenReturn(texto);
        return m;
    }

    @Test
    void deSesionUsaSoloLosMensajesDelCliente() {
        UUID id = UUID.randomUUID();
        List<ConversacionMensaje> lista = List.of(
            msg("assistant", "Hola, cuanto necesita, gracias, buenas, por favor"),
            msg(ConversacionMensaje.ROL_CLIENTE, "Hello, how much is the shipping to my hotel?"));
        when(mensajes.findTop20BySesionIdOrderByIdDesc(id)).thenReturn(lista);

        assertThat(idiomas.deSesion(id)).isEqualTo(Idioma.EN);
    }

    @Test
    void sinPistasOSinSesionEsEspanol() {
        UUID id = UUID.randomUUID();
        List<ConversacionMensaje> lista = List.of(msg(ConversacionMensaje.ROL_CLIENTE, "ok"));
        when(mensajes.findTop20BySesionIdOrderByIdDesc(id)).thenReturn(lista);

        assertThat(idiomas.deSesion(id)).isEqualTo(Idioma.ES);
        assertThat(idiomas.deSesion(null)).isEqualTo(Idioma.ES);
        assertThat(idiomas.deContacto(null, "x")).isEqualTo(Idioma.ES);
        assertThat(idiomas.deContacto(5L, "sin-sesion")).isEqualTo(Idioma.ES);
    }

    @Test
    void deContactoBuscaLaSesionMasRecienteYDetectaSuIdioma() {
        UUID id = UUID.randomUUID();
        ConversacionSesion s = mock(ConversacionSesion.class);
        when(s.getId()).thenReturn(id);
        when(sesiones.findFirstByCanalCuentaIdAndContactoExternoOrderByUltimoMensajeEnDesc(5L, "5068"))
            .thenReturn(Optional.of(s));
        List<ConversacionMensaje> lista = List.of(
            msg(ConversacionMensaje.ROL_CLIENTE, "Ola, quanto custa o frete? Quero comprar"));
        when(mensajes.findTop20BySesionIdOrderByIdDesc(id)).thenReturn(lista);

        assertThat(idiomas.deContacto(5L, "5068")).isEqualTo(Idioma.PT);
    }

    @Test
    void deHistorialLeeLosTurnosDelClienteDelMasRecienteAlMasAntiguo() {
        ConversacionActiva conv = new ConversacionActiva(UUID.randomUUID(), null, 7L, null, "c", null, null, Instant.now(),
            List.of(new ConversacionActiva.Turno("user", "Hello, how much is it?", Instant.now()),
                new ConversacionActiva.Turno("assistant", "Hola, buenas, con gusto, por favor", Instant.now()),
                new ConversacionActiva.Turno("user", "ok", Instant.now())));

        assertThat(IdiomaConversacion.deHistorial(conv)).isEqualTo(Idioma.EN);
        assertThat(IdiomaConversacion.deHistorial(null)).isEqualTo(Idioma.ES);
    }
}
