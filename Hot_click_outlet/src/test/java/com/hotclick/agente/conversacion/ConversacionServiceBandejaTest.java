package com.hotclick.agente.conversacion;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
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

/** Aislamiento entre negocios en las operaciones de bandeja. */
class ConversacionServiceBandejaTest {

    private ConversacionSesionRepository sesiones;
    private UsuarioRepository usuarios;
    private ConversacionService service;
    private ConversacionSesion sesion;

    @BeforeEach
    void init() {
        sesiones = mock(ConversacionSesionRepository.class);
        usuarios = mock(UsuarioRepository.class);
        service = new ConversacionService(sesiones, mock(ConversacionMensajeRepository.class), usuarios,
            new SelectorPerfil(null));
        sesion = new ConversacionSesion();
        sesion.setId(UUID.randomUUID());
        sesion.setEmpresaId(7L);
        sesion.setCanalCuentaId(10L);
        sesion.setContactoExterno("WAID-1");
        when(sesiones.findById(sesion.getId())).thenReturn(Optional.of(sesion));
        when(sesiones.save(any())).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    void pausarBotPasaAPersona() {
        assertThat(service.pausarBot(sesion.getId(), 7L).getModo()).isEqualTo(ModoConversacion.PERSONA);
    }

    @Test
    void otroNegocioNoPuedePausarCerrarNiAsignar() {
        assertThatThrownBy(() -> service.pausarBot(sesion.getId(), 8L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.cerrar(sesion.getId(), 8L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.tomar(sesion.getId(), 8L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.asignar(sesion.getId(), 8L, 1L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThat(sesion.getModo()).isEqualTo(ModoConversacion.BOT);
        assertThat(sesion.getEstado()).isEqualTo(EstadoConversacion.ABIERTA);
        verify(sesiones, never()).save(any());
    }

    @Test
    void asignarSoloAUsuarioDelMismoNegocio() {
        when(usuarios.esMiembroActivoDeEmpresa(50L, 7L)).thenReturn(true);
        when(usuarios.esMiembroActivoDeEmpresa(60L, 7L)).thenReturn(false); // usuario de otra empresa

        ConversacionSesion s = service.asignar(sesion.getId(), 7L, 50L);
        assertThat(s.getUsuarioAsignadoId()).isEqualTo(50L);
        assertThat(s.getModo()).isEqualTo(ModoConversacion.PERSONA);

        assertThatThrownBy(() -> service.asignar(sesion.getId(), 7L, 60L)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> service.tomar(sesion.getId(), 7L, null)).isInstanceOf(TenantAccessDeniedException.class);
        assertThat(sesion.getUsuarioAsignadoId()).isEqualTo(50L);
    }

    @Test
    void conversacionDeHotclickSoloSeAsignaAPersonalDePlataforma() {
        sesion.setEmpresaId(null);
        when(usuarios.esAdminActivo(1L)).thenReturn(true);
        assertThat(service.asignar(sesion.getId(), null, 1L).getUsuarioAsignadoId()).isEqualTo(1L);
        // un negocio no ve conversaciones de HotClick
        assertThatThrownBy(() -> service.pausarBot(sesion.getId(), 7L)).isInstanceOf(RecursoNoEncontradoException.class);
        // un comprador (sin rol ADMIN) no se puede asignar
        assertThatThrownBy(() -> service.asignar(sesion.getId(), null, 2L)).isInstanceOf(TenantAccessDeniedException.class);
    }

    @Test
    void reanudarDevuelveAlBotYLibera() {
        when(usuarios.esMiembroActivoDeEmpresa(50L, 7L)).thenReturn(true);
        service.tomar(sesion.getId(), 7L, 50L);
        ConversacionSesion s = service.reanudarBot(sesion.getId(), 7L);
        assertThat(s.getModo()).isEqualTo(ModoConversacion.BOT);
        assertThat(s.getUsuarioAsignadoId()).isNull();
    }

    @Test
    void cerrarMarcaCerrada() {
        assertThat(service.cerrar(sesion.getId(), 7L).getEstado()).isEqualTo(EstadoConversacion.CERRADA);
    }

    @Test
    void sesionInexistenteOSinCuentaEsNoEncontrada() {
        assertThatThrownBy(() -> service.cerrar(UUID.randomUUID(), 7L)).isInstanceOf(RecursoNoEncontradoException.class);
        sesion.setCanalCuentaId(null); // sesión del asistente web: no es de la bandeja
        assertThatThrownBy(() -> service.cerrar(sesion.getId(), 7L)).isInstanceOf(RecursoNoEncontradoException.class);
    }
}
