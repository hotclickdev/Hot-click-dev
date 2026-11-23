package com.hotclick.service;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.TelegramVinculacionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Al reactivar una cuenta por invitación, el Telegram ligado se revoca con el UPDATE atómico
 * ({@code revocarPorId}), no con un {@code save} que pisaría un canje concurrente con una versión vieja.
 */
@DisplayName("Reactivar por invitación: revoca Telegram con revocarPorId (no save)")
class InvitacionEquipoRevocaTelegramUnitTest {

    @Test
    @DisplayName("revocarTelegram llama revocarPorId(id) y nunca save")
    void usaRevocarPorId() {
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        InvitacionEquipoService servicio = new InvitacionEquipoService();
        ReflectionTestUtils.setField(servicio, "telegramVinculacionRepository", repo);

        Usuario u = new Usuario();
        u.setId(5L);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setId(11L);
        v.setUsuario(u);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setChatId(123L);
        v.setCodigo("ABCD2345");
        v.setCodigoExpira(LocalDateTime.now().plusMinutes(5));
        when(repo.findByUsuarioId(5L)).thenReturn(Optional.of(v));

        ReflectionTestUtils.invokeMethod(servicio, "revocarTelegram", u);

        verify(repo).revocarPorId(11L);
        verify(repo, never()).save(any());
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.REVOCADA);
        assertThat(v.getCodigo()).isNull();
    }
}
