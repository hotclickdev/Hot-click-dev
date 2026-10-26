package com.hotclick.service.hacienda;

/** Falla que se puede reintentar: 5xx, timeout o IO con Hacienda. Retry y CircuitBreaker reaccionan a esta. */
public class HaciendaTransitoriaException extends RuntimeException {
    public HaciendaTransitoriaException(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
