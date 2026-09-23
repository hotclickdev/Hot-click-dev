package com.hotclick.service.agentes;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AgentesRepoLocator")
class AgentesRepoLocatorTest {

    @TempDir
    Path temp;

    @Test
    @DisplayName("encuentra la raíz con workflows y docs")
    void encuentraRaiz() throws Exception {
        Files.createDirectories(temp.resolve("clone").resolve(".github").resolve("workflows"));
        Files.createDirectories(temp.resolve("clone").resolve("docs"));
        Path nested = temp.resolve("clone").resolve("Hot_click_outlet");
        Files.createDirectories(nested);
        Path found = AgentesRepoLocator.findRepoRoot("", nested.toString());
        assertThat(found).isEqualTo(temp.resolve("clone").toAbsolutePath().normalize());
    }

    @Test
    @DisplayName("sin árbol git no inventa una raíz")
    void sinArbol() {
        assertThat(AgentesRepoLocator.findRepoRoot("", temp.toString())).isNull();
        assertThat(AgentesRepoLocator.esRaizRepo(temp)).isFalse();
    }

    @Test
    @DisplayName("respeta repo-root configurado")
    void configurado() throws Exception {
        Path clone = temp.resolve("repo");
        Files.createDirectories(clone.resolve(".github").resolve("workflows"));
        Files.createDirectories(clone.resolve("docs"));
        Path found = AgentesRepoLocator.findRepoRoot(clone.toString(), temp.toString());
        assertThat(found).isEqualTo(clone.toAbsolutePath().normalize());
    }
}
