package com.hotclick.agente.voz;

import com.hotclick.agente.conversacion.ConversacionMensaje;
import com.hotclick.agente.conversacion.ConversacionMensajeRepository;
import com.hotclick.agente.conversacion.ConversacionService;
import com.hotclick.agente.conversacion.ConversacionSesion;
import com.hotclick.agente.conversacion.ConversacionSesionRepository;
import com.hotclick.agente.conversacion.SelectorPerfil;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Marcado de la transcripción en el historial de la conversación (AG-13). */
class MarcaVozHistorialTest {

    private ConversacionSesion sesion;
    private ConversacionMensajeRepository mensajes;
    private ConversacionService service;

    @BeforeEach
    void init() {
        ConversacionSesionRepository sesiones = mock(ConversacionSesionRepository.class);
        mensajes = mock(ConversacionMensajeRepository.class);
        service = new ConversacionService(sesiones, mensajes, mock(UsuarioRepository.class), new SelectorPerfil(null));
        sesion = new ConversacionSesion();
        sesion.setId(UUID.randomUUID());
        sesion.setEmpresaId(7L);
        sesion.setCanalCuentaId(10L);
        when(sesiones.findById(sesion.getId())).thenReturn(Optional.of(sesion));
    }

    private static ConversacionMensaje mensaje(String contenido) {
        ConversacionMensaje m = new ConversacionMensaje();
        m.setContenido(contenido);
        return m;
    }

    @Test
    void marcaElAudioConLaTranscripcion() {
        ConversacionMensaje m = mensaje("[audio]");
        when(mensajes.findFirstBySesionIdAndRolOrderByIdDesc(sesion.getId(), ConversacionMensaje.ROL_CLIENTE))
            .thenReturn(Optional.of(m));

        service.marcarTranscripcionVoz(sesion.getId(), 7L, "quiero comprar");

        assertThat(m.getContenido()).isEqualTo("[voz] quiero comprar");
        verify(mensajes).save(m);
    }

    @Test
    void noPisaUnMensajeQueYaNoEsElMarcador() {
        ConversacionMensaje m = mensaje("otro mensaje posterior");
        when(mensajes.findFirstBySesionIdAndRolOrderByIdDesc(sesion.getId(), ConversacionMensaje.ROL_CLIENTE))
            .thenReturn(Optional.of(m));

        service.marcarTranscripcionVoz(sesion.getId(), 7L, "x");

        assertThat(m.getContenido()).isEqualTo("otro mensaje posterior");
        verify(mensajes, never()).save(any());
    }

    @Test
    void conversacionDeOtraEmpresaNoSeMarca() {
        assertThatThrownBy(() -> service.marcarTranscripcionVoz(sesion.getId(), 99L, "x"))
            .isInstanceOf(RecursoNoEncontradoException.class);
        verify(mensajes, never()).save(any());
    }
}
