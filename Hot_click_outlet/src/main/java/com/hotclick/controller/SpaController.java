package com.hotclick.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all non-API, non-static routes to index.html so React Router handles them.
 */
@Controller
public class SpaController {

    // Catch-all: cualquier ruta que no sea /api/** ni un recurso estático
    @GetMapping(value = "/{path:[^\\.]*}", produces = "text/html")
    public String spa() {
        return "forward:/index.html";
    }

    @GetMapping(value = "/{path:[^\\.]*}/**", produces = "text/html")
    public String spaDeep() {
        return "forward:/index.html";
    }
}
