package com.hotclick.exception;

/**
 * Lanzada cuando una integración externa (Claude API, Vision API, Gemini, scraping
 * de ecommerce, BCCR, etc.) falla de forma que el llamador no puede resolver localmente.
 *
 * Transporta clasificación + tenantId para que tanto el log estructurado como
 * GlobalExceptionHandler puedan distinguir severidad y código HTTP sin volver
 * a inspeccionar la causa original en cada sitio donde se captura.
 */
public class IntegracionExternaException extends RuntimeException {

    public enum Tipo { TIMEOUT, RATE_LIMIT, IO_ERROR, RESPUESTA_INVALIDA, DESCONOCIDO }

    private final String integracion;
    private final Tipo tipo;
    private final Long tenantId;

    public IntegracionExternaException(String integracion, Tipo tipo, Long tenantId, String message, Throwable cause) {
        super(message, cause);
        this.integracion = integracion;
        this.tipo = tipo;
        this.tenantId = tenantId;
    }

    public IntegracionExternaException(String integracion, Tipo tipo, String message, Throwable cause) {
        this(integracion, tipo, null, message, cause);
    }

    public IntegracionExternaException(String integracion, Tipo tipo, String message) {
        this(integracion, tipo, null, message, null);
    }

    public String getIntegracion() { return integracion; }
    public Tipo getTipo() { return tipo; }
    public Long getTenantId() { return tenantId; }
}
