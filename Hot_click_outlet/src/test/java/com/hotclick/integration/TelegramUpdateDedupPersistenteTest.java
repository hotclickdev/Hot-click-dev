package com.hotclick.integration;

import com.hotclick.repository.TelegramUpdateProcesadoRepository;
import com.hotclick.service.telegram.TelegramUpdateDedup;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.PlatformTransactionManager;

import static org.assertj.core.api.Assertions.assertThat;

/** TG3: el dedup persiste en BD y sobrevive un reinicio (instancia nueva, memoria vacía). */
class TelegramUpdateDedupPersistenteTest extends BaseIntegrationTest {

    @Autowired private TelegramUpdateProcesadoRepository repo;
    @Autowired private PlatformTransactionManager txManager;

    @Test
    void mismoUpdateIdTrasReinicio_noSeProcesaDosVeces() {
        long id = 987_654_321L;
        assertThat(new TelegramUpdateDedup(repo, txManager).esNuevo(id)).isTrue();
        assertThat(new TelegramUpdateDedup(repo, txManager).esNuevo(id)).isFalse();
        assertThat(repo.existsById(id)).isTrue();
        repo.deleteById(id);
    }
}
