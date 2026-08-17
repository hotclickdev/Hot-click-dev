package com.hotclick.rag.classifier;

import org.springframework.stereotype.Component;

/**
 * Clasificador ligero de consultas del asistente de compras.
 *
 * Se ejecuta ANTES de cualquier llamada a Voyage AI o Claude, por lo que
 * su costo computacional es cero: solo regex y lookups en Set.
 *
 * Prioridad de clasificación:
 *   1. PROMPT_INJECTION  — patrón de manipulación del sistema
 *   2. PRODUCTO/COMPRA/SOPORTE — contiene palabras del dominio HOTCLICK
 *   3. FUERA_DE_DOMINIO  — contiene palabras de dominio ajeno y ninguna del dominio
 *   4. PRODUCTO          — default / consulta ambigua o vacía → beneficio de duda
 *
 * Los patrones se compilan una única vez al inicio de la aplicación.
 */
@Component
public class QueryClassifier {

    // ── Clasificación pública ─────────────────────────────────────────────────

    /**
     * Clasifica una consulta del usuario.
     * El resultado determina si el pipeline RAG debe ejecutarse o no.
     *
     * @param query Texto ya sanitizado del usuario.
     * @return Clasificación de la consulta.
     */
    public QueryClassification classify(String query) {
        if (query == null || query.isBlank()) return QueryClassification.PRODUCTO;

        String q = query.toLowerCase().trim();

        // 1. Hard block terms → siempre PROMPT_INJECTION
        for (String term : QueryClassifierLexicon.HARD_BLOCK_TERMS) {
            if (q.contains(term)) return QueryClassification.PROMPT_INJECTION;
        }

        // 2. Patrones de prompt injection → PROMPT_INJECTION
        for (var pattern : QueryClassifierLexicon.INJECTION_PATTERNS) {
            if (pattern.matcher(q).find()) return QueryClassification.PROMPT_INJECTION;
        }

        // 3. Palabras del dominio → consulta válida (clasificar tipo)
        int domainScore = QueryClassifierSupport.countDomainKeywords(q);
        if (domainScore > 0) {
            return QueryClassifierSupport.classifyDomainType(q);
        }

        // 4. Patrones fuera de dominio → FUERA_DE_DOMINIO
        for (var pattern : QueryClassifierLexicon.OOD_PATTERNS) {
            if (pattern.matcher(q).find()) return QueryClassification.FUERA_DE_DOMINIO;
        }

        // 5. Default: beneficio de duda → PRODUCTO
        //    Consultas cortas o ambiguas sin señales claras se permiten.
        //    El pipeline RAG decidirá si hay respuesta relevante o no.
        return QueryClassification.PRODUCTO;
    }
}
