package com.hotclick.service.telegram;

import com.hotclick.model.MiembroEmpresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.repository.TelegramUpdateProcesadoRepository;
import com.hotclick.repository.TelegramVinculacionRepository;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.security.SecurityAlertNotifier;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TG3: bloqueo solo de Telegram, dedup fail-closed y revocarMiembro por empresa. */
class TelegramTg3Test {

    // (a)
    @Test
    void abusoRepetido_bloqueaSoloTelegram_noSuspendeLaCuenta() {
        TelegramAbusoService abuso = new TelegramAbusoService();
        RateLimiter rl = mock(RateLimiter.class);
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(rl.tryAcquire(eq("tg:77:abuso"), anyInt(), anyInt())).thenReturn(false); // segunda vez
        Usuario u = new Usuario();
        u.setEstado(1);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(77L);
        when(repo.findByChatIdAndEstado(77L, TelegramVinculacion.ACTIVA)).thenReturn(Optional.of(v));
        ReflectionTestUtils.setField(abuso, "rateLimiter", rl);
        ReflectionTestUtils.setField(abuso, "vinculacionRepository", repo);
        ReflectionTestUtils.setField(abuso, "bot", mock(TelegramClienteBotService.class));
        ReflectionTestUtils.setField(abuso, "alertNotifier", mock(SecurityAlertNotifier.class));

        assertThat(abuso.rechazarSiInyeccion(77L, "x' or 1=1")).isTrue();

        assertThat(u.getEstado()).isNotEqualTo(Constants.ESTADO_SUSPENDIDO);
        assertThat(u.getBloqueadoHasta()).isNull();
        assertThat(v.getPausadoHasta()).isAfter(LocalDateTime.now(Constants.ZONA_CR).plusDays(300));
    }

    // (b)
    private static TelegramUpdateDedup dedupCon(TelegramUpdateProcesadoRepository repo) {
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        return new TelegramUpdateDedup(repo, tm);
    }

    @Test
    void dedup_duplicadoEnBd_noSeProcesa_aunTrasReinicio() {
        TelegramUpdateProcesadoRepository repo = mock(TelegramUpdateProcesadoRepository.class);
        when(repo.insertar(eq(10L), any())).thenReturn(1).thenThrow(new DataIntegrityViolationException("dup"));
        assertThat(dedupCon(repo).esNuevo(10L)).isTrue();
        assertThat(dedupCon(repo).esNuevo(10L)).isFalse(); // instancia nueva = memoria vacía
    }

    @Test
    void dedup_falloDeBd_failClosed() {
        TelegramUpdateProcesadoRepository repo = mock(TelegramUpdateProcesadoRepository.class);
        when(repo.insertar(anyLong(), any())).thenThrow(new DataAccessResourceFailureException("bd caída"));
        assertThat(dedupCon(repo).esNuevo(11L)).isFalse();
    }

    // (c)
    @Test
    void revocarMiembro_desactivaSoloLaMembresiaDeEsaEmpresa() {
        TelegramConfigService svc = new TelegramConfigService();
        MiembroEmpresaRepository mr = mock(MiembroEmpresaRepository.class);
        TelegramVinculacionRepository vr = mock(TelegramVinculacionRepository.class);
        ReflectionTestUtils.setField(svc, "miembroEmpresaRepository", mr);
        ReflectionTestUtils.setField(svc, "vinculacionRepository", vr);
        MiembroEmpresa m = mock(MiembroEmpresa.class);
        when(m.getRolEnEmpresa()).thenReturn("EDITOR");
        when(mr.findByUsuarioIdAndEmpresaIdAndEstado(5L, 1L, 1)).thenReturn(Optional.of(m));
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(new Usuario());
        v.setChatId(88L);
        v.setEstado(TelegramVinculacion.ACTIVA);
        v.setEmpresaActivaId(1L);
        when(vr.findByUsuarioId(5L)).thenReturn(Optional.of(v));
        when(mr.findByUsuarioIdAndEstado(5L, 1)).thenReturn(java.util.List.of(mock(MiembroEmpresa.class))); // otra empresa

        assertThat(svc.revocarMiembro(5L, 1L)).isTrue();

        verify(m).setEstado(0);
        verify(mr).save(m);
        verify(mr, never()).findByUsuarioIdAndEmpresaIdAndEstado(eq(5L), eq(2L), anyInt());
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA); // otras empresas siguen
        assertThat(v.getChatId()).isEqualTo(88L);
        assertThat(v.getEmpresaActivaId()).isNull();
    }

    @Test
    void revocarMiembro_noRevocaAlPropietario() {
        TelegramConfigService svc = new TelegramConfigService();
        MiembroEmpresaRepository mr = mock(MiembroEmpresaRepository.class);
        ReflectionTestUtils.setField(svc, "miembroEmpresaRepository", mr);
        MiembroEmpresa m = mock(MiembroEmpresa.class);
        when(m.getRolEnEmpresa()).thenReturn("PROPIETARIO");
        when(mr.findByUsuarioIdAndEmpresaIdAndEstado(5L, 1L, 1)).thenReturn(Optional.of(m));
        assertThat(svc.revocarMiembro(5L, 1L)).isFalse();
        verify(m, never()).setEstado(anyInt());
    }
}
