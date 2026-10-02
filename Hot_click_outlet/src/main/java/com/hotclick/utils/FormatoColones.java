package com.hotclick.utils;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/**
 * Formato único de colones del backend: punto de miles sin espacios (₡6.200), igual que
 * {@code formatPrice} del frontend. Sin {@code NumberFormat.getInstance(es-CR)}: ese agrupa con
 * espacio duro (U+00A0) y deja "₡6 200" en correos, WhatsApp, SEO y chat.
 */
public final class FormatoColones {

    private static final Locale ES_CR = Locale.forLanguageTag("es-CR");

    private FormatoColones() {}

    /** 6200 → "6.200"; null → "0". Instancia por llamada porque DecimalFormat no es thread-safe. */
    public static String miles(Number valor) {
        DecimalFormatSymbols simbolos = DecimalFormatSymbols.getInstance(ES_CR);
        simbolos.setGroupingSeparator('.');
        return new DecimalFormat("#,##0", simbolos).format(valor != null ? valor : 0);
    }

    /** 6200 → "₡6.200". */
    public static String colones(Number valor) {
        return "₡" + miles(valor);
    }
}
