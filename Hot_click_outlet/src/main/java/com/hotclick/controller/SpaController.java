package com.hotclick.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

/**
 * Forwards all non-API, non-static routes to index.html so React Router handles them.
 */
@Controller
public class SpaController {

    @RequestMapping(value = {
        "/", "/productos", "/productos/**",
        "/carrito", "/login", "/registro",
        "/perfil", "/nosotros", "/contacto",
        "/admin", "/admin/**"
    })
    public String spa() {
        return "forward:/index.html";
    }
}
