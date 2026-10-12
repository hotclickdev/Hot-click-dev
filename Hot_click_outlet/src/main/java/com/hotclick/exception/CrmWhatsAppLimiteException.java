package com.hotclick.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** P8-02: el negocio superó el tope de WhatsApp manuales del CRM por hora → 429. */
@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class CrmWhatsAppLimiteException extends RuntimeException {
    public CrmWhatsAppLimiteException(String mensaje) { super(mensaje); }
}
