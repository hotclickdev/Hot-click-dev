package com.hotclick.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

@Controller
public class CustomErrorController implements ErrorController {

    @GetMapping(value = "/error", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String handleError(HttpServletRequest request) {
        Integer status = (Integer) request.getAttribute("javax.servlet.error.status_code");
        if (status == null) {
            status = (Integer) request.getAttribute("jakarta.servlet.error.status_code");
        }
        String message = status != null && status == 404
            ? "Página no encontrada (404)"
            : "Error inesperado (" + (status != null ? status : "?") + ")";

        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>Error — HOTCLICK</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body {
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #09090b;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  color: #e8e8ed;
                }
                .card {
                  text-align: center;
                  padding: 2.5rem 2rem;
                  background: #111114;
                  border: 1px solid rgba(255,255,255,0.08);
                  border-radius: 1.25rem;
                  max-width: 400px;
                  width: 90%;
                }
                .icon {
                  font-size: 3rem;
                  margin-bottom: 1rem;
                  opacity: 0.5;
                }
                h1 { font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem; }
                p { font-size: 0.875rem; color: #8e8e9a; margin-bottom: 1.5rem; }
                a {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.5rem;
                  padding: 0.6rem 1.2rem;
                  background: #8c5cf6;
                  color: #fff;
                  border-radius: 0.75rem;
                  text-decoration: none;
                  font-size: 0.875rem;
                  font-weight: 500;
                  transition: opacity 0.15s;
                }
                a:hover { opacity: 0.85; }
                svg { width: 16px; height: 16px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="icon">🔍</div>
                <h1>__ERROR_MESSAGE__</h1>
                <p>La página que buscás no existe o no está disponible.</p>
                <a href="javascript:history.back()">
                  <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                  </svg>
                  Volver atrás
                </a>
              </div>
            </body>
            </html>
            """.replace("__ERROR_MESSAGE__", message);
    }
}
