package com.hotclick.service.agentes;

import com.hotclick.dto.agentes.AgentInspectionDto;
import com.hotclick.dto.agentes.AgentRecordDto;
import com.hotclick.dto.agentes.InspectionRunDto;
import com.hotclick.dto.agentes.InspectionSummaryDto;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Inspector I1: evalúa cada ID del catálogo contra workflows y docs.
 * No toca pago, auth ni schedulers de negocio.
 */
public final class AgentesInspector {

    static final int MAX_D = 12;
    static final int MAX_S = 14;
    static final int MAX_E = 18;

    private AgentesInspector() {}

    public static InspectionRunDto inspect(
            List<AgentRecordDto> catalog,
            Path repoRoot,
            String source) throws java.io.IOException {
        List<AgentesWorkflowIndex.WorkflowFile> workflows = AgentesWorkflowIndex.readWorkflows(repoRoot);
        String docsBlob = AgentesWorkflowIndex.readDocsBlob(repoRoot);
        return buildRun(catalog, workflows, docsBlob, repoRoot, source);
    }

    static InspectionRunDto buildRun(
            List<AgentRecordDto> catalog,
            List<AgentesWorkflowIndex.WorkflowFile> workflows,
            String docsBlob,
            Path repoRoot,
            String source) {
        List<AgentInspectionDto> agents = new ArrayList<>();
        for (AgentRecordDto agent : catalog) {
            agents.add(evaluate(agent, workflows, docsBlob, repoRoot));
        }
        agregarAusentes(catalog, agents);
        agents.sort(Comparator.comparing(AgentInspectionDto::id, AgentesInspector::compareIds));
        String ranAt = Instant.now().toString();
        String runId = "i1-" + ranAt.replace(':', '-').replace('.', '-');
        return new InspectionRunDto(runId, ranAt, source, ".", tally(agents), List.copyOf(agents));
    }

    static AgentInspectionDto evaluate(
            AgentRecordDto agent,
            List<AgentesWorkflowIndex.WorkflowFile> workflows,
            String docsBlob,
            Path repoRoot) {
        Pattern re = AgentesStatusRules.idBoundary(agent.id());
        boolean docsFound = re.matcher(docsBlob).find() || docFileExists(repoRoot, agent.doc());
        AgentesWorkflowIndex.WorkflowFile wf = findWorkflow(agent, workflows, re);
        boolean workflowFound = wf != null;
        boolean scriptFound = scriptExists(repoRoot, agent.script());
        boolean cadenceMatch = wf != null && AgentesStatusRules.cadenceMatches(agent.cadence(), wf.triggers());
        List<String> notes = notas(agent, docsFound, workflowFound, scriptFound, cadenceMatch);
        String status = AgentesStatusRules.decideStatus(
                docsFound, workflowFound, scriptFound, cadenceMatch,
                agent.workflow() != null && !agent.workflow().isBlank(),
                agent.script() != null && !agent.script().isBlank());
        if (AgentesStatusRules.AL_DIA.equals(status) && notes.isEmpty()) {
            notes = List.of("Doc, workflow y script presentes; trigger coherente");
        }
        String wfName = wf != null ? wf.name() : agent.workflow();
        return new AgentInspectionDto(
                agent.id(), status, workflowFound, wfName, docsFound, scriptFound, cadenceMatch, notes);
    }

    private static List<String> notas(
            AgentRecordDto agent,
            boolean docsFound,
            boolean workflowFound,
            boolean scriptFound,
            boolean cadenceMatch) {
        List<String> notes = new ArrayList<>();
        if (!docsFound) {
            notes.add("No aparece en docs/AGENTES_*.md");
        }
        if (agent.workflow() != null && !workflowFound) {
            notes.add("Falta workflow " + agent.workflow());
        }
        if (agent.workflow() == null && !workflowFound) {
            notes.add("Sin workflow asignado");
        }
        if (agent.script() != null && !scriptFound) {
            notes.add("Falta script " + agent.script());
        }
        if (workflowFound && !cadenceMatch) {
            notes.add("Trigger no calza con cadencia " + agent.cadence());
        }
        return notes;
    }

    private static AgentesWorkflowIndex.WorkflowFile findWorkflow(
            AgentRecordDto agent,
            List<AgentesWorkflowIndex.WorkflowFile> index,
            Pattern re) {
        if (agent.workflow() != null) {
            for (AgentesWorkflowIndex.WorkflowFile w : index) {
                if (agent.workflow().equals(w.name())) {
                    return w;
                }
            }
        }
        for (AgentesWorkflowIndex.WorkflowFile w : index) {
            if (re.matcher(w.content()).find()) {
                return w;
            }
        }
        return null;
    }

    private static boolean docFileExists(Path repoRoot, String doc) {
        return doc != null && Files.isRegularFile(repoRoot.resolve(doc));
    }

    private static boolean scriptExists(Path repoRoot, String script) {
        return script != null && Files.isRegularFile(repoRoot.resolve(script));
    }

    static List<String> knownIds() {
        List<String> ids = new ArrayList<>(MAX_D + MAX_S + MAX_E + 3);
        for (int i = 1; i <= MAX_D; i++) {
            ids.add("D" + i);
        }
        for (int i = 1; i <= MAX_S; i++) {
            ids.add("S" + i);
        }
        for (int i = 1; i <= MAX_E; i++) {
            ids.add("E" + i);
        }
        ids.add("DOC1");
        ids.add("SCALE1");
        ids.add("I1");
        return ids;
    }

    private static void agregarAusentes(List<AgentRecordDto> catalog, List<AgentInspectionDto> agents) {
        for (String id : knownIds()) {
            boolean presente = catalog.stream().anyMatch(a -> id.equals(a.id()));
            if (presente) {
                continue;
            }
            agents.add(new AgentInspectionDto(
                    id, AgentesStatusRules.ACTIVAR, false, null, false, false, false,
                    List.of("ID conocido ausente del catálogo data/agents.json")));
        }
    }

    private static InspectionSummaryDto tally(List<AgentInspectionDto> agents) {
        int alDia = 0;
        int activar = 0;
        int actualizar = 0;
        int mejorar = 0;
        for (AgentInspectionDto row : agents) {
            switch (row.status()) {
                case AgentesStatusRules.AL_DIA -> alDia++;
                case AgentesStatusRules.ACTIVAR -> activar++;
                case AgentesStatusRules.ACTUALIZAR -> actualizar++;
                case AgentesStatusRules.MEJORAR -> mejorar++;
                default -> { }
            }
        }
        return new InspectionSummaryDto(alDia, activar, actualizar, mejorar);
    }

    static int compareIds(String a, String b) {
        String[] pa = splitId(a);
        String[] pb = splitId(b);
        int pref = pa[0].compareTo(pb[0]);
        if (pref != 0) {
            return pref;
        }
        return Integer.compare(Integer.parseInt(pa[1]), Integer.parseInt(pb[1]));
    }

    private static String[] splitId(String id) {
        int i = id.length() - 1;
        while (i >= 0 && Character.isDigit(id.charAt(i))) {
            i--;
        }
        if (i < 0 || i == id.length() - 1) {
            return new String[] {id, "0"};
        }
        return new String[] {id.substring(0, i + 1), id.substring(i + 1)};
    }
}
