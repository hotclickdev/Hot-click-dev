package com.hotclick.service.agentes;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AgentesStatusRules — estados I1")
class AgentesStatusRulesTest {

    @Test
    @DisplayName("E1 no matchea E11")
    void idBoundary_noConfundePrefijos() {
        assertThat(AgentesStatusRules.idBoundary("E1").matcher("E1 Flyway").find()).isTrue();
        assertThat(AgentesStatusRules.idBoundary("E1").matcher("E11 Paths").find()).isFalse();
        assertThat(AgentesStatusRules.idBoundary("S1").matcher("S10 god").find()).isFalse();
    }

    @Test
    @DisplayName("sin doc ni workflow → activar")
    void decideStatus_activar() {
        assertThat(AgentesStatusRules.decideStatus(false, false, false, false, false, false))
                .isEqualTo(AgentesStatusRules.ACTIVAR);
    }

    @Test
    @DisplayName("doc dice workflow y el archivo no está → actualizar")
    void decideStatus_actualizarFaltaWorkflow() {
        assertThat(AgentesStatusRules.decideStatus(true, false, true, false, true, true))
                .isEqualTo(AgentesStatusRules.ACTUALIZAR);
    }

    @Test
    @DisplayName("workflow + doc + script + cadence → al_dia")
    void decideStatus_alDia() {
        assertThat(AgentesStatusRules.decideStatus(true, true, true, true, true, true))
                .isEqualTo(AgentesStatusRules.AL_DIA);
    }

    @Test
    @DisplayName("falta script → mejorar")
    void decideStatus_mejorar() {
        assertThat(AgentesStatusRules.decideStatus(true, true, false, true, true, true))
                .isEqualTo(AgentesStatusRules.MEJORAR);
    }

    @Test
    @DisplayName("daily exige cron; event acepta pull_request")
    void cadence_dailyVsEvent() {
        WorkflowTriggers scheduled = AgentesStatusRules.detectTriggers("on:\n  schedule:\n    - cron: \"0 9 * * *\"\n");
        WorkflowTriggers prOnly = AgentesStatusRules.detectTriggers("on:\n  pull_request:\n    branches: [master]\n");
        assertThat(AgentesStatusRules.cadenceMatches("daily", scheduled)).isTrue();
        assertThat(AgentesStatusRules.cadenceMatches("daily", prOnly)).isFalse();
        assertThat(AgentesStatusRules.cadenceMatches("event", prOnly)).isTrue();
    }

    @Test
    @DisplayName("YAML pausado (dispatch + triggers originales comentados) no cuenta cron")
    void detectTriggers_ignoraComentariosDePausa() {
        String yaml = """
                # DISABLED 2026-09-14 — awaiting reorg
                on:
                  workflow_dispatch:
                # ORIGINAL TRIGGERS (restore to re-enable):
                # on:
                #   schedule:
                #     - cron: '0 9 * * *'
                #   pull_request:
                """;
        WorkflowTriggers triggers = AgentesStatusRules.detectTriggers(yaml);
        assertThat(triggers.hasDispatch()).isTrue();
        assertThat(triggers.hasSchedule()).isFalse();
        assertThat(triggers.hasPr()).isFalse();
        assertThat(AgentesStatusRules.cadenceMatches("daily", triggers)).isFalse();
        assertThat(AgentesStatusRules.cadenceMatches("event", triggers)).isTrue();
    }
}
