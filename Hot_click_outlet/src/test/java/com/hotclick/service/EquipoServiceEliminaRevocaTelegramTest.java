package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramBloqueoEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramBloqueoEmpresaRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.telegram.TelegramRevocacionMiembro;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** O6 (QA final 23-nov): quitar a un miembro del equipo en la web corta también su Telegram de esa empresa. */
@DisplayName("EquipoService.eliminar revoca el Telegram de esa empresa antes de desactivar la membresía")
class EquipoServiceEliminaRevocaTelegramTest {

    private static final long U = 5L, EMPRESA = 13L, OTRA = 14L, ACTOR = 99L;

    private final MiembroEmpresaRepository mr = mock(MiembroEmpresaRepository.class);
    private final TelegramVinculacionRepository vr = mock(TelegramVinculacionRepository.class);
    private final TelegramBloqueoEmpresaRepository br = mock(TelegramBloqueoEmpresaRepository.class);
    private final UsuarioRepository ur = mock(UsuarioRepository.class);
    private final AuditoriaAdminRegistroService auditoria = mock(AuditoriaAdminRegistroService.class);
    private EquipoService equipo;
    private MiembroEmpresa lector;
    private TelegramVinculacion v;

    @BeforeEach
    void setUp() {
        TelegramRevocacionMiembro rev = new TelegramRevocacionMiembro();
        ReflectionTestUtils.setField(rev, "miembroEmpresaRepository", mr);
        ReflectionTestUtils.setField(rev, "vinculacionRepository", vr);
        ReflectionTestUtils.setField(rev, "bloqueoRepository", br);
        ReflectionTestUtils.setField(rev, "auditoria", auditoria);
        equipo = new EquipoService();
        ReflectionTestUtils.setField(equipo, "miembroEmpresaRepository", mr);
        ReflectionTestUtils.setField(equipo, "usuarioRepository", ur);
        ReflectionTestUtils.setField(equipo, "telegramRevocacionMiembro", rev);

        Usuario u = new Usuario();
        u.setId(U);
        Empresa e = new Empresa();
        e.setId(EMPRESA);
        lector = new MiembroEmpresa(u, e, "LECTOR");
        lector.setEstado(1);
        // Como en BD: solo devuelve la membresía mientras está activa (por eso el orden importa).
        when(mr.findByUsuarioIdAndEmpresaIdAndEstado(eq(U), eq(EMPRESA), anyInt()))
            .thenAnswer(i -> Integer.valueOf(lector.getEstado()).equals(i.getArgument(2))
                ? Optional.of(lector) : Optional.empty());
        when(br.existsByUsuarioIdAndEmpresaId(anyLong(), anyLong())).thenReturn(false);
        v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(88L);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setEmpresaActivaId(EMPRESA);
        when(vr.findByUsuarioId(U)).thenReturn(Optional.of(v));
    }

    @Test
    @DisplayName("LECTOR vinculado a la empresa 13: tras eliminarlo ya no apunta a ella y queda bloqueado")
    void eliminarCortaTelegramDeEsaEmpresa() {
        when(mr.countEmpresasByUsuarioId(U)).thenReturn(1L);

        equipo.eliminar(U, EMPRESA, ACTOR);

        assertThat(lector.getEstado()).isZero();
        assertThat(v.getEmpresaActivaId()).isNull();
        verify(vr).limpiarEmpresaActiva(v.getId(), EMPRESA);
        verify(br).save(any(TelegramBloqueoEmpresa.class));
    }

    @Test
    @DisplayName("Si la vinculación estaba en otra empresa, no se toca")
    void otraEmpresaActivaNoSeToca() {
        v.setEmpresaActivaId(OTRA);
        when(mr.countEmpresasByUsuarioId(U)).thenReturn(1L);

        equipo.eliminar(U, EMPRESA, ACTOR);

        assertThat(v.getEmpresaActivaId()).isEqualTo(OTRA);
        verify(vr, never()).limpiarEmpresaActiva(anyLong(), anyLong());
    }

    @Test
    @DisplayName("El propietario no se puede eliminar ni se revoca")
    void propietarioNoSeRevoca() {
        lector.setRolEnEmpresa("PROPIETARIO");

        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
            () -> equipo.eliminar(U, EMPRESA, ACTOR));

        verify(br, never()).save(any());
        assertThat(v.getEmpresaActivaId()).isEqualTo(EMPRESA);
    }
}
