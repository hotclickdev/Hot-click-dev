package com.hotclick.controller.producto;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * Helpers puros del REST API de productos.
 * Extraído bit-idéntico de ProductoController — no cambia comportamiento.
 */
final class ProductoControllerSupport {

    private ProductoControllerSupport() {}

    /** Extrae el nombre del principal autenticado. Funciona con JWT (UserDetails) y API key (String). */
    static String currentUserName() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "sistema";
        Object principal = auth.getPrincipal();
        if (principal instanceof UserDetails ud) return ud.getUsername();
        return principal != null ? principal.toString() : "sistema";
    }
}
