package com.hotclick.agente.webhook;

import com.hotclick.agente.webhook.MensajeEntrante.Canal;
import com.hotclick.repository.CanalEventoProcesadoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MetaEventoDedupTest {

    private CanalEventoProcesadoRepository repo;
    private MetaEventoDedup dedup;

    @BeforeEach
    void setUp() {
        repo = mock(CanalEventoProcesadoRepository.class);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        dedup = new MetaEventoDedup(repo, tm);
    }

    @Test
    void primeraVezEsNuevoYSegundaNo() {
        assertThat(dedup.esNuevo("wamid.1", Canal.WHATSAPP)).isTrue();
        assertThat(dedup.esNuevo("wamid.1", Canal.WHATSAPP)).isFalse();
        verify(repo, times(1)).insertar(eq("wamid.1"), eq("WHATSAPP"), any());
    }

    @Test
    void duplicadoEnBaseNoEsNuevo() {
        when(repo.insertar(eq("wamid.2"), anyString(), any())).thenThrow(new DataIntegrityViolationException("dup"));
        assertThat(dedup.esNuevo("wamid.2", Canal.WHATSAPP)).isFalse();
    }

    @Test
    void falloDeBaseEsFailClosed() {
        when(repo.insertar(eq("mid.3"), anyString(), any())).thenThrow(new IllegalStateException("caida"));
        assertThat(dedup.esNuevo("mid.3", Canal.INSTAGRAM)).isFalse();
    }

    @Test
    void idVacioNoSeProcesa() {
        assertThat(dedup.esNuevo(null, Canal.MESSENGER)).isFalse();
        assertThat(dedup.esNuevo("  ", Canal.MESSENGER)).isFalse();
        verify(repo, never()).insertar(anyString(), anyString(), any());
    }
}
