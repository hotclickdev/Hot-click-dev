package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmpresaAdminService — cambio de estado desde admin")
class EmpresaAdminServiceTest {

    @Mock EmpresaRepository empresaRepository;
    @Mock EmpresaAprobacionService empresaAprobacionService;
    @Mock AuditoriaAdminRegistroService auditoriaAdminRegistroService;

    @InjectMocks EmpresaAdminService service;

    @Test
    @DisplayName("ACTIVO delega en aprobarYPublicar, no solo pisa el string")
    void activoLlamaAprobarYPublicar() {
        Empresa e = empresa(8L, "INACTIVO");
        when(empresaRepository.findById(8L)).thenReturn(Optional.of(e));

        service.cambiarEstado(8L, "ACTIVO");

        verify(empresaAprobacionService).aprobarYPublicar(8L);
        verify(empresaRepository, never()).save(e);
    }

    @Test
    @DisplayName("INACTIVO persiste el estado y apaga el catálogo")
    void inactivoSoloGuardaEstado() {
        Empresa e = empresa(3L, "ACTIVO");
        e.setVisibilidadPublica(true);
        when(empresaRepository.findById(3L)).thenReturn(Optional.of(e));

        service.cambiarEstado(3L, "INACTIVO", "cierre pedido por el operador");

        assertThat(e.getEstadoEmpresa()).isEqualTo("INACTIVO");
        assertThat(e.getVisibilidadPublica()).isFalse();
        verify(empresaRepository).save(e);
        verify(empresaAprobacionService, never()).aprobarYPublicar(3L);
    }

    @Test
    @DisplayName("SUSPENDIDO apaga visibilidad_publica junto con la cuenta")
    void suspendidoApagaCatalogo() {
        Empresa e = empresa(4L, "ACTIVO");
        e.setVisibilidadPublica(true);
        when(empresaRepository.findById(4L)).thenReturn(Optional.of(e));

        service.cambiarEstado(4L, "SUSPENDIDO", "incumple el catalogo");

        assertThat(e.getEstadoEmpresa()).isEqualTo("SUSPENDIDO");
        assertThat(e.getVisibilidadPublica()).isFalse();
        verify(empresaRepository).save(e);
        verify(empresaAprobacionService, never()).aprobarYPublicar(4L);
        verify(auditoriaAdminRegistroService).registrarSiAdmin(
            eq("EMPRESA_CAMBIO_ESTADO"), eq("EMPRESA"), eq(4L), eq(4L), contains("incumple"));
    }

    @Test
    @DisplayName("suspender sin motivo no toca la empresa")
    void suspenderSinMotivoRechaza() {
        assertThatThrownBy(() -> service.cambiarEstado(4L, "SUSPENDIDO"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Motivo");
        verify(empresaRepository, never()).findById(4L);
    }

    @Test
    @DisplayName("estado desconocido no toca la empresa")
    void estadoInvalidoRechaza() {
        assertThatThrownBy(() -> service.cambiarEstado(1L, "PENDIENTE_APROBACION"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Estado inválido");
        verify(empresaRepository, never()).findById(1L);
    }

    @Test
    @DisplayName("empresa inexistente no llega a aprobar")
    void empresaAusente() {
        when(empresaRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.cambiarEstado(99L, "SUSPENDIDO", "no existe"))
            .isInstanceOf(RecursoNoEncontradoException.class);
        verify(empresaAprobacionService, never()).aprobarYPublicar(99L);
    }

    private static Empresa empresa(long id, String estado) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setEstadoEmpresa(estado);
        return e;
    }
}
