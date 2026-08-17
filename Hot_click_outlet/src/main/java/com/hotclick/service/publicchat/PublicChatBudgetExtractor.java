package com.hotclick.service.publicchat;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracción de presupuesto máximo del mensaje del chat público.
 * Extraído bit-idéntico de PublicChatIntentHelper — no cambia comportamiento.
 */
final class PublicChatBudgetExtractor {

    private PublicChatBudgetExtractor() {}

    static Long extractMaxBudget(String msg) {
        String lower = msg.toLowerCase();
        Pattern p = Pattern.compile(
            "(?:menos de|hasta|máximo|presupuesto de|no más de|no pase de|bajo de)[\\s₡$]*([\\d][\\d.,]*)\\s*(mil|k)?",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE
        );
        Matcher m = p.matcher(lower);
        if (m.find()) {
            try {
                String numStr = m.group(1).replaceAll("[.,]", "");
                long num = Long.parseLong(numStr);
                String suffix = m.group(2);
                if (suffix != null && (suffix.equals("mil") || suffix.equals("k"))) num *= 1000;
                return num;
            } catch (Exception e) { return null; }
        }
        Pattern p2 = Pattern.compile("[₡$]?\\s*([\\d][\\d.,]*)\\s*(mil)?\\s*colones?");
        Matcher m2 = p2.matcher(lower);
        if (m2.find()) {
            try {
                String numStr = m2.group(1).replaceAll("[.,]", "");
                long num = Long.parseLong(numStr);
                if ("mil".equals(m2.group(2))) num *= 1000;
                if (num > 500 && num < 5_000_000) return num;
            } catch (Exception e) { return null; }
        }
        return null;
    }
}
