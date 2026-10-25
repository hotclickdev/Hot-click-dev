package com.hotclick.security;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Deny por defecto: un miembro LECTOR no puede hacer escrituras (POST/PUT/PATCH/DELETE) bajo /api/**
 * salvo en handlers marcados con esta anotación (método o clase). Usarla solo en acciones personales
 * del usuario (su perfil, reseñas, tickets) o de comprador, nunca en escrituras del negocio.
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface PermiteLector {
}
