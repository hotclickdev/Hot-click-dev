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
        "/registro",
        "/perfil",
        "/checkout",
        "/pago/exito",
        "/pago/cancelado",
        "/nosotros",
        "/contacto",
        "/informacion",
        "/admin",
        "/admin/productos",
        "/admin/pedidos",
        "/admin/usuarios",
        "/admin/categorias",
        "/admin/bodegas",
        "/admin/ventas",
        "/admin/finanzas",
        "/admin/reportes",
        "/admin/publicaciones",
        "/admin/nuevo-producto"
    })
    public String spa() {
        return "forward:/index.html";
    }
}
