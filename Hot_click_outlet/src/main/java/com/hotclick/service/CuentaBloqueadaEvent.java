package com.hotclick.service;

import org.springframework.context.ApplicationEvent;

/**
 * Disparado cuando un usuario alcanza el umbral de intentos fallidos (5) y
 * queda bloqueado temporalmente. Lleva solo el correo (primitivo) para evitar
 * LazyInitializationException fuera de la sesión Hibernate.
 */
public class CuentaBloqueadaEvent extends ApplicationEvent {

    private final String correo;

    public CuentaBloqueadaEvent(Object source, String correo) {
        super(source);
        this.correo = correo;
    }

    public String getCorreo() { return correo; }
}
