package com.hotclick.service.telegram;

import com.hotclick.repository.TelegramUpdateProcesadoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** Auditor 8: la tabla de dedup V199 se purga (más de 7 días). */
class TelegramUpdateDedupPurgaTest {

    @Test
    void purgaBorraMarcasDeMasDeSieteDias() {
        TelegramUpdateProcesadoRepository repo = mock(TelegramUpdateProcesadoRepository.class);
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        new TelegramUpdateDedup(repo, tm).purgarPersistidos();

        ArgumentCaptor<LocalDateTime> limite = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(repo).borrarAnteriores(limite.capture());
        LocalDateTime esperado = LocalDateTime.now(Constants.ZONA_CR).minusDays(7);
        assertThat(limite.getValue()).isBetween(esperado.minusMinutes(1), esperado.plusMinutes(1));
    }
}
