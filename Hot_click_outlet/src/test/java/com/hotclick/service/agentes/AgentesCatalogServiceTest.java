package com.hotclick.service.agentes;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule;
import com.hotclick.dto.agentes.AgentRecordDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AgentesCatalogService — classpath I1")
class AgentesCatalogServiceTest {

    @TempDir
    Path temp;

    @Test
    @DisplayName("el JSON empaquetado incluye S13 e I1")
    void classpathCatalogo() {
        AgentesCatalogService svc = new AgentesCatalogService(mapper(), "", temp.toString());
        assertThat(svc.loadCatalogo().agentsOrEmpty())
                .extracting(AgentRecordDto::id)
                .contains("S13", "I1", "D12", "E16");
        assertThat(svc.loadOlas().onMaster()).isEqualTo(7);
        assertThat(svc.loadInspecciones().runsOrEmpty()).isNotEmpty();
        assertThat(svc.snapshot().catalogo().agentsOrEmpty()).isNotEmpty();
    }

    private static ObjectMapper mapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new ParameterNamesModule());
        mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        return mapper;
    }
}
