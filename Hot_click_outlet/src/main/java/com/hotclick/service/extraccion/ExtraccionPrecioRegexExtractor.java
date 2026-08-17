package com.hotclick.service.extraccion;

import org.springframework.stereotype.Service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
class ExtraccionPrecioRegexExtractor {

    // Regex para detectar precios en USD: $12.99 / USD 12.99 / 12,99 USD
    private static final Pattern PRECIO_USD = Pattern.compile(
        "(?:USD|US\\$|\\$)\\s*(\\d{1,6}(?:[.,]\\d{1,2})?)|" +
        "(\\d{1,6}(?:[.,]\\d{1,2})?)\\s*(?:USD|US\\$)"
    );

    String extraerTextoPrecio(String texto) {
        Matcher m = PRECIO_USD.matcher(texto);
        if (!m.find()) return null;
        return m.group(1) != null ? m.group(1) : m.group(2);
    }
}
