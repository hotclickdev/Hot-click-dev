package com.hotclick.service.telegram;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramBloqueoEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramBloqueoEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.TelegramClienteBotService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * N1 (área 8): revocar el Telegram de un miembro en A corta solo el bot para A. La membresía web en A
 * sigue activa, el bot rechaza A y el acceso a B se mantiene. Queda en la bitácora.
 */
class TelegramRevocacionSoloBotTest {

    private static final long U = 5L, A = 1L, B = 2L;

    private final MiembroEmpresaRepository mr = mock(MiembroEmpresaRepository.class);
    private final TelegramVinculacionRepository vr = mock(TelegramVinculacionRepository.class);
    private final TelegramBloqueoEmpresaRepository br = mock(TelegramBloqueoEmpresaRepository.class);
    private final AuditoriaAdminRegistroService auditoria = mock(AuditoriaAdminRegistroService.class);
    private final TelegramClienteBotService bot = mock(TelegramClienteBotService.class);
    private final List<Long> bloqueadas = new ArrayList<>();
    private TelegramRevocacionMiembro revocacion;
    private TelegramEmpresaContextService contexto;
    private MiembroEmpresa enA, enB;
    private TelegramVinculacion v;

    @BeforeEach
    void setUp() {
        revocacion = new TelegramRevocacionMiembro();
        ReflectionTestUtils.setField(revocacion, "miembroEmpresaRepository", mr);
        ReflectionTestUtils.setField(revocacion, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(revocacion, "bloqueoRepository", br);
        ReflectionTestUtils.setField(revocacion, "auditoria", auditoria);
        contexto = new TelegramEmpresaContextService();
        ReflectionTestUtils.setField(contexto, "miembroEmpresaRepository", mr);
        ReflectionTestUtils.setField(contexto, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(contexto, "bloqueoRepository", br);
        ReflectionTestUtils.setField(contexto, "bot", bot);
        ReflectionTestUtils.setField(contexto, "menuBuilder", mock(TelegramMenuBuilder.class));

        enA = miembro(A, "EDITOR");
        enB = miembro(B, "VENDEDOR");
        when(mr.findByUsuarioIdAndEmpresaIdAndEstado(U, A, 1)).thenReturn(Optional.of(enA));
        when(mr.existsByUsuarioIdAndEmpresaIdAndEstado(eq(U), anyLong(), eq(1))).thenReturn(true);
        when(mr.findByUsuarioIdAndEstado(U, 1)).thenReturn(List.of(enA, enB));
        when(br.save(any())).thenAnswer(i -> {
            bloqueadas.add(((TelegramBloqueoEmpresa) i.getArgument(0)).getEmpresaId());
            return i.getArgument(0);
        });
        when(br.existsByUsuarioIdAndEmpresaId(eq(U), anyLong()))
            .thenAnswer(i -> bloqueadas.contains((Long) i.getArgument(1)));
        when(br.findEmpresaIdsByUsuarioId(U)).thenAnswer(i -> List.copyOf(bloqueadas));

        Usuario u = new Usuario();
        u.setId(U);
        v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(88L);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setEmpresaActivaId(A);
        when(vr.findByUsuarioId(U)).thenReturn(Optional.of(v));
    }

    private static MiembroEmpresa miembro(long empresaId, String rol) {
        Empresa e = new Empresa();
        e.setId(empresaId);
        MiembroEmpresa m = mock(MiembroEmpresa.class);
        when(m.getEmpresa()).thenReturn(e);
        when(m.getRolEnEmpresa()).thenReturn(rol);
        return m;
    }

    @Test
    @DisplayName("la membresía web en A no cambia, el bot rechaza A y B sigue")
    void soloBot() {
        assertThat(revocacion.revocar(U, A)).isTrue();

        verify(enA, never()).setEstado(anyInt());
        verify(mr, never()).save(any());
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA);
        assertThat(v.getChatId()).isEqualTo(88L);
        assertThat(v.getEmpresaActivaId()).isNull();

        contexto.seleccionarEmpresa(v, String.valueOf(A));
        assertThat(v.getEmpresaActivaId()).isNull();
        verify(bot).enviarMensaje(88L, "No tenés acceso a ese negocio.");

        // Con A bloqueada, la única empresa del bot es B: se elige sola.
        assertThat(contexto.empresaValidada(v)).isEqualTo(B);
        contexto.seleccionarEmpresa(v, String.valueOf(B));
        assertThat(v.getEmpresaActivaId()).isEqualTo(B);
    }

    @Test
    @DisplayName("empresa activa A ya guardada en el chat → empresaValidada la descarta")
    void empresaActivaBloqueada() {
        revocacion.revocar(U, A);
        v.setEmpresaActivaId(A);
        assertThat(contexto.empresaValidada(v)).isEqualTo(B);
    }

    @Test
    @DisplayName("queda en la bitácora una vez; repetir es idempotente")
    void auditadoEIdempotente() {
        assertThat(revocacion.revocar(U, A)).isTrue();
        assertThat(revocacion.revocar(U, A)).isTrue();
        verify(br, times(1)).save(any());
        verify(auditoria, times(1)).registrar(eq("TELEGRAM_REVOCAR_MIEMBRO"), eq("USUARIO"), eq(U), eq(A), anyString());
    }

    @Test
    @DisplayName("propietario: no se bloquea ni se audita")
    void propietario() {
        when(enA.getRolEnEmpresa()).thenReturn("PROPIETARIO");
        assertThat(revocacion.revocar(U, A)).isFalse();
        verifyNoInteractions(br, auditoria);
    }
}
