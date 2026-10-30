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
 * Distributed IP-level rate limiter (fixed-window, per POST / GET / HEAD).
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
 *   /api/auth/reenviar-verificacion → 3 / 300s
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
 * Limits (GET y HEAD, per IP — endpoints públicos sin auth; HEAD comparte el bucket de GET porque
 * Spring MVC lo enruta al handler de GET. OPTIONS no ejecuta handler y PUT/PATCH/DELETE no están limitados aquí):
 *   /api/hacienda/contribuyente/** →  10 / 60s  (proxy a API externa de CR)
 *   /api/convenios/publicos        →  60 / 60s
 *   /api/marcas/publicas           →  60 / 60s
 *   /api/categorias/**             →  60 / 60s
 *   /api/blog/publico/**           →  60 / 60s
 *   /api/gift-cards/validar        →  30 / 60s  (además 10 / 60s por usuario, fail-closed, en el controlador)
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

    // Topes de /2fa/setup|activate|disable por IP. Configurables en application.properties
    // (hotclick.ratelimit.2fa-*); el valor del inicializador aplica si el filtro se crea sin Spring.
    @Value("${hotclick.ratelimit.2fa-setup.max:5}")        private int tfaSetupMax = 5;
    @Value("${hotclick.ratelimit.2fa-setup.window:300}")   private int tfaSetupWindow = 300;
    @Value("${hotclick.ratelimit.2fa-activate.max:10}")    private int tfaActivateMax = 10;
    @Value("${hotclick.ratelimit.2fa-activate.window:300}") private int tfaActivateWindow = 300;
    @Value("${hotclick.ratelimit.2fa-disable.max:5}")      private int tfaDisableMax = 5;
    @Value("${hotclick.ratelimit.2fa-disable.window:300}") private int tfaDisableWindow = 300;

    private Limit limite2fa(String path) {
        return switch (path) {
            case "/api/auth/2fa/setup"    -> new Limit(tfaSetupMax, tfaSetupWindow);
            case "/api/auth/2fa/activate" -> new Limit(tfaActivateMax, tfaActivateWindow);
            case "/api/auth/2fa/disable"  -> new Limit(tfaDisableMax, tfaDisableWindow);
            default -> null;
        };
    }

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

    // B1: tope de rutas inválidas (400) por IP y ventana; el log de ese rechazo se muestrea con la misma ventana.
    private static final int RUTA_INVALIDA_MAX = 20;
    private static final int RUTA_INVALIDA_VENTANA = 60;
    private static final int RUTA_INVALIDA_LOG_MAX_IPS = 10_000;

    /** IPs ya logueadas por ruta inválida en la ventana actual; vence sola y tiene tope de entradas. */
    private final com.github.benmanes.caffeine.cache.Cache<String, Boolean> logRutaInvalida =
        com.github.benmanes.caffeine.cache.Caffeine.newBuilder()
            .expireAfterWrite(java.time.Duration.ofSeconds(RUTA_INVALIDA_VENTANA))
            .maximumSize(RUTA_INVALIDA_LOG_MAX_IPS)
            .build();

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
        // QA4-004: reenvío público de verificación desde /login (además tope por correo en el servicio)
        Map.entry("/api/auth/reenviar-verificacion", new Limit(3, 300)),
        Map.entry("/api/auth/refresh",            new Limit(30,   60)),
        Map.entry("/api/auth/change-password",    new Limit(5,   300)),
        // General
        Map.entry("/api/contacto",                new Limit(5,    60)),
        Map.entry("/api/telegram/vincular",       new Limit(5,    60)),
        Map.entry("/api/pedidos",                 new Limit(15,   60)),
        Map.entry("/api/payments/checkout",       new Limit(3,    60)),
        Map.entry("/api/payments/guest-checkout", new Limit(3,    60)),
        // P-03: checkout SINPE invitado, mismo tope que el de tarjeta
        Map.entry("/api/sinpe/guest-checkout",    new Limit(3,    60)),
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
        // MEDIO 3: generar QR del POS reserva stock; frena ráfagas por IP (va después de /pago/: gana el primero)
        new PrefixLimit("/api/pos/qr", null, 30, 60),
        // P-03: comprobante SINPE invitado (sube a S3 y valida pedido): bucket por IP + prefijo,
        // cambiar el número de pedido no abre otro cupo (frena enumeración)
        new PrefixLimit("/api/sinpe/guest/", null, 5, 60),
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
        // Segunda capa por IP (la principal es por usuario, fail-closed, en GiftCardController): probar códigos con saldo
        new GetLimit("/api/gift-cards/validar",          30,  60),
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
        // El tope se decide sobre la ruta canónica (RutaCanonica): sin decodificar, ";x", "//" ni "/./" la
        // petición llegaba al controlador (Spring MVC la decodifica) sin tocar el cupo. getServletPath()
        // no sirve: devuelve "" en MockMvc y ya viene decodificado según el contenedor.
        String path = RutaCanonica.de(request.getRequestURI(), request.getContextPath());
        if (path == null) {
            // Ruta inválida (porcentaje roto, UTF-8 inválido, control o encoding de más de 3 niveles): fail-closed.
            // B1: el rechazo cuenta contra un cupo por IP (así no es una vía gratis para inundar) y el log se
            // muestrea, uno por IP y ventana, para que repetirla no llene el log.
            // B1/B2 (#395): la IP puede llegar null (peer ilegible): comparte la llave "desconocida" en vez de lanzar
            // NPE (500); una IPv6 cuenta por su /64, así rotar direcciones del mismo prefijo no abre cupos nuevos.
            String ipInvalida = IpParaLlave.clave(clientIpResolver.resolve(request));
            boolean dentroDelCupo = rateLimiter.tryAcquire(
                "ip:" + ipInvalida + ":ruta-invalida", RUTA_INVALIDA_MAX, RUTA_INVALIDA_VENTANA);
            // El muestreo del log es local (memoria): no abre una segunda fila por IP en la BD y sigue
            // funcionando si la BD está caída (con tryAcquire fail-open cada request lograba "turno" y logueaba).
            if (logRutaInvalida.asMap().putIfAbsent(ipInvalida, Boolean.TRUE) == null) {
                log.warn("[RATE-LIMIT] ruta no canónica rechazada ip={} (se muestrea: un log por IP cada {}s)",
                    ipInvalida, RUTA_INVALIDA_VENTANA);
            }
            response.setStatus(dentroDelCupo ? 400 : 429);
            response.setCharacterEncoding("UTF-8");
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write(dentroDelCupo
                ? "{\"success\":false,\"message\":\"Ruta no válida.\"}"
                : "{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}");
            return;
        }
        String method = request.getMethod();

        if ("POST".equalsIgnoreCase(method)) {
            String ip    = clientIpResolver.resolve(request); // IP real: para log y auditoría
            Limit  limit = LIMITS.get(path);
            if (limit == null) limit = limite2fa(path);
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
                String key = "ip:" + IpParaLlave.clave(ip) + ":" + bucket; // llave por /64 (B2)
                if (!rateLimiter.tryAcquire(key, limit.maxRequests(), limit.windowSeconds())) {
                    log.warn("[RATE-LIMIT] ip={} path={}", ip, RutaLogSegura.enmascarar(path));
                    try { auditService.logRateLimitTriggered(ip, RutaLogSegura.enmascarar(path)); } catch (Exception e) { log.warn("audit error: {}", e.getMessage()); }
                    response.setStatus(429);
                    response.setCharacterEncoding("UTF-8"); // ESC-8: sin mojibake en «Esperá»
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.getWriter().write(
                        "{\"success\":false,\"message\":\"Demasiados intentos. Esperá un momento antes de volver a intentar.\"}");
                    return;
                }
            }
        } else if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)) {
            // HEAD: Spring MVC lo enruta al handler de GET y ejecuta el mismo código, así que comparte el
            // bucket de GET ("ip:<ip>:GET:<prefijo>"). Sin esto, repetir HEAD evadía todos los GetLimit.
            String ip = clientIpResolver.resolve(request); // IP real: para log y auditoría
            for (GetLimit gl : GET_LIMITS) {
                if (path.startsWith(gl.prefix())) {
                    String key = "ip:" + IpParaLlave.clave(ip) + ":GET:" + gl.prefix(); // llave por /64 (B2)
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
}
