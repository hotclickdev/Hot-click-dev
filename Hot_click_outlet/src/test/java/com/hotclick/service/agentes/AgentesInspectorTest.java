package com.hotclick.service.agentes;

import com.hotclick.dto.agentes.AgentInspectionDto;
import com.hotclick.dto.agentes.AgentRecordDto;
import com.hotclick.dto.agentes.InspectionRunDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AgentesInspector — evaluación I1")
class AgentesInspectorTest {

    @TempDir
    Path temp;

    @Test
    @DisplayName("S13 sin workflow ni doc queda activar")
    void s13Activar() throws Exception {
        Path root = repoConDocsYWorkflows("ola 7 documentó D12", "name: E1\non:\n  pull_request:\n");
        AgentRecordDto s13 = new AgentRecordDto(
                "S13", "No asignado", "weekly", 7, null, null, null, "hueco", null);
        InspectionRunDto run = AgentesInspector.inspect(List.of(s13), root, "test");
        AgentInspectionDto row = porId(run).get("S13");
        assertThat(row.status()).isEqualTo(AgentesStatusRules.ACTIVAR);
        assertThat(row.workflowFound()).isFalse();
    }

    @Test
    @DisplayName("workflow + doc + script + cadence semanal → al_dia")
    void alDiaConTodo() throws Exception {
        Path root = repoConDocsYWorkflows("Dashboard I1 en master", """
                name: I1
                on:
                  schedule:
                    - cron: "15 14 * * 1"
                  workflow_dispatch:
                """);
        Files.writeString(root.resolve("scripts").resolve("inspect.mjs"), "export {}\n");
        AgentRecordDto i1 = new AgentRecordDto(
                "I1", "Inspector", "weekly", 0,
                "inspect-agents.yml", "scripts/inspect.mjs", "docs/AGENTES_OLA7.md",
                "lunes", null);
        InspectionRunDto run = AgentesInspector.inspect(List.of(i1), root, "test");
        assertThat(porId(run).get("I1").status()).isEqualTo(AgentesStatusRules.AL_DIA);
    }

    @Test
    @DisplayName("compareIds es numérico: D2 antes de D10")
    void compareIdsNumerico() {
        assertThat(AgentesInspector.compareIds("D2", "D10")).isNegative();
        assertThat(AgentesInspector.compareIds("E1", "E11")).isNegative();
        assertThat(AgentesInspector.compareIds("D12", "DOC1")).isNegative();
    }

    @Test
    @DisplayName("IDs conocidos cubren D/S/E + DOC1 SCALE1 I1")
    void knownIdsCompleto() {
        assertThat(AgentesInspector.knownIds()).hasSize(12 + 14 + 18 + 3);
        assertThat(AgentesInspector.knownIds()).contains("D1", "S13", "E18", "DOC1", "SCALE1", "I1");
    }

    @Test
    @DisplayName("contra el clone: D12/S14/E16 al día y S13 activar")
    void contraRepoReal() throws Exception {
        Path repoRoot = AgentesRepoLocator.findRepoRoot("", System.getProperty("user.dir"));
        if (repoRoot == null) {
            return;
        }
        Path catalog = repoRoot.resolve("Hot_click_outlet/src/main/resources/agentes/agents.json");
        if (!Files.isRegularFile(catalog)) {
            catalog = repoRoot.resolve("agentes-dashboard/data/agents.json");
        }
        if (!Files.isRegularFile(catalog)) {
            return;
        }
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.registerModule(new com.fasterxml.jackson.module.paramnames.ParameterNamesModule());
        mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        var file = mapper.readValue(catalog.toFile(), com.hotclick.dto.agentes.CatalogFileDto.class);
        InspectionRunDto run = AgentesInspector.inspect(file.agentsOrEmpty(), repoRoot, "test");
        Map<String, AgentInspectionDto> byId = porId(run);
        assertThat(byId.get("D1").status()).isEqualTo(AgentesStatusRules.AL_DIA);
        assertThat(byId.get("D12").status()).isEqualTo(AgentesStatusRules.AL_DIA);
        assertThat(byId.get("S14").status()).isEqualTo(AgentesStatusRules.AL_DIA);
        assertThat(byId.get("E16").status()).isEqualTo(AgentesStatusRules.AL_DIA);
        assertThat(byId.get("S13").status()).isEqualTo(AgentesStatusRules.ACTIVAR);
        assertThat(run.summary().activar()).isEqualTo(1);
        assertThat(run.summary().alDia()).isGreaterThanOrEqualTo(43);
    }

    private Path repoConDocsYWorkflows(String docBody, String yaml) throws Exception {
        Files.createDirectories(temp.resolve(".github").resolve("workflows"));
        Files.createDirectories(temp.resolve("docs"));
        Files.createDirectories(temp.resolve("scripts"));
        Files.writeString(temp.resolve("docs").resolve("AGENTES_OLA7.md"), docBody);
        Files.writeString(temp.resolve(".github").resolve("workflows").resolve("inspect-agents.yml"), yaml);
        return temp;
    }

    private static Map<String, AgentInspectionDto> porId(InspectionRunDto run) {
        return run.agentsOrEmpty().stream().collect(Collectors.toMap(AgentInspectionDto::id, a -> a));
    }
}
