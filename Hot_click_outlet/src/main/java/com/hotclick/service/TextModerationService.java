package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Moderación de contenido textual.
 * Rechaza texto que contenga términos explícitos o para adultos.
 * Aplica normalización (minúsculas, sin tildes, leet speak) antes de comparar
 * para detectar evasiones comunes como "p0rn0" o "s3x0".
 */
@Service
public class TextModerationService {

    private static final Logger log = LoggerFactory.getLogger(TextModerationService.class);

    public record ModerationResult(boolean safe, String reason) {}

    // -----------------------------------------------------------------------
    // Blocklist: términos inequívocamente inapropiados para un e-commerce
    // Organizados por categoría para facilitar mantenimiento.
    // -----------------------------------------------------------------------

    /** Palabras individuales (se comparan contra tokens completos). */
    private static final Set<String> BLOCKED_WORDS = Set.of(
        // -- Pornografía --
        "porno", "pornografia", "pornografico", "pornograficos",
        "porn", "pornography", "pornographic",
        "xxx",
        "hentai",
        // -- Servicios sexuales --
        "sexoservicio", "sexoservidora", "sexoservidor",
        "putero", "puticlub", "prostibulo",
        "brothel", "whorehouse",
        "escort",           // contexto de servicios sexuales
        "onlyfans",
        "strippear", "striptease",
        // -- Actos sexuales explícitos --
        "coger",            // CR: relación sexual
        "follar",
        "chingar",
        "culiar",
        "blowjob", "handjob", "rimjob",
        "cumshot", "creampie", "bukake", "bukakke",
        "gangbang",
        "orgasmo", "orgasm",
        "masturbacion", "masturbate",
        "eyaculacion", "ejaculation",
        // -- Contenido visual explícito --
        "desnudo", "desnuda",
        "nude", "naked",
        "upskirt", "voyeur",
        // -- Drogas (venta) --
        "cocaina", "cocaine",
        "heroina", "heroin",
        "metanfetamina", "methamphetamine", "crystal meth",
        "crack",            // droga
        "fentanilo", "fentanyl",
        "lsd", "mdma", "extasis",
        // -- Términos de odio (slurs más comunes) --
        "nazi", "nazismo"
    );

    /** Frases de dos o más palabras (se buscan como subcadena en el texto normalizado). */
    private static final List<String> BLOCKED_PHRASES = List.of(
        "contenido adulto",
        "adult content",
        "material pornografico",
        "video porno",
        "foto porno",
        "venta de drogas",
        "comprar cocaina",
        "comprar heroina",
        "comprar droga",
        "sexo explicito",
        "explicit sex",
        "servicio sexual",
        "servicios sexuales",
        "dama de compania",
        "chica de servicio",
        "strip club",
        "sex tape",
        "sex video",
        "sexo oral",
        "sexo anal"
    );

    // Patrón para extraer tokens (letras y dígitos)
    private static final Pattern TOKEN_SPLITTER = Pattern.compile("[^a-z0-9]+");

    // -----------------------------------------------------------------------

    /**
     * Verifica si el texto es apropiado para publicar en la plataforma.
     * Revisa una o varias cadenas concatenadas (nombre + descripcion, etc.).
     */
    public ModerationResult moderar(String... campos) {
        for (String campo : campos) {
            if (campo == null || campo.isBlank()) continue;
            String norm = normalizar(campo);

            // Revisión de frases primero (más específicas)
            for (String frase : BLOCKED_PHRASES) {
                if (norm.contains(frase)) {
                    log.info("[TextMod] Frase bloqueada detectada: '{}'", frase);
                    return new ModerationResult(false, "Contenido inapropiado detectado");
                }
            }

            // Revisión token a token
            String[] tokens = TOKEN_SPLITTER.split(norm);
            for (String token : tokens) {
                if (token.length() < 3) continue; // ignorar tokens muy cortos
                if (BLOCKED_WORDS.contains(token)) {
                    log.info("[TextMod] Palabra bloqueada detectada: '{}'", token);
                    return new ModerationResult(false, "Contenido inapropiado detectado");
                }
            }
        }
        return new ModerationResult(true, null);
    }

    // -----------------------------------------------------------------------

    private String normalizar(String texto) {
        // 1. Minúsculas
        String s = texto.toLowerCase();

        // 2. Eliminar tildes y diacríticos
        s = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");

        // 3. Leet speak básico
        s = s.replace("0", "o")
             .replace("3", "e")
             .replace("@", "a")
             .replace("1", "i")
             .replace("$", "s")
             .replace("4", "a")
             .replace("5", "s")
             .replace("7", "t")
             .replace("+", "t")
             .replace("!", "i")
             .replace("|", "i");

        // 4. Colapsar caracteres repetidos 3+ veces → 2
        //    "seeeex" → "seex", "poooorno" → "poorno"
        s = s.replaceAll("(.)\\1{2,}", "$1$1");

        return s;
    }
}
