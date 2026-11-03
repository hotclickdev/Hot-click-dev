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
        TelegramRevocacionMiembro svc = new TelegramRevocacionMiembro();
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
        when(mr.existsByUsuarioIdAndEstado(5L, 1)).thenReturn(true); // otra empresa

        assertThat(svc.revocar(5L, 1L)).isTrue();

        verify(m).setEstado(0);
        verify(mr).save(m);
        verify(mr, never()).findByUsuarioIdAndEmpresaIdAndEstado(eq(5L), eq(2L), anyInt());
        assertThat(v.getEstado()).isEqualTo(TelegramVinculacion.ACTIVA); // otras empresas siguen
        assertThat(v.getChatId()).isEqualTo(88L);
        assertThat(v.getEmpresaActivaId()).isNull();
    }

    @Test
    void revocarMiembro_noRevocaAlPropietario() {
        TelegramRevocacionMiembro svc = new TelegramRevocacionMiembro();
        MiembroEmpresaRepository mr = mock(MiembroEmpresaRepository.class);
        ReflectionTestUtils.setField(svc, "miembroEmpresaRepository", mr);
        MiembroEmpresa m = mock(MiembroEmpresa.class);
        when(m.getRolEnEmpresa()).thenReturn("PROPIETARIO");
        when(mr.findByUsuarioIdAndEmpresaIdAndEstado(5L, 1L, 1)).thenReturn(Optional.of(m));
        assertThat(svc.revocar(5L, 1L)).isFalse();
        verify(m, never()).setEstado(anyInt());
    }

    // (1) A8-C2: ráfaga de >3 msg/s
    @Test
    void rafaga_soloPausa30Min_nuncaBloqueaUnAnioNiSuspendeLaCuenta() {
        TelegramAbusoService abuso = new TelegramAbusoService();
        RateLimiter rl = mock(RateLimiter.class);
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        when(rl.tryAcquire(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(rl.tryAcquire(eq("tg:78:abuso"), anyInt(), anyInt())).thenReturn(false); // reincidente
        Usuario u = new Usuario();
        u.setEstado(1);
        TelegramVinculacion v = new TelegramVinculacion();
        v.setUsuario(u);
        v.setChatId(78L);
        when(repo.findByChatIdAndEstado(78L, TelegramVinculacion.ACTIVA)).thenReturn(Optional.of(v));
        ReflectionTestUtils.setField(abuso, "rateLimiter", rl);
        ReflectionTestUtils.setField(abuso, "vinculacionRepository", repo);
        ReflectionTestUtils.setField(abuso, "bot", mock(TelegramClienteBotService.class));
        ReflectionTestUtils.setField(abuso, "alertNotifier", mock(SecurityAlertNotifier.class));

        TelegramRateLimitService rate = new TelegramRateLimitService();
        RateLimiter rl2 = mock(RateLimiter.class);
        when(rl2.tryAcquire(eq("tg:78:seg"), anyInt(), anyInt())).thenReturn(false); // 4.º msg en 1 s
        ReflectionTestUtils.setField(rate, "rateLimiter", rl2);
        ReflectionTestUtils.setField(rate, "abuso", abuso);

        assertThat(rate.permitidoPorRateLimit(78L)).isFalse();

        assertThat(u.getEstado()).isNotEqualTo(Constants.ESTADO_SUSPENDIDO);
        assertThat(u.getBloqueadoHasta()).isNull();
        assertThat(v.getPausadoHasta()).isBefore(LocalDateTime.now(Constants.ZONA_CR).plusHours(1));
    }

    // (4) candados acotados
    @Test
    void candados_acotados_mismoChatMismoCandado() {
        TelegramUpdateRouter r = new TelegramUpdateRouter();
        assertThat(r.candado(123L)).isSameAs(r.candado(123L));
        java.util.Set<Object> distintos = java.util.Collections.newSetFromMap(new java.util.IdentityHashMap<>());
        for (long id = 1; id <= 100_000; id++) distintos.add(r.candado(id * 7919L));
        assertThat(distintos).hasSizeLessThanOrEqualTo(TelegramUpdateRouter.FRANJAS);
    }

    // (5) /start sin distinguir mayúsculas
    @Test
    void start_codigoEnMinusculas_seNormaliza() {
        TelegramVinculacionService svc = new TelegramVinculacionService();
        TelegramVinculacionRepository repo = mock(TelegramVinculacionRepository.class);
        when(repo.findByCodigo(anyString())).thenReturn(Optional.empty());
        ReflectionTestUtils.setField(svc, "vinculacionRepository", repo);
        ReflectionTestUtils.setField(svc, "bot", mock(TelegramClienteBotService.class));
        svc.vincular(90L, "u", "ab3k-9xyz");
        verify(repo).findByCodigo("AB3K9XYZ");
    }

    // Seguridad INFO: chat_id enmascarado en avisos/logs
    @Test
    void chatIdEnmascarado() {
        assertThat(TelegramAbusoService.chatEnmascarado(123456789L)).isEqualTo("***6789").doesNotContain("12345");
        assertThat(TelegramAbusoService.chatEnmascarado(-1001234567890L)).isEqualTo("***7890");
    }
}
