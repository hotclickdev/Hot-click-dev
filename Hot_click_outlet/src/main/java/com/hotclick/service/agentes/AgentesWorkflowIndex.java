package com.hotclick.service.agentes;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/** Índice de workflows YAML + blob de docs/AGENTES_*.md. */
final class AgentesWorkflowIndex {

    private static final String DOC_PREFIX = "AGENTES_";

    private AgentesWorkflowIndex() {}

    static List<WorkflowFile> readWorkflows(Path repoRoot) throws IOException {
        Path dir = repoRoot.resolve(".github").resolve("workflows");
        if (!Files.isDirectory(dir)) {
            return List.of();
        }
        List<WorkflowFile> out = new ArrayList<>();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(dir)) {
            for (Path file : stream) {
                WorkflowFile parsed = parseWorkflow(file);
                if (parsed != null) {
                    out.add(parsed);
                }
            }
        }
        return out;
    }

    private static WorkflowFile parseWorkflow(Path file) throws IOException {
        String name = file.getFileName().toString();
        if (!name.endsWith(".yml") && !name.endsWith(".yaml")) {
            return null;
        }
        if (!Files.isRegularFile(file)) {
            return null;
        }
        String content = Files.readString(file, StandardCharsets.UTF_8);
        return new WorkflowFile(name, content, AgentesStatusRules.detectTriggers(content));
    }

    static String readDocsBlob(Path repoRoot) throws IOException {
        Path docsDir = repoRoot.resolve("docs");
        if (!Files.isDirectory(docsDir)) {
            return "";
        }
        StringBuilder blob = new StringBuilder();
        try (DirectoryStream<Path> stream = Files.newDirectoryStream(docsDir)) {
            for (Path file : stream) {
                appendDoc(blob, file);
            }
        }
        return blob.toString();
    }

    private static void appendDoc(StringBuilder blob, Path file) throws IOException {
        String name = file.getFileName().toString();
        if (!name.startsWith(DOC_PREFIX) || !name.endsWith(".md") || !Files.isRegularFile(file)) {
            return;
        }
        blob.append(Files.readString(file, StandardCharsets.UTF_8)).append('\n');
    }

    record WorkflowFile(String name, String content, WorkflowTriggers triggers) {}
}
