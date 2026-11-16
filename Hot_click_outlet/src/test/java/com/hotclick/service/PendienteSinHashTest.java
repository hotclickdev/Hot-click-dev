package com.hotclick.service;

import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/** Riesgos 15-nov: cuentas PENDIENTE sin hash se recuperan al reiniciar el alta; verify no filtra su estado. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("PENDIENTE sin hash: recuperación y mensaje unificado")
class PendienteSinHashTest {

    @Mock OtpService otpService;
    @Mock UsuarioService usuarioService;
    @InjectMocks EmailVerificationService service;

    private Usuario pendiente(String hash) {
        Usuario u = new Usuario();
        u.setId(7L);
        u.setCorreo("p@test.cr");
        u.setEstado(Constants.ESTADO_PENDIENTE);
        u.setContrasenaHash(hash);
        return u;
    }

    private Usuario alta(String hash) {
        Usuario u = new Usuario();
        u.setCorreo("p@test.cr");
        u.setContrasenaHash(hash);
        return u;
    }

    @Test
    @DisplayName("reiniciar alta de PENDIENTE sin hash guarda el hash nuevo, sigue PENDIENTE y manda OTP")
    void reinicioGuardaHash() {
        for (String vacio : new String[] {null, "", "  "}) {
            Usuario existente = pendiente(vacio);
            when(usuarioService.buscarPorCorreo("p@test.cr")).thenReturn(Optional.of(existente));

            service.iniciarRegistro(alta("$2a$nuevo"));

            assertThat(existente.getContrasenaHash()).isEqualTo("$2a$nuevo");
            assertThat(existente.getEstado()).isEqualTo(Constants.ESTADO_PENDIENTE);
        }
        verify(usuarioService, org.mockito.Mockito.times(3)).guardar(any());
        verify(otpService, org.mockito.Mockito.times(3)).enviarOtp(any(), org.mockito.ArgumentMatchers.eq(Constants.OTP_TIPO_REGISTRO));
        verify(usuarioService, never()).activarUsuario(any());
    }

    @Test
    @DisplayName("tras guardar el hash, verify ya no rechaza la cuenta (sigue el flujo OTP)")
    void permiteSeguirElFlujo() {
        Usuario existente = pendiente(null);
        when(usuarioService.buscarPorCorreo("p@test.cr")).thenReturn(Optional.of(existente));
        service.iniciarRegistro(alta("$2a$nuevo"));
        when(otpService.verificarOtp(any(), any(), any())).thenReturn(new com.hotclick.model.CodigoOtp());
        when(usuarioService.buscarPorId(7L)).thenReturn(Optional.of(existente));

        assertThat(service.verificarYRegistrar("p@test.cr", "123456")).isSameAs(existente);
        verify(usuarioService).activarUsuario(7L);
    }

    @Test
    @DisplayName("PENDIENTE que ya tiene hash: NO se sobrescribe (evita secuestro de alta ajena)")
    void noSobrescribeHashExistente() {
        Usuario existente = pendiente("$2a$original");
        when(usuarioService.buscarPorCorreo("p@test.cr")).thenReturn(Optional.of(existente));

        service.iniciarRegistro(alta("$2a$atacante"));

        assertThat(existente.getContrasenaHash()).isEqualTo("$2a$original");
        verify(usuarioService, never()).guardar(any());
        verify(otpService).enviarOtp(existente, Constants.OTP_TIPO_REGISTRO);
    }

    @Test
    @DisplayName("sin hash nuevo en el reinicio: no guarda nada (fail-closed intacto)")
    void sinHashNuevoNoGuarda() {
        Usuario existente = pendiente(null);
        when(usuarioService.buscarPorCorreo("p@test.cr")).thenReturn(Optional.of(existente));

        service.iniciarRegistro(alta(null));

        assertThat(existente.getContrasenaHash()).isNull();
        verify(usuarioService, never()).guardar(any());
    }

    @Test
    @DisplayName("verify de PENDIENTE sin hash: mismo mensaje que cuenta inexistente, sin OTP ni activación")
    void mensajeUnificado() {
        when(usuarioService.buscarPorCorreo("no@test.cr")).thenReturn(Optional.empty());
        String inexistente = catchMsg("no@test.cr");

        when(usuarioService.buscarPorCorreo("p@test.cr")).thenReturn(Optional.of(pendiente(null)));
        String sinHash = catchMsg("p@test.cr");

        assertThat(sinHash).isEqualTo(inexistente);
        assertThat(sinHash).doesNotContain("registro de nuevo");
        verify(usuarioService, never()).activarUsuario(any());
        verifyNoInteractions(otpService);
    }

    private String catchMsg(String correo) {
        Throwable t = org.assertj.core.api.Assertions.catchThrowable(() -> service.verificarYRegistrar(correo, "123456"));
        assertThat(t).isNotNull();
        return com.hotclick.utils.ErrorPublico.mensaje(t);
    }
}
