package com.hotclick.rag.scheduler;

import com.hotclick.rag.event.ProductoGuardadoEvent;
import com.hotclick.rag.repository.ProductoEmbeddingRepository;
import com.hotclick.rag.repository.ProductoEmbeddingRepository.ProductoIndexRow;
import com.hotclick.rag.service.EmbeddingService;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mantiene los embeddings de productos sincronizados con el catálogo mediante dos rutas:
 *
 * <ol>
 *   <li><b>Batch nocturno (4:00 AM)</b>: procesa lotes de {@value #BATCH_SIZE} productos
 *       que no tienen embedding o cuyo modelo está desactualizado. Protegido con ShedLock
 *       — exactamente un pod lo ejecuta en despliegues multi-instancia.</li>
 *
 *   <li><b>Evento inmediato</b>: cuando el admin guarda un producto, re-indexa ese
 *       producto solo de forma asíncrona sin bloquear el hilo HTTP del request.
 *       Si Gemini falla, el error se registra y el batch nocturno recogerá el producto.</li>
 * </ol>
 *
 * <h3>Acerca del delay entre llamadas (rag.indexer.batch-delay-ms)</h3>
 * Gemini free tier: 15 req/min. Con 100 productos y 400 ms de delay → ~40 s por batch,
 * lo que equivale a ~150 req/min sin el delay. El default de 400 ms mantiene la tasa
 * en ~2,5 req/s (150 req/min), bien por debajo del límite.
 * Ajustar a 0 en entornos con cuota Gemini paga.
 */
@Component
public class EmbeddingIndexerService {

    private static final Logger log = LoggerFactory.getLogger(EmbeddingIndexerService.class);
    private static final int BATCH_SIZE = 100;

    /** Milisegundos de espera entre llamadas a Gemini dentro del batch nocturno. */
    @Value("${rag.indexer.batch-delay-ms:400}")
    private long batchDelayMs;

    private final EmbeddingService             embeddingService;
    private final ProductoEmbeddingRepository  embeddingRepo;

    public EmbeddingIndexerService(EmbeddingService embeddingService,
                                   ProductoEmbeddingRepository embeddingRepo) {
        this.embeddingService = embeddingService;
        this.embeddingRepo    = embeddingRepo;
    }

    // ── Batch nocturno ────────────────────────────────────────────────────────

    // Cron escalonado respecto a los schedulers existentes:
    //   2:30 → data_retention
    //   3:00 → billing_renewal / abc_analysis
    //   3:30 → productos_inactivos
    //   4:00 → embedding_indexer_job  (aquí)
    //
    // lockAtMostFor="PT15M": si el pod muere, el lock se libera y otro pod puede
    //   tomar el trabajo tras 15 minutos — evita que quede bloqueado para siempre.
    // lockAtLeastFor="PT5M": evita que un segundo pod comience inmediatamente si
    //   el job termina en segundos (ej. cuando no hay nada que indexar).

    @Scheduled(cron = "${rag.indexer.cron:0 0 4 * * *}")
    @SchedulerLock(name = "embedding_indexer_job",
                   lockAtMostFor = "PT15M",
                   lockAtLeastFor = "PT5M")
    public void indexarLoteNocturno() {
        log.info("[embedding] Iniciando batch nocturno (batchSize={}, delayMs={})",
            BATCH_SIZE, batchDelayMs);
        long inicio = System.currentTimeMillis();

        List<ProductoIndexRow> lote = embeddingRepo.findProductosSinEmbedding(BATCH_SIZE);

        if (lote.isEmpty()) {
            log.info("[embedding] Nada que indexar — todos los productos están al día");
            return;
        }

        int indexados = 0;
        int fallidos  = 0;

        for (ProductoIndexRow row : lote) {
            try {
                String texto  = construirTextoIndexado(row);
                float[] vector = embeddingService.generarEmbedding(texto);
                embeddingRepo.upsertEmbedding(row.productoId(), row.empresaId(), vector, texto);
                indexados++;

                // Pausa entre llamadas para respetar el rate limit de Gemini
                if (batchDelayMs > 0) {
                    Thread.sleep(batchDelayMs);
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                log.warn("[embedding] Batch interrumpido en producto id={} — se reanudará en el próximo ciclo",
                    row.productoId());
                break;
            } catch (Exception e) {
                // Error aislado: un producto que falla no aborta el lote completo.
                // El batch nocturno del día siguiente intentará indexarlo de nuevo.
                fallidos++;
                log.warn("[embedding] No se pudo indexar producto id={}: {}",
                    row.productoId(), e.getMessage());
            }
        }

        long ms = System.currentTimeMillis() - inicio;
        log.info("[embedding] Batch completado — indexados={}, fallidos={}, duracion={}ms",
            indexados, fallidos, ms);
    }

    // ── Evento inmediato ──────────────────────────────────────────────────────

    // @Async("taskExecutor") despacha la indexación al pool hotclick-async-*.
    // El pool usa TenantAwareTaskDecorator, por lo que el contexto de empresa
    // se propaga correctamente al hilo async.
    //
    // Si Gemini falla, se registra un WARNING y se retorna sin propagar la excepción
    // — el admin no debe ver un error 500 por un fallo de indexación de embedding.
    // El batch nocturno recoge cualquier producto que quede sin indexar.
    //
    // Nota sobre CallerRunsPolicy: si la cola del taskExecutor está llena (100 tasks),
    // el hilo del request HTTP ejecutará la indexación sincrónicamente. Esto es
    // aceptable dado el volumen actual de HOTCLICK.

    @EventListener
    @Async("taskExecutor")
    public void onProductoGuardado(ProductoGuardadoEvent event) {
        if (event.getEmpresaId() == null) {
            log.debug("[embedding] Producto id={} sin empresa — omitido del indexador",
                event.getProductoId());
            return;
        }
        try {
            String  texto  = construirTextoIndexadoDesdeEvento(event);
            float[] vector = embeddingService.generarEmbedding(texto);
            embeddingRepo.upsertEmbedding(
                event.getProductoId(), event.getEmpresaId(), vector, texto);
            log.debug("[embedding] Producto id={} indexado por evento de guardado",
                event.getProductoId());
        } catch (Exception e) {
            log.warn("[embedding] Fallo al indexar producto id={} desde evento: {}",
                event.getProductoId(), e.getMessage());
        }
    }

    // ── Construcción del texto de indexación ──────────────────────────────────

    // El precio se omite intencionalmente: cambia con frecuencia (ofertas, ajustes)
    // y re-generaría el embedding en cada modificación sin mejorar la similitud
    // semántica. El precio se usa como filtro post-RAG, no como señal de embedding.

    static String construirTextoIndexado(ProductoIndexRow row) {
        return construirTexto(
            row.nombreProducto(),
            row.descripcionCorta(),
            row.marcaTexto(),
            row.sku(),
            row.tags(),
            row.especificaciones()
        );
    }

    static String construirTextoIndexadoDesdeEvento(ProductoGuardadoEvent e) {
        return construirTexto(
            e.getNombreProducto(),
            e.getDescripcionCorta(),
            e.getMarcaTexto(),
            e.getSku(),
            e.getTags(),
            e.getEspecificaciones()
        );
    }

    private static String construirTexto(String nombre, String descripcion, String marca,
                                         String sku, String tags, String especificaciones) {
        StringBuilder sb = new StringBuilder();
        appendSi(sb, nombre);
        appendSi(sb, descripcion);
        if (marca != null && !marca.isBlank())
            sb.append("Marca: ").append(marca.trim()).append(". ");
        if (sku != null && !sku.isBlank())
            sb.append("SKU: ").append(sku.trim()).append(". ");
        if (tags != null && !tags.isBlank())
            sb.append("Tags: ").append(tags.trim()).append(". ");
        if (especificaciones != null && !especificaciones.isBlank()) {
            // Las especificaciones pueden ser largas (HTML rich text).
            // Se limitan a 500 chars para no exceder el input de la API de embedding.
            String specs = especificaciones.trim();
            sb.append(specs.length() > 500 ? specs.substring(0, 500) + "…" : specs);
        }
        return sb.toString().trim();
    }

    private static void appendSi(StringBuilder sb, String valor) {
        if (valor != null && !valor.isBlank())
            sb.append(valor.trim()).append(". ");
    }
}
