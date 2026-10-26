package com.hotclick.service.telegram;

import com.hotclick.repository.TelegramUpdateProcesadoRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * QA8 repro A8-C3: la dedup vivía en memoria; con 2 instancias (2 réplicas) el mismo update_id se procesaba dos veces.
 * Adaptado al fix TG3: el constructor recibe repo + txManager. Ambas réplicas comparten la MISMA "BD"
 * (un fake con PK única que lanza DataIntegrityViolationException ante duplicado, como la tabla V199).
 */
class TelegramUpdateDedupReproC3Test {

    private static TelegramUpdateProcesadoRepository bdCompartida() {
        Set<Long> pk = ConcurrentHashMap.newKeySet();
        TelegramUpdateProcesadoRepository repo = mock(TelegramUpdateProcesadoRepository.class);
        when(repo.insertar(anyLong(), any())).thenAnswer(inv -> {
            long id = inv.getArgument(0);
            if (!pk.add(id)) throw new DataIntegrityViolationException("PK update_id duplicada");
            return 1;
        });
        return repo;
    }

    private static TelegramUpdateDedup replica(TelegramUpdateProcesadoRepository repo) {
        PlatformTransactionManager tm = mock(PlatformTransactionManager.class);
        when(tm.getTransaction(any())).thenReturn(new SimpleTransactionStatus());
        return new TelegramUpdateDedup(repo, tm);
    }

    @Test
    @DisplayName("A8-C3: el mismo update_id en dos instancias se acepta una sola vez")
    void mismoUpdateId_dosInstancias_soloUnaLoAcepta() {
        TelegramUpdateProcesadoRepository bd = bdCompartida();
        TelegramUpdateDedup replicaA = replica(bd);
        TelegramUpdateDedup replicaB = replica(bd);

        boolean a = replicaA.esNuevo(42L);
        boolean b = replicaB.esNuevo(42L);

        assertThat(a).isTrue();
        assertThat(b).as("la segunda réplica no debería ver el update 42 como nuevo").isFalse();
    }
}
