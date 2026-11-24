package com.hotclick.agente.enlace;

/** Error de negocio al crear un enlace; el mensaje es seguro para mostrarlo al cliente en el chat. */
public class EnlaceCompraException extends RuntimeException {
    public EnlaceCompraException(String mensaje) {
        super(mensaje);
    }
}
