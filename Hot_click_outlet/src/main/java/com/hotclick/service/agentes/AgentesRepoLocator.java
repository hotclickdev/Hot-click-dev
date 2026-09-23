package com.hotclick.service.agentes;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Localiza la raíz del clone (`.github/workflows` + `docs`).
 * En Docker de producción normalmente no está; I1 queda read-mostly.
 */
public final class AgentesRepoLocator {

    private static final int MAX_WALK = 8;

    private AgentesRepoLocator() {}

    public static Path findRepoRoot(String configured, String userDir) {
        for (Path seed : seeds(configured, userDir)) {
            Path found = walkUp(seed);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    static List<Path> seeds(String configured, String userDir) {
        List<Path> seeds = new ArrayList<>();
        addIfPresent(seeds, configured);
        addIfPresent(seeds, userDir);
        if (userDir != null && !userDir.isBlank()) {
            Path cwd = Path.of(userDir).toAbsolutePath().normalize();
            Path parent = cwd.getParent();
            if (parent != null) {
                seeds.add(parent);
            }
        }
        return seeds;
    }

    private static void addIfPresent(List<Path> seeds, String raw) {
        if (raw == null || raw.isBlank()) {
            return;
        }
        seeds.add(Path.of(raw).toAbsolutePath().normalize());
    }

    private static Path walkUp(Path start) {
        Path dir = start;
        for (int i = 0; i < MAX_WALK; i++) {
            if (esRaizRepo(dir)) {
                return dir;
            }
            Path parent = dir.getParent();
            if (parent == null || parent.equals(dir)) {
                break;
            }
            dir = parent;
        }
        return null;
    }

    public static boolean esRaizRepo(Path dir) {
        return Files.isDirectory(dir.resolve(".github").resolve("workflows"))
                && Files.isDirectory(dir.resolve("docs"));
    }
}
