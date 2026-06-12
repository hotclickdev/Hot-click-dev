package com.hotclick.rag.controller;

import com.hotclick.rag.scheduler.EmbeddingIndexerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Operaciones admin del pipeline RAG.
 *
 * Estas acciones son potencialmente costosas (llamadas a Gemini) y están
 * protegidas con {@code ADMIN} / {@code ADMIN_IT}.
 */
@RestController
@RequestMapping("/api/admin/rag")
public class RagAdminController {

    private static final Logger log = LoggerFactory.getLogger(RagAdminController.class);

    private final EmbeddingIndexerService indexerService;

    public RagAdminController(EmbeddingIndexerService indexerService) {
        this.indexerService = indexerService;
    }

    /**
     * Dispara el indexador de embeddings ahora, sin esperar al cron de las 4 AM.
     *
     * <p>Se ejecuta en un virtual thread para no bloquear el request HTTP.
     * El {@code @SchedulerLock} en {@link EmbeddingIndexerService#indexarLoteNocturno}
     * evita que dos llamadas simultáneas dupliquen trabajo.
     *
     * <p>Devuelve {@code 202 Accepted} inmediatamente. Seguir el progreso
     * en los logs del servidor ({@code [embedding] ...}).
     */
    @PostMapping("/indexar")
    @PreAuthorize("hasRole('ADMIN') or hasRole('ADMIN_IT')")
    public ResponseEntity<Map<String, Object>> indexarAhora() {
        log.info("[rag-admin] Indexación manual disparada por admin");
        Thread.ofVirtual()
              .name("rag-indexer-manual")
              .start(indexerService::indexarLoteNocturno);
        return ResponseEntity.accepted().body(Map.of(
            "status",  "iniciado",
            "mensaje", "Indexación de embeddings en curso en segundo plano. " +
                       "Revisá los logs del servidor para seguir el progreso ([embedding] ...)."
        ));
    }
}
