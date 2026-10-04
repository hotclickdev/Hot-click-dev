package com.hotclick.legal;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Evita mandar a la IA números de tarjeta o datos de menores.
 * No sustituye la moderación de contenido adulto.
 */
public final class ChatLegalGuard {

    public enum Motivo { OK, TARJETA, MENOR }

    private static final Pattern DIGITOS = Pattern.compile("\\d{13,19}");
    private static final Pattern EDAD = Pattern.compile(
        "(?i)(?:tengo|tenes|tenés|cumplo|soy de)\\s*(\\d{1,2})\\s*a[nñ]os");
    private static final Pattern MENOR_FRASE = Pattern.compile(
        "(?i)(?:soy menor|menor de edad|tengo menos de (?:13|15|16|17|18))");

    public static final String RESPUESTA_TARJETA =
        "No envíe números de tarjeta ni códigos de seguridad. En HotClick el cobro lo hace la pasarela, no este chat.";
    public static final String RESPUESTA_MENOR =
        "HotClick es para personas mayores de 18 años. Si un menor usó esta cuenta, escriba a hotclick.cr@gmail.com para cerrarla.";

    private ChatLegalGuard() {}

    public static Motivo revisar(String texto) {
        if (texto == null || texto.isBlank()) return Motivo.OK;
        if (contieneTarjeta(texto)) return Motivo.TARJETA;
        if (declaraMenor(texto)) return Motivo.MENOR;
        return Motivo.OK;
    }

    public static String respuesta(Motivo motivo) {
        if (motivo == Motivo.TARJETA) return RESPUESTA_TARJETA;
        if (motivo == Motivo.MENOR) return RESPUESTA_MENOR;
        return "";
    }

    static boolean contieneTarjeta(String texto) {
        String compacto = texto.replaceAll("[\\s-]", "");
        return DIGITOS.matcher(compacto).find();
    }

    static boolean declaraMenor(String texto) {
        if (MENOR_FRASE.matcher(texto).find()) return true;
        Matcher m = EDAD.matcher(texto);
        while (m.find()) {
            int anios = Integer.parseInt(m.group(1));
            if (anios < 18) return true;
        }
        return false;
    }
}
