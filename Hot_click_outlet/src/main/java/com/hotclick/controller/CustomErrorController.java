package com.hotclick.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.List;

/**
 * Página HTML de /error. ⚠️ COMPARTIDO: para rutas de visitante usa el diseño claro de Figma
 * (404 `45:2198`, fallo del servidor `45:2322`); paneles, roles y landings de vendedor siguen con la página
 * oscura de siempre.
 */
@Controller
public class CustomErrorController implements ErrorController {

    /** Rutas que no son del visitante: conservan la página oscura sin cambios. */
    static final List<String> PREFIJOS_SIN_CAMBIO = List.of(
        "/admin", "/emprendedor", "/pos", "/pyme", "/negocio-plus", "/seleccionar-negocio", "/mode-select",
        "/registrar-negocio", "/registro-empresa", "/emprende", "/para-emprendedores", "/para-pymes", "/api");

    static boolean esRutaVisitante(String uri) {
        if (uri == null || uri.isBlank()) return true;
        for (String p : PREFIJOS_SIN_CAMBIO) {
            if (uri.equals(p) || uri.startsWith(p + "/") || uri.startsWith(p + "-")) return false;
        }
        return true;
    }

    @GetMapping(value = "/error", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String handleError(HttpServletRequest request) {
        Integer status = (Integer) request.getAttribute("javax.servlet.error.status_code");
        if (status == null) {
            status = (Integer) request.getAttribute("jakarta.servlet.error.status_code");
        }
        Object uri = request.getAttribute("jakarta.servlet.error.request_uri");
        if (uri == null) uri = request.getAttribute("javax.servlet.error.request_uri");
        if (esRutaVisitante(uri != null ? uri.toString() : null)) {
            return paginaVisitante(status != null && status == 404);
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

    /** Diseño claro del visitante (derivado de Figma `45:2198` / `45:2322`): círculo de estado, título Sora y botón rojo. */
    static String paginaVisitante(boolean noEncontrada) {
        String titulo = noEncontrada ? "Esta página no existe" : "Algo salió mal de nuestro lado";
        String texto = noEncontrada
            ? "El enlace está roto o la página se movió. Elegí por dónde seguir."
            : "No es tu culpa. Probá de nuevo en unos segundos: tu carrito sigue guardado.";
        String etiqueta = noEncontrada ? "404" : "!";
        String acciones = noEncontrada
            ? "<a class=\"primario\" href=\"/\">Ir al inicio</a><a class=\"secundario\" href=\"/categorias\">Ver categorías</a>"
            : "<a class=\"primario\" href=\"javascript:location.reload()\">Reintentar</a>"
              + "<a class=\"secundario\" href=\"https://wa.me/50686667888\" rel=\"noopener\">Escribinos por WhatsApp · 8666-7888</a>";
        return """
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <meta name="robots" content="noindex"/>
              <title>__TITULO__ · HotClick</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { min-height: 100vh; background: #FFFFFF; color: #14171C;
                  font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
                header { padding: 14px 16px; border-bottom: 1px solid #E4E7EC; font-family: 'Sora', 'Public Sans', sans-serif;
                  font-weight: 700; font-size: 18px; }
                header a { color: inherit; text-decoration: none; }
                header span { color: #E73B33; }
                main { max-width: 420px; margin: 0 auto; padding: 48px 16px; display: flex; flex-direction: column;
                  align-items: center; gap: 12px; text-align: center; }
                .estado { width: 72px; height: 72px; border-radius: 50%; background: #F1F3F6; color: #4D5560;
                  display: flex; align-items: center; justify-content: center; font-family: 'Sora', sans-serif;
                  font-weight: 700; font-size: 20px; }
                h1 { font-family: 'Sora', 'Public Sans', sans-serif; font-size: 22px; font-weight: 700; }
                p { font-size: 14px; line-height: 20px; color: #4D5560; }
                .acciones { width: 100%; display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
                .acciones a { display: block; padding: 14px 16px; border-radius: 12px; text-decoration: none;
                  font-size: 15px; font-weight: 600; }
                .primario { background: #E73B33; color: #FFFFFF; }
                .secundario { border: 1px solid #E4E7EC; color: #14171C; background: #FFFFFF; }
              </style>
            </head>
            <body>
              <header><a href="/">Hot<span>Click</span></a></header>
              <main>
                <div class="estado" aria-hidden="true">__ETIQUETA__</div>
                <h1>__TITULO__</h1>
                <p>__TEXTO__</p>
                <div class="acciones">__ACCIONES__</div>
              </main>
            </body>
            </html>
            """.replace("__TITULO__", titulo)
            .replace("__TEXTO__", texto)
            .replace("__ETIQUETA__", etiqueta)
            .replace("__ACCIONES__", acciones);
    }
}
