package com.hotclick.service;

import com.hotclick.model.MetodoCobro;

/**
 * Normalización, validación y enmascarado de cuentas de cobro del vendedor.
 */
public final class MetodoCobroFormato {

    private MetodoCobroFormato() {}

    public static String normalizarTipo(String tipoRaw) {
        if (tipoRaw == null) {
            throw new IllegalArgumentException("El tipo es requerido");
        }
        String t = tipoRaw.trim().toUpperCase();
        return switch (t) {
            case "SINPE" -> MetodoCobro.TIPO_SINPE;
            case "IBAN" -> MetodoCobro.TIPO_IBAN;
            case "TARJETA" -> MetodoCobro.TIPO_TARJETA;
            default -> throw new IllegalArgumentException("Tipo no válido: usá sinpe, iban o tarjeta");
        };
    }

    /** Limpia y valida el dato; lanza IllegalArgumentException si no sirve. */
    public static String limpiarDestino(String tipo, String datoRaw) {
        if (datoRaw == null || datoRaw.isBlank()) {
            throw new IllegalArgumentException("Completá el dato de la cuenta.");
        }
        return switch (tipo) {
            case MetodoCobro.TIPO_SINPE -> limpiarSinpe(datoRaw);
            case MetodoCobro.TIPO_IBAN -> limpiarIban(datoRaw);
            case MetodoCobro.TIPO_TARJETA -> limpiarTarjeta(datoRaw);
            default -> throw new IllegalArgumentException("Tipo no válido");
        };
    }

    public static String mascara(String tipo, String destino) {
        if (tipo == null || destino == null) {
            return destino == null ? "" : destino;
        }
        return switch (tipo) {
            case MetodoCobro.TIPO_SINPE -> destino.length() >= 8
                    ? destino.substring(0, 4) + "-" + destino.substring(4, 8)
                    : destino;
            case MetodoCobro.TIPO_IBAN -> destino.length() >= 8
                    ? destino.substring(0, 4) + " **** " + destino.substring(destino.length() - 4)
                    : destino;
            case MetodoCobro.TIPO_TARJETA -> "•••• " + destino.substring(Math.max(0, destino.length() - 4));
            default -> destino;
        };
    }

    public static String nombre(String tipo) {
        if (tipo == null) {
            return "";
        }
        return switch (tipo) {
            case MetodoCobro.TIPO_SINPE -> "SINPE Móvil";
            case MetodoCobro.TIPO_IBAN -> "Cuenta IBAN";
            case MetodoCobro.TIPO_TARJETA -> "Tarjeta";
            default -> tipo;
        };
    }

    public static String nota(String tipo) {
        if (tipo == null) {
            return "";
        }
        return switch (tipo) {
            case MetodoCobro.TIPO_SINPE -> "Ingreso al instante en Costa Rica";
            case MetodoCobro.TIPO_IBAN -> "Transferencia a tu banco";
            case MetodoCobro.TIPO_TARJETA -> "Liquidación de cobros con tarjeta";
            default -> "";
        };
    }

    /** API / FE: sinpe | iban | tarjeta. */
    public static String tipoApi(String tipoDb) {
        if (tipoDb == null) return "";
        return tipoDb.trim().toLowerCase();
    }

    private static String limpiarSinpe(String raw) {
        String digitos = raw.replaceAll("\\D", "");
        if (digitos.length() != 8) {
            throw new IllegalArgumentException("El SINPE debe tener 8 dígitos.");
        }
        return digitos;
    }

    private static String limpiarIban(String raw) {
        String limpio = raw.replaceAll("\\s+", "").toUpperCase();
        if (limpio.length() < 10) {
            throw new IllegalArgumentException("Indicá un IBAN válido (mínimo 10 caracteres).");
        }
        if (limpio.length() > 34) {
            throw new IllegalArgumentException("IBAN demasiado largo.");
        }
        return limpio;
    }

    private static String limpiarTarjeta(String raw) {
        String digitos = raw.replaceAll("\\D", "");
        if (digitos.length() < 4) {
            throw new IllegalArgumentException("Indicá al menos los últimos 4 dígitos.");
        }
        // Solo guardamos últimos 4 como referencia (no PAN completo).
        return digitos.substring(digitos.length() - 4);
    }
}
