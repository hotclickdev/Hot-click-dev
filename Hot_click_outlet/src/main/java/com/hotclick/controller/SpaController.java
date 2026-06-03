package com.hotclick.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards SPA routes to index.html so React Router handles client-side navigation.
 * Explicit routes avoid intercepting /assets/** static files served by Spring's resource handler.
 */
@Controller
public class SpaController {

    @GetMapping(value = {
        "/",
        "/productos",
        "/productos/{id}",
        "/carrito",
        "/login",
        "/registrar-negocio",
        "/sso-callback",
        "/sso-complete",
        "/registro",
        "/perfil",
        "/checkout",
        "/mis-pedidos",
        "/wishlist",
        "/pago/exito",
        "/pago/cancelado",
        "/nosotros",
        "/contacto",
        "/informacion",
        "/servicios",
        "/blog",
        "/blog/{slug}",
        "/emprendimientos",
        "/seleccionar-negocio",
        "/mode-select",
        "/admin/compras",
        "/admin/compras/nueva",
        "/admin/proveedores",
        "/recuperar-carrito/{id}",
        "/admin",
        "/admin/{*path}",
        "/checkout/qr/{token}",
        "/admin/gift-cards",
        "/admin/branding",
        "/admin/plugins",
        "/admin/api-keys",
        "/admin/inventario",
        "/admin/copilot",
        "/admin/forecast",
        "/admin/executive",
        "/admin/multipais"
    })
    public String spa() {
        return "forward:/index.html";
    }
}
