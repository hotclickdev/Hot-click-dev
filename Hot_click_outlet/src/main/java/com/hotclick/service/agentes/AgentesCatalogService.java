package com.hotclick.service.agentes;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.agentes.AgentesInspectResultDto;
import com.hotclick.dto.agentes.AgentesSnapshotDto;
import com.hotclick.dto.agentes.CatalogFileDto;
import com.hotclick.dto.agentes.InspectionRunDto;
import com.hotclick.dto.agentes.InspectionsFileDto;
import com.hotclick.dto.agentes.OlasFileDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Catálogo I1 de ingeniería (plataforma, no tenant).
 * Lectura desde classpath; la corrida en vivo solo si el clone está en disco.
 */
@Service
public class AgentesCatalogService {

    public static final String HINT_SIN_REPO =
            "En este entorno no está el árbol .github/workflows + docs. "
                    + "El historial sale del JSON empaquetado. Para una corrida durable: "
                    + "Action inspect-agents.yml (lunes 08:15 CR) o npm run inspect en el clone.";

    private static final Logger LOG = LoggerFactory.getLogger(AgentesCatalogService.class);
    private static final int MAX_RUNS = 30;

    private final ObjectMapper objectMapper;
    private final String repoRootConfig;
    private final String writeDirConfig;

    public AgentesCatalogService(
            ObjectMapper objectMapper,
            @Value("${hotclick.agentes.repo-root:}") String repoRootConfig,
            @Value("${hotclick.agentes.write-dir:}") String writeDirConfig) {
        this.objectMapper = objectMapper;
        this.repoRootConfig = repoRootConfig;
        this.writeDirConfig = writeDirConfig;
    }

    public AgentesSnapshotDto snapshot() {
        return new AgentesSnapshotDto(loadCatalogo(), loadOlas(), loadInspecciones(), liveInspectAvailable());
    }

    public CatalogFileDto loadCatalogo() {
        return readClasspath("agents.json", CatalogFileDto.class, CatalogFileDto.vacio());
    }

    public OlasFileDto loadOlas() {
        return readClasspath("olas.json", OlasFileDto.class, OlasFileDto.vacio());
    }

    public InspectionsFileDto loadInspecciones() {
        InspectionsFileDto overlay = readPath(writeDir().resolve("inspections.json"));
        if (overlay != null && !overlay.runsOrEmpty().isEmpty()) {
            return overlay;
        }
        return readClasspath("inspections.json", InspectionsFileDto.class, InspectionsFileDto.vacio());
    }

    public boolean liveInspectAvailable() {
        return repoRoot() != null;
    }

    public Optional<AgentesInspectResultDto> tryInspect() {
        Path root = repoRoot();
        if (root == null) {
            return Optional.empty();
        }
        try {
            InspectionRunDto run = AgentesInspector.inspect(loadCatalogo().agentsOrEmpty(), root, "api");
            boolean persisted = persistRun(run);
            return Optional.of(new AgentesInspectResultDto(run, persisted, true, null));
        } catch (IOException e) {
            LOG.warn("I1 no pudo escanear el repo en {}", root, e);
            throw new IllegalStateException("I1 falló al leer workflows o docs", e);
        }
    }

    Path repoRoot() {
        return AgentesRepoLocator.findRepoRoot(repoRootConfig, System.getProperty("user.dir"));
    }

    Path writeDir() {
        if (writeDirConfig != null && !writeDirConfig.isBlank()) {
            return Path.of(writeDirConfig).toAbsolutePath().normalize();
        }
        return Path.of(System.getProperty("user.dir", ".")).resolve("target").resolve("agentes");
    }

    boolean persistRun(InspectionRunDto run) {
        try {
            Path dir = writeDir();
            Files.createDirectories(dir);
            Path out = dir.resolve("inspections.json");
            List<InspectionRunDto> runs = new ArrayList<>();
            runs.add(run);
            for (InspectionRunDto prev : loadInspecciones().runsOrEmpty()) {
                if (run.id().equals(prev.id())) {
                    continue;
                }
                runs.add(prev);
                if (runs.size() >= MAX_RUNS) {
                    break;
                }
            }
            InspectionsFileDto payload = new InspectionsFileDto(run.ranAt(), List.copyOf(runs));
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(out.toFile(), payload);
            return true;
        } catch (IOException e) {
            LOG.warn("I1 no pudo persistir inspections.json en {}", writeDir(), e);
            return false;
        }
    }

    private InspectionsFileDto readPath(Path path) {
        if (!Files.isRegularFile(path)) {
            return null;
        }
        try (InputStream in = Files.newInputStream(path)) {
            return objectMapper.readValue(in, InspectionsFileDto.class);
        } catch (IOException e) {
            LOG.warn("No se pudo leer overlay I1 {}", path, e);
            return null;
        }
    }

    private <T> T readClasspath(String name, Class<T> type, T fallback) {
        ClassPathResource resource = new ClassPathResource("agentes/" + name);
        if (!resource.exists()) {
            return fallback;
        }
        try (InputStream in = resource.getInputStream()) {
            T value = objectMapper.readValue(in, type);
            return value != null ? value : fallback;
        } catch (IOException e) {
            LOG.warn("No se pudo leer classpath agentes/{}", name, e);
            return fallback;
        }
    }
}
