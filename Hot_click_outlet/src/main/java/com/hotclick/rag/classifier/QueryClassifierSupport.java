package com.hotclick.rag.classifier;

import java.util.Set;

/**
 * Helpers de puntuación del clasificador de consultas RAG.
 * Extraído bit-idéntico de QueryClassifier — no cambia comportamiento.
 */
final class QueryClassifierSupport {

    private QueryClassifierSupport() {}

    static QueryClassification classifyDomainType(String q) {
        int compraScore  = countKeywordsFrom(q, QueryClassifierLexicon.COMPRA_KEYWORDS);
        int soporteScore = countKeywordsFrom(q, QueryClassifierLexicon.SOPORTE_KEYWORDS);
        if (soporteScore >= compraScore && soporteScore > 0) return QueryClassification.SOPORTE;
        if (compraScore > 0) return QueryClassification.COMPRA;
        return QueryClassification.PRODUCTO;
    }

    static int countDomainKeywords(String q) {
        return countKeywordsFrom(q, QueryClassifierLexicon.DOMAIN_KEYWORDS);
    }

    static int countKeywordsFrom(String q, Set<String> keywords) {
        int count = 0;
        for (String kw : keywords) {
            if (q.contains(kw)) count++;
        }
        return count;
    }
}
