package com.hotclick.service.hacienda;

/** Resultado del POST /recepcion. Un 4xx es un rechazo de recepción: no se reintenta. */
public record ResultadoEnvioHacienda(boolean recibido, int status, String motivo) {

    public static ResultadoEnvioHacienda recibido(int status) {
        return new ResultadoEnvioHacienda(true, status, null);
    }

    public static ResultadoEnvioHacienda rechazoRecepcion(int status, String motivo) {
        return new ResultadoEnvioHacienda(false, status, motivo);
    }
}
