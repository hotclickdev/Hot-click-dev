package com.hotclick.service.hacienda;

/** Falta configuración fiscal (usuario ATV, clave o token). No se reintenta y el comprobante no se marca ENVIADO. */
public class HaciendaConfiguracionException extends RuntimeException {
    public HaciendaConfiguracionException(String mensaje) {
        super(mensaje);
    }
}
