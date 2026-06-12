package com.hotclick.rag.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request del asistente de compras público.
 * {@code sesionId} es opcional — null o blank indica sesión nueva.
 * El frontend debe persistir el {@code sesionId} devuelto en ChatResponse
 * y reenvarlo en turnos subsiguientes para mantener el historial.
 */
public class ChatRequest {

    @NotBlank(message = "El mensaje no puede estar vacío")
    @Size(max = 500, message = "El mensaje no puede superar 500 caracteres")
    private String mensaje;

    /** UUID de la sesión activa; null o blank para iniciar conversación nueva. */
    private String sesionId;

    @NotBlank(message = "El slug de la tienda es requerido")
    private String empresaSlug;

    /**
     * Contexto de la página desde donde se llama el asistente.
     * Valores: GENERAL, PRODUCTO, CARRITO, PAGO_FALLO, PAGO_EXITO.
     * Opcional — si es null o blank, el pipeline usa GENERAL.
     */
    @Size(max = 500, message = "El contexto no puede superar 500 caracteres")
    private String contexto;

    /**
     * Cookie de identificación del visitante anónimo (UUID v4).
     * Opcional — si es null o inválido, la capa de memoria se omite.
     */
    @Size(max = 36, message = "El visitorId no puede superar 36 caracteres")
    private String visitorId;

    public String getMensaje()     { return mensaje; }
    public void   setMensaje(String mensaje) { this.mensaje = mensaje; }

    public String getSesionId()    { return sesionId; }
    public void   setSesionId(String sesionId) { this.sesionId = sesionId; }

    public String getEmpresaSlug() { return empresaSlug; }
    public void   setEmpresaSlug(String empresaSlug) { this.empresaSlug = empresaSlug; }

    public String getContexto()    { return contexto; }
    public void   setContexto(String contexto) { this.contexto = contexto; }

    public String getVisitorId()   { return visitorId; }
    public void   setVisitorId(String visitorId) { this.visitorId = visitorId; }
}
