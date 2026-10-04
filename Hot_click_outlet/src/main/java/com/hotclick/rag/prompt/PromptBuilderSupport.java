package com.hotclick.rag.prompt;


/**
 * Utilidades compartidas para construcción de prompts RAG.
 * Extraído bit-idéntico de PromptBuilder — no cambia comportamiento.
 */
final class PromptBuilderSupport {

    private PromptBuilderSupport() {}

    /** Escapa caracteres XML para evitar que datos de productos rompan la estructura del prompt. */
    static String xmlEscape(String s) {
        if (s == null || s.isBlank()) return "";
        return s.replace("&",  "&amp;")
                .replace("<",  "&lt;")
                .replace(">",  "&gt;")
                .replace("\"", "&quot;")
                .replace("'",  "&apos;");
    }
}
