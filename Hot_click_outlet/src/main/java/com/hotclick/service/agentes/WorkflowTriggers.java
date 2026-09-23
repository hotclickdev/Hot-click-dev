package com.hotclick.service.agentes;

import java.util.regex.Pattern;

/** Triggers detectados en un YAML de GitHub Actions. */
public record WorkflowTriggers(
        boolean hasSchedule,
        boolean hasPr,
        boolean hasPush,
        boolean hasWorkflowRun,
        boolean hasIssues,
        boolean hasDispatch
) {
}
