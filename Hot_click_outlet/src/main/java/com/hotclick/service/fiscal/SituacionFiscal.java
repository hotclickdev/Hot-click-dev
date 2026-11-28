package com.hotclick.service.fiscal;

import java.util.Locale;
import java.util.Optional;

/** Situación del negocio ante Hacienda. Un negocio sin declarar se guarda como null y paga el extra igual que NO_INSCRITO. */
public enum SituacionFiscal {
    INSCRITO,
    REGIMEN_SIMPLIFICADO,
    NO_INSCRITO;

    /** Valor reconocido o vacío; nunca lanza (el llamador decide si vacío es error o "sin declarar"). */
    public static Optional<SituacionFiscal> desde(String valor) {
        if (valor == null || valor.isBlank()) return Optional.empty();
        try {
            return Optional.of(valueOf(valor.trim().toUpperCase(Locale.ROOT)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
