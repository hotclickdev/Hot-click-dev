package com.hotclick.agente.ventas;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.rag.service.EmbeddingService;
import com.hotclick.service.catalogo.ChatRankingConstants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Conocimiento del bot por tienda (políticas, envíos, horarios, FAQ). La API y el panel son AG-16/AG-22; aquí solo
 * el servicio. {@code empresaId == null} es el conocimiento de HotClick, nunca "todas las empresas": el alcance
 * se fija con el parámetro y el repositorio lo aplica en cada consulta (el llamador ya validó la pertenencia).
 */
@Service
public class ConocimientoService {

    private static final Logger log = LoggerFactory.getLogger(ConocimientoService.class);

    static final int TITULO_MAX = 200;
    static final int CONTENIDO_MAX = 4_000;
    static final int RESULTADOS = 3;

    private final ConocimientoRepository repo;
    private final EmbeddingService embeddings;

    public ConocimientoService(ConocimientoRepository repo, EmbeddingService embeddings) {
        this.repo = repo;
        this.embeddings = embeddings;
    }

    public List<ConocimientoRepository.Fila> listar(Long empresaId) {
        return repo.listar(empresaId);
    }

    public long crear(Long empresaId, String titulo, String contenido, String categoria, boolean activo) {
        validar(titulo, contenido);
        long id = repo.insertar(empresaId, titulo.strip(), contenido.strip(), limpiar(categoria), activo);
        indexar(id, empresaId, titulo, contenido);
        return id;
    }

    public void actualizar(Long id, Long empresaId, String titulo, String contenido, String categoria, boolean activo) {
        validar(titulo, contenido);
        if (!repo.actualizar(id, empresaId, titulo.strip(), contenido.strip(), limpiar(categoria), activo)) {
            throw new RecursoNoEncontradoException("Conocimiento no encontrado");
        }
        indexar(id, empresaId, titulo, contenido);
    }

    public void eliminar(Long id, Long empresaId) {
        if (!repo.eliminar(id, empresaId)) throw new RecursoNoEncontradoException("Conocimiento no encontrado");
    }

    /** Busca en el conocimiento del alcance: vectorial si hay embeddings; si no, por palabras. */
    public List<ConocimientoRepository.Fila> buscar(Long empresaId, String pregunta) {
        if (pregunta == null || pregunta.isBlank()) return List.of();
        List<ConocimientoRepository.Fila> r = List.of();
        try {
            float[] v = embeddings.generarEmbedding(pregunta);
            r = repo.buscarSimilares(empresaId, v, RESULTADOS, ChatRankingConstants.CHAT_DISTANCIA_MAXIMA);
        } catch (RuntimeException e) {
            log.debug("[agente-conocimiento] búsqueda vectorial no disponible ({})", e.getClass().getSimpleName());
        }
        if (!r.isEmpty()) return r;
        try {
            return repo.buscarPorPalabras(empresaId, palabrasClave(pregunta), RESULTADOS);
        } catch (RuntimeException e) {
            log.warn("[agente-conocimiento] búsqueda por palabras falló ({})", e.getClass().getSimpleName());
            return List.of();
        }
    }

    static List<String> palabrasClave(String pregunta) {
        Map<String, Boolean> unicas = new LinkedHashMap<>();
        Arrays.stream(pregunta.toLowerCase(java.util.Locale.ROOT).split("[^\\p{L}\\p{N}]+"))
            .filter(p -> p.length() >= 4)
            .limit(8)
            .forEach(p -> unicas.put(p, true));
        return List.copyOf(unicas.keySet());
    }

    private void indexar(long id, Long empresaId, String titulo, String contenido) {
        try {
            repo.guardarEmbedding(id, empresaId, embeddings.generarEmbedding(titulo + "\n" + contenido));
        } catch (RuntimeException e) {
            // Sin Voyage o sin pgvector el registro queda guardado y se encuentra por palabras.
            log.warn("[agente-conocimiento] no se pudo indexar el conocimiento {} ({})", id, e.getClass().getSimpleName());
        }
    }

    private static void validar(String titulo, String contenido) {
        if (titulo == null || titulo.isBlank() || titulo.length() > TITULO_MAX)
            throw new IllegalArgumentException("Título obligatorio (máx. " + TITULO_MAX + " caracteres)");
        if (contenido == null || contenido.isBlank() || contenido.length() > CONTENIDO_MAX)
            throw new IllegalArgumentException("Contenido obligatorio (máx. " + CONTENIDO_MAX + " caracteres)");
    }

    private static String limpiar(String categoria) {
        if (categoria == null || categoria.isBlank()) return null;
        String c = categoria.strip();
        return c.length() > 50 ? c.substring(0, 50) : c;
    }
}
