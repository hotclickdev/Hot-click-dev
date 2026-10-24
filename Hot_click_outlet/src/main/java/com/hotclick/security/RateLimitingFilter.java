package com.hotclick.security;

import com.hotclick.service.SecurityAuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Distributed IP-level rate limiter (fixed-window, per POST).
 * Clave: IP del cliente (ClientIpResolver, solo cree X-Forwarded-For de proxies de confianza)
 * + path exacto, o + prefijo/sufijo para PREFIX_LIMITS (todas las rutas con id comparten bucket).
 * State is stored in hot_click_rate_limit_tb — safe for multi-pod.
 *
 * Fail-open: if DB fails the request passes. Auth endpoints have account
 * lockout as a second layer (UsuarioService.incrementarIntentosFallidos).
 *
 * Limits (POST, per IP):
 *   Auth
 *   ────────────────────────────────────────────
 *   /api/auth/login              → 10 / 60s
 *   /api/auth/forgot-password    →  5 / 60s
 *   /api/auth/2fa/verify         →  5 / 60s
 *   /api/auth/2fa/email/send     →  3 / 300s
 *   /api/auth/verify-code        →  5 / 60s
 *   /api/auth/reset-password     →  5 / 60s
 *   /api/auth/registro-empresa   →  5 / 60s
 *   /api/auth/register           →  5 / 3600s
 *   /api/auth/send-verification  →  5 / 60s
 *   /api/auth/refresh            → 30 / 60s
 *   /api/auth/change-password    →  5 / 300s
 *
 *   General
 *   ────────────────────────────────────────────
 *   /api/contacto                →  5 / 60s
 *   /api/pedidos                 → 15 / 60s
 *   /api/payment/checkout        →  3 / 60s
 *   /api/payments/tilopay/**     → 10 / 60s (confirmar/reintentar públicos)
 *
 *   AI (IP-level; per-empresa burst in AiCopilotController)
 *   ────────────────────────────────────────────
 *   /api/public/chat                      → 10 / 60s
 *   /api/public/shopping-assistant/chat   → 10 / 60s
 *   /api/admin/ai/chat                    → 20 / 60s
 *
 * Limits (GET, per IP — endpoints públicos sin auth):
 *   /api/hacienda/contribuyente/** →  10 / 60s  (proxy a API externa de CR)
 *   /api/convenios/publicos        →  60 / 60s
 *   /api/marcas/publicas           →  60 / 60s
 *   /api/categorias/**             →  60 / 60s
 *   /api/blog/publico/**           →  60 / 60s
 *   /api/public/pedidos/seguimiento/** → 20 / 60s
 *   /api/public/tienda-rapida/**   →  20 / 60s
 *   /api/public/**                 →  60 / 60s
 *   /api/tienda/**                 → 120 / 60s
 *   /api/productos/**              → 120 / 60s
 */
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitingFilter.class);

    @Autowired private SecurityAuditService auditService;
    @Autowired private RateLimiter          rateLimiter;
    @Autowired private ClientIpResolver     clientIpResolver;

    // H-07: topes SINPE configurables (application.properties / env). Defaults conservadores.
    @Value("${rate-limit.sinpe.guest-checkout.max:3}")            private int sinpeCheckoutMax = 3;
    @Value("${rate-limit.sinpe.guest-checkout.window-seconds:60}") private int sinpeCheckoutWindow = 60;
    /** Por IP, sumando todos los pedidos: frena subir comprobantes a pedidos ajenos en masa. */
    @Value("${rate-limit.sinpe.comprobante.ip.max:10}")             private int sinpeCompIpMax = 10;
    @Value("${rate-limit.sinpe.comprobante.ip.window-seconds:600}") private int sinpeCompIpWindow = 600;
    /**
     * Por pedido + IP (H-07 r2 (a)). El tope global por pedido ya no vive aquí: lo cuenta
     * SinpeComprobanteService solo para intentos con correo válido, así un tercero que conoce
     * el número no bloquea el comprobante de la víctima.
     */
    @Value("${rate-limit.sinpe.comprobante.pedido-ip.max:5}")               private int sinpeCompPedidoMax = 5;
    @Value("${rate-limit.sinpe.comprobante.pedido-ip.window-seconds:3600}") private int sinpeCompPedidoWindow = 3600;
    /** H-07 r2 (c): ruta autenticada /api/sinpe/{n}/comprobante. */
    @Value("${rate-limit.sinpe.comprobante-auth.ip.max:20}")             private int sinpeAuthIpMax = 20;
    @Value("${rate-limit.sinpe.comprobante-auth.ip.window-seconds:600}") private int sinpeAuthIpWindow = 600;
    @Value("${rate-limit.sinpe.comprobante-auth.pedido-ip.max:5}")               private int sinpeAuthPedidoMax = 5;
    @Value("${rate-limit.sinpe.comprobante-auth.pedido-ip.window-seconds:3600}") private int sinpeAuthPedidoWindow = 3600;

    private static final String SINPE_GUEST_CHECKOUT = "/api/sinpe/guest-checkout";
    private static final String SINPE_GUEST_PREFIX   = "/api/sinpe/guest/";
    private static final String SINPE_COMPROBANTE    = "/comprobante";

    private record Limit(int maxRequests, int windowSeconds) {}
    /**
     * {@code sufijo} null = cualquier ruta bajo el prefijo.
     * {@code porRecurso} true = bucket por IP + path completo (un cupo por pedido/pago);
     * false = bucket por IP + prefijo (PUB-08: cambiar token/id no abre otro cupo).
     */
    private record PrefixLimit(String prefix, String sufijo, int maxRequests, int windowSeconds, boolean porRecurso) {
        PrefixLimit(String prefix, String sufijo, int maxRequests, int windowSeconds) {
            this(prefix, sufijo, maxRequests, windowSeconds, false);
        }
        boolean aplica(String path) {
            return path.startsWith(prefix) && (sufijo == null || path.endsWith(sufijo));
        }
        String bucket(String path) {
            if (porRecurso) return path;
            return sufijo == null ? prefix : prefix + "*" + sufijo;
        }
    }
    private record GetLimit(String prefix, int maxRequests, int windowSeconds) {}

    // Exact-path limits (POST only)
    private static final Map<String, Limit> LIMITS = Map.ofEntries(
        // Auth
        Map.entry("/api/auth/login",              new Limit(10,   60)),
        Map.entry("/api/auth/forgot-password",    new Limit(5,    60)),
        Map.entry("/api/auth/2fa/verify",         new Limit(5,    60)),
        Map.entry("/api/auth/2fa/email/send",     new Limit(3,   300)),
        Map.entry("/api/auth/verify-code",        new Limit(5,    60)),
        Map.entry("/api/auth/reset-password",     new Limit(5,    60)),
        Map.entry("/api/auth/registro-empresa",   new Limit(5,    60)),
        Map.entry("/api/auth/register",           new Limit(5,  3600)),
        Map.entry("/api/auth/send-verification",  new Limit(5,    60)),
        Map.entry("/api/auth/reenviar-codigo-negocio", new Limit(3, 300)),
        Map.entry("/api/auth/refresh",            new Limit(30,   60)),
        Map.entry("/api/auth/change-password",    new Limit(5,   300)),
        // General
        Map.entry("/api/contacto",                new Limit(5,    60)),
        Map.entry("/api/telegram/vincular",       new Limit(5,    60)),
        Map.entry("/api/pedidos",                 new Limit(15,   60)),
        Map.entry("/api/payments/checkout",       new Limit(3,    60)),
        Map.entry("/api/payments/guest-checkout", new Limit(3,    60)),
        Map.entry("/api/public/embudo",           new Limit(60,   60)),
        Map.entry("/api/cart/abandoned",          new Limit(10,   60)),
        // Uploads públicos — limitar para evitar abuso de almacenamiento y costos S3
        Map.entry("/api/servicios/fotos",                             new Limit(10,  60)),
        // Crear la solicitud también es público. Sin tope, un clic repetido llena la tabla.
        Map.entry("/api/servicios",                                   new Limit(5,   60)),
        Map.entry("/api/public/encargos/imagenes",                    new Limit(10,  60)),
        Map.entry("/api/public/encargos",                             new Limit(5,   60)),
        Map.entry("/api/recolecciones",                               new Limit(10,  60)),
        // AI — IP level (per-empresa burst handled in controller)
        Map.entry("/api/public/chat",                                 new Limit(10,  60)),
        Map.entry("/api/public/shopping-assistant/chat",              new Limit(10,  60)),
        Map.entry("/api/public/shopping-assistant/search-by-image",   new Limit(5,   60)),
        Map.entry("/api/public/shopping-assistant/feedback",          new Limit(20,  60)),
        Map.entry("/api/public/solicitud-especial",                   new Limit(5,   60)),
        Map.entry("/api/admin/ai/chat",                               new Limit(20,  60))
    );

    // Prefix-based limits for paths with variables (e.g. /api/pedidos/123/notificar).
    // Matched in order — first prefix wins. Keep this list short.
    private static final List<PrefixLimit> PREFIX_LIMITS = List.of(
        // Prevent admins from accidentally spamming customers with email notifications.
        new PrefixLimit("/api/pedidos/", "/notificar", 5, 60, true),   // 5 notificar calls/min per IP
        // Tilopay confirm/retry are permitAll — throttle abuse / DoS to Tilopay API
        new PrefixLimit("/api/payments/tilopay/", null, 10, 60, true),
        // Borrado de datos con contraseña: frena adivinar la contraseña por esta ruta
        new PrefixLimit("/api/admin/reset-", null, 10, 300, true),
        // QR de pago POS público: cada POST crea checkout o intento en ONVO/Stripe
        new PrefixLimit("/api/pos/qr/pago/", null, 10, 60, true),
        // Autoservicio de mesa público: evita inundar pedidos PENDIENTE
        new PrefixLimit("/api/qr/", null, 10, 60),
        // "Avisame cuando vuelva" es publico y solo pide un email: sin limite se insertan filas sin fin.
        new PrefixLimit("/api/productos/", "/avisar-reposicion", 5, 60),
        // Pedido de tienda propia (público, crea usuario invitado y pedido)
        new PrefixLimit("/api/tienda/", "/pedidos", 5, 60),
        // Completar la tienda rápida por token
        new PrefixLimit("/api/public/tienda-rapida/", null, 5, 60),
        // P8-02: WhatsApp manual del CRM (sale del número de la plataforma): 20/hora por IP
        new PrefixLimit("/api/crm/clientes/", "/whatsapp", 20, 3600)
    );

    // GET limits for public endpoints vulnerable to scraping or external-API abuse.
    // Matched in order — first prefix wins. Only covers unauthenticated-friendly routes.
    private static final List<GetLimit> GET_LIMITS = List.of(
        new GetLimit("/api/hacienda/contribuyente",      10,  60), // proxy a API Hacienda CR
        // Estado del QR POS consulta ONVO en cada llamada; cajero (3 s) y cliente (2,5 s) suelen compartir IP
        new GetLimit("/api/pos/qr/pago",               120,  60),
        new GetLimit("/api/img",                         60,  60),
        new GetLimit("/api/convenios/publicos",          60,  60),
        new GetLimit("/api/marcas/publicas",             60,  60),
        new GetLimit("/api/categorias",                  60,  60),
        // Proxy al IGN (ArcGIS): sin tope, cada miss de cache hace hasta 5 llamadas externas.
        new GetLimit("/api/division-territorial",       30,  60),
        new GetLimit("/api/blog/publico",                60,  60),
        // Seguimiento por token: más estricto que el resto de /api/public (dificulta adivinar tokens).
        new GetLimit("/api/public/pedidos/seguimiento",  20,  60),
        // PUB-09: lectura del enlace de tienda rapida por token (un SELECT por request).
        new GetLimit("/api/public/tienda-rapida",        20,  60),
        new GetLimit("/api/public",                      60,  60),
        new GetLimit("/api/tienda",                     120,  60),
        new GetLimit("/api/productos",                  120,  60)
    );

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain) throws ServletException, IOException {
        // getServletPath() devuelve "" en MockMvc (y con el dispatcher mapeado en "/"
        // bajo ciertos contenedores) — usar requestURI menos contextPath es portable.
        String path = request.getRequestURI();
        String contextPath = request.getContextPath();
        if (contextPath != null && !contextPath.isEmpty() && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            String ip    = clientIpResolver.resolve(request);
            int sinpe = evaluarTopeSinpe(ip, path);
            if (sinpe == 400) {
                rechazarFormato(response);
                return;
            }
            if (sinpe == 429) {
                rechazar(response, ip, path);
                return;
            }
            Limit  limit = LIMITS.get(path);
            String bucket = path;

            // Exact-path check
            if (limit == null) {
                // Prefix check — paths with ID segments
                for (PrefixLimit pl : PREFIX_LIMITS) {
                    if (pl.aplica(path)) {
                        limit = new Limit(pl.maxRequests(), pl.windowSeconds());
                        // PUB-08: un bucket por IP + prefijo (+ sufijo), salvo reglas porRecurso (por pedido/pago).
                        // Con el path completo cada token/id nuevo abria un bucket y el tope no limitaba nada.
                        bucket = pl.bucket(path);
                        break;
                    }
                }
            }

            if (limit != null) {
                String key = "ip:" + ip + ":" + bucket;
                if (!rateLimiter.tryAcquire(key, limit.maxRequests(), limit.windowSeconds())) {
                    rechazar(response, ip, path);
                    return;
                }
            }
        } else if ("GET".equalsIgnoreCase(method)) {
            String ip = clientIpResolver.resolve(request);
            for (GetLimit gl : GET_LIMITS) {
                if (path.startsWith(gl.prefix())) {
                    String key = "ip:" + ip + ":GET:" + gl.prefix();
                    if (!rateLimiter.tryAcquire(key, gl.maxRequests(), gl.windowSeconds())) {
                        log.warn("[RATE-LIMIT] GET ip={} path={}", ip, RutaLogSegura.enmascarar(path));
                        try { auditService.logRateLimitTriggered(ip, RutaLogSegura.enmascarar(path)); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
                        response.setStatus(429);
                        response.setCharacterEncoding("UTF-8"); // ESC-8: sin mojibake en «Esperá»
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        response.getWriter().write(
                            "{\"success\":false,\"message\":\"Demasiadas solicitudes. Esperá un momento antes de volver a intentar.\"}");
                        return;
                    }
                    break; // first prefix wins
                }
            }
        }

        chain.doFilter(request, response);
    }

    private static final String SINPE_PREFIX = "/api/sinpe/";

    /**
     * H-07: SINPE. guest-checkout: por IP. Comprobante (invitado y autenticado): por IP (todos los
     * pedidos) y por pedido+IP. B-1: el número sale del segmento ya decodificado (igual que el
     * @PathVariable de Spring) y normalizado; si no tiene formato de pedido, 400 sin gastar cupo.
     * @return 0 = sigue, 400 = formato inválido, 429 = tope excedido
     */
    int evaluarTopeSinpe(String ip, String path) {
        if (SINPE_GUEST_CHECKOUT.equals(path)) {
            return rateLimiter.tryAcquire("ip:" + ip + ":" + path, sinpeCheckoutMax, sinpeCheckoutWindow) ? 0 : 429;
        }
        if (!path.startsWith(SINPE_PREFIX) || !path.endsWith(SINPE_COMPROBANTE)) return 0;
        String[] seg = path.substring(SINPE_PREFIX.length()).split("/", -1);
        boolean guest;
        String crudo;
        if (seg.length == 3 && "guest".equals(seg[0]) && "comprobante".equals(seg[2])) {
            guest = true; crudo = seg[1];
        } else if (seg.length == 2 && "comprobante".equals(seg[1])) {
            guest = false; crudo = seg[0];
        } else {
            return 0;
        }
        String numero = NumeroPedidoNormalizer.normalizarSegmento(crudo);
        if (numero == null) return 400;
        String ruta = guest ? "guest" : "auth";
        boolean ipOk = guest
            ? rateLimiter.tryAcquire("ip:" + ip + ":" + SINPE_GUEST_PREFIX + "*" + SINPE_COMPROBANTE, sinpeCompIpMax, sinpeCompIpWindow)
            : rateLimiter.tryAcquire("ip:" + ip + ":" + SINPE_PREFIX + "*" + SINPE_COMPROBANTE, sinpeAuthIpMax, sinpeAuthIpWindow);
        boolean pedidoOk = guest
            ? rateLimiter.tryAcquire("pedido-ip:" + ruta + ":" + numero + ":" + ip, sinpeCompPedidoMax, sinpeCompPedidoWindow)
            : rateLimiter.tryAcquire("pedido-ip:" + ruta + ":" + numero + ":" + ip, sinpeAuthPedidoMax, sinpeAuthPedidoWindow);
        return ipOk && pedidoOk ? 0 : 429;
    }

    private void rechazarFormato(HttpServletResponse response) throws IOException {
        response.setStatus(400);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"success\":false,\"message\":\"Número de pedido inválido.\"}");
    }

    private void rechazar(HttpServletResponse response, String ip, String path) throws IOException {
        log.warn("[RATE-LIMIT] ip={} path={}", ip, RutaLogSegura.enmascarar(path));
        try { auditService.logRateLimitTriggered(ip, RutaLogSegura.enmascarar(path)); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
        response.setStatus(429);
        response.setCharacterEncoding("UTF-8"); // ESC-8: sin mojibake en «Esperá»
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
            "{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}");
    }
}
