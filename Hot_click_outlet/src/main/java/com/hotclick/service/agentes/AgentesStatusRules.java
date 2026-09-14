package com.hotclick.service.agentes;

import java.util.regex.Pattern;

/**
 * Reglas I1: estado al_día / activar / actualizar / mejorar.
 * Equivalente a agentes-dashboard/scripts/inspect-agents.mjs.
 */
public final class AgentesStatusRules {

    public static final String AL_DIA = "al_dia";
    public static final String ACTIVAR = "activar";
    public static final String ACTUALIZAR = "actualizar";
    public static final String MEJORAR = "mejorar";

    private static final Pattern SCHEDULE = Pattern.compile("^\\s*schedule:", Pattern.MULTILINE);
    private static final Pattern CRON = Pattern.compile("^\\s*-\\s*cron:", Pattern.MULTILINE);
    private static final Pattern PR = Pattern.compile("^\\s*pull_request:", Pattern.MULTILINE);
    private static final Pattern PUSH = Pattern.compile("^\\s*push:", Pattern.MULTILINE);
    private static final Pattern WORKFLOW_RUN = Pattern.compile("^\\s*workflow_run:", Pattern.MULTILINE);
    private static final Pattern ISSUES = Pattern.compile("^\\s*issues:", Pattern.MULTILINE);
    private static final Pattern DISPATCH = Pattern.compile("^\\s*workflow_dispatch:", Pattern.MULTILINE);

    private AgentesStatusRules() {}

    public static Pattern idBoundary(String id) {
        return Pattern.compile("(?<![A-Z0-9])" + Pattern.quote(id) + "(?![0-9])");
    }

    public static WorkflowTriggers detectTriggers(String yaml) {
        String text = yaml == null ? "" : yaml;
        return new WorkflowTriggers(
                SCHEDULE.matcher(text).find() || CRON.matcher(text).find(),
                PR.matcher(text).find(),
                PUSH.matcher(text).find(),
                WORKFLOW_RUN.matcher(text).find(),
                ISSUES.matcher(text).find(),
                DISPATCH.matcher(text).find());
    }

    public static boolean cadenceMatches(String cadence, WorkflowTriggers triggers) {
        if ("daily".equals(cadence) || "weekly".equals(cadence)) {
            return triggers.hasSchedule();
        }
        if ("event".equals(cadence)) {
            return triggers.hasPr()
                    || triggers.hasPush()
                    || triggers.hasWorkflowRun()
                    || triggers.hasIssues()
                    || triggers.hasSchedule()
                    || triggers.hasDispatch();
        }
        return true;
    }

    public static String decideStatus(
            boolean docsFound,
            boolean workflowFound,
            boolean scriptFound,
            boolean cadenceMatch,
            boolean expectsWorkflow,
            boolean expectsScript) {
        if (!docsFound && !workflowFound && !expectsWorkflow) {
            return ACTIVAR;
        }
        if (!workflowFound && expectsWorkflow) {
            return ACTUALIZAR;
        }
        if (workflowFound && !docsFound) {
            return ACTUALIZAR;
        }
        if (workflowFound && expectsScript && !scriptFound) {
            return MEJORAR;
        }
        if (workflowFound && docsFound && !cadenceMatch) {
            return ACTUALIZAR;
        }
        if (workflowFound && docsFound) {
            return AL_DIA;
        }
        return ACTIVAR;
    }
}
