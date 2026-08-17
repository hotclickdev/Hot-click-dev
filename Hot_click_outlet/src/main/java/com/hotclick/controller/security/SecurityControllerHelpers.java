package com.hotclick.controller.security;

import com.hotclick.utils.Constants;

import java.time.LocalDateTime;

/**
 * Helpers puros del Security Center REST API.
 * Extraído bit-idéntico de SecurityController — no cambia comportamiento.
 */
final class SecurityControllerHelpers {

    private SecurityControllerHelpers() {}

    static LocalDateTime periodToDateTime(String period) {
        return switch (period) {
            case "1h"  -> LocalDateTime.now(Constants.ZONA_CR).minusHours(1);
            case "24h" -> LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
            case "7d"  -> LocalDateTime.now(Constants.ZONA_CR).minusDays(7);
            case "30d" -> LocalDateTime.now(Constants.ZONA_CR).minusDays(30);
            case "90d" -> LocalDateTime.now(Constants.ZONA_CR).minusDays(90);
            default    -> LocalDateTime.now(Constants.ZONA_CR).minusHours(24);
        };
    }

    static String csv(String v) {
        if (v == null) return "";
        return "\"" + v.replace("\"", "\"\"") + "\"";
    }
}
