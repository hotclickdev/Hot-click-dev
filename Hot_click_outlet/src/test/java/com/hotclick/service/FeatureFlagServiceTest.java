package com.hotclick.service;

import com.hotclick.repository.FeatureFlagRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.InvalidDataAccessResourceUsageException;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("FeatureFlagService — lectura pública")
class FeatureFlagServiceTest {

    @Mock FeatureFlagRepository flagRepo;
    @Mock JdbcTemplate jdbc;

    @InjectMocks FeatureFlagService service;

    @Test
    @DisplayName("Si falta la tabla de overrides, el flag se trata como apagado")
    void tablaFaltanteNoTiraAlStorefront() {
        when(flagRepo.findNombresActivosParaEmpresa(1L))
            .thenThrow(new InvalidDataAccessResourceUsageException("tabla ausente"));

        assertThat(service.isEnabled("chat_publico", 1L)).isFalse();
        assertThat(service.getFlagsActivosParaEmpresa(1L)).isEmpty();
    }
}
