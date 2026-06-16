package com.hotclick.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Lanzada cuando una empresa alcanza el límite de su plan (productos, bodegas, usuarios, IA).
 * HTTP 403 Forbidden — el cliente debe hacer upgrade de plan.
 *
 * Contiene:
 *   - message  → descripción del límite alcanzado (ej: "Has alcanzado el límite de productos…")
 *   - entidad  → clave de la entidad afectada ("productos", "bodegas", "usuarios", "ai")
 *   - upgrade  → texto de acción sugerida para el usuario
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class PlanLimitException extends RuntimeException {

    private final String entidad;
    private final String upgrade;

    public PlanLimitException(String message, String entidad, String upgrade) {
        super(message);
        this.entidad = entidad;
        this.upgrade = upgrade;
    }

    public PlanLimitException(String message) {
        this(message, null, "Actualiza tu suscripción en Configuración → Plan.");
    }

    public String getEntidad() { return entidad; }
    public String getUpgrade() { return upgrade; }
}
