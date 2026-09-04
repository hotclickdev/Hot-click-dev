package com.hotclick.security.config;

import com.hotclick.utils.Constants;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;

import static org.springframework.http.HttpMethod.*;

/**
 * Reglas de autorización HTTP de Spring Security.
 * Extraído bit-idéntico de SecurityConfig — no cambia comportamiento.
 */
final class SecurityAuthorizationRules {

    private static final String API_PRODUCTO_POR_ID = "/api/productos/*";

    private SecurityAuthorizationRules() {}

    static Customizer<AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry> configure() {
        return auth -> auth
            // Actuator — locked to ADMIN only
            .requestMatchers("/actuator/**").hasRole(Constants.ROL_ADMIN)
            // Auth: 2FA verify y envío de EMAIL OTP durante login son públicos (validan tempToken internamente)
            .requestMatchers(POST, "/api/auth/2fa/verify").permitAll()
            .requestMatchers(POST, "/api/auth/2fa/email/send").permitAll()
            // Gestión de métodos 2FA requiere sesión activa
            .requestMatchers(POST, "/api/auth/2fa/email/enable").authenticated()
            .requestMatchers(POST, "/api/auth/2fa/email/activate").authenticated()
            .requestMatchers(POST, "/api/auth/2fa/email/disable").authenticated()
            .requestMatchers("/api/auth/2fa/**").authenticated()
            .requestMatchers("/api/auth/verificar-correo-negocio").permitAll()
            .requestMatchers(POST, "/api/auth/reenviar-codigo-negocio").authenticated()
            .requestMatchers("/api/auth/**").permitAll()
            .requestMatchers("/api/health").permitAll()
            .requestMatchers("/api/webhooks/**").permitAll()
            // Bitácora de consentimiento — público (también lo usan invitados en checkout)
            .requestMatchers(POST, "/api/consentimiento").permitAll()
            // Self-checkout QR — completamente público (sin JWT)
            .requestMatchers(GET,  "/api/qr/**").permitAll()
            .requestMatchers(POST, "/api/qr/*/pedido").permitAll()
            // POS QR pago — rutas públicas (cliente escanea QR)
            .requestMatchers(GET,  "/api/pos/qr/pago/**").permitAll()
            .requestMatchers(POST, "/api/pos/qr/pago/*/stripe").permitAll()
            .requestMatchers(POST, "/api/pos/qr/pago/*/intent").permitAll()
            // Compra sin registro (invitados)
            .requestMatchers(POST, "/api/payments/guest-checkout").permitAll()
            .requestMatchers(POST, "/api/payments/guest/cancel/*").permitAll()
            .requestMatchers(GET,  "/api/payments/status/*").permitAll()
            // SINPE — invitados
            .requestMatchers(POST, "/api/sinpe/guest-checkout").permitAll()
            .requestMatchers(POST, "/api/sinpe/guest/*/comprobante").permitAll()
            // Catálogo público por slug — tienda propia del emprendedor (sin JWT)
            // Tienda pública por slug — API y SPA (sin JWT)
            .requestMatchers(GET,  "/api/tienda/**").permitAll()
            .requestMatchers(POST, "/api/tienda/*/pedidos").permitAll()
            .requestMatchers("/tienda", "/tienda/**").permitAll()
            // Catálogo público - solo GETs específicos
            .requestMatchers(GET, "/api/productos/admin/todos").authenticated()
            .requestMatchers(GET, "/api/productos/pos/**").authenticated()
            .requestMatchers(GET, "/api/productos").permitAll()
            .requestMatchers(GET, "/api/productos/destacados").permitAll()
            .requestMatchers(GET, "/api/productos/marca/*").permitAll()
            .requestMatchers(GET, "/api/productos/*/recomendaciones").permitAll()
            .requestMatchers(GET, "/api/productos/*/imagenes").permitAll()
            .requestMatchers(GET, "/api/productos/*/variantes").permitAll()
            .requestMatchers(GET, API_PRODUCTO_POR_ID).permitAll()
            // Stock en tiempo real (SSE) — público; el tenant se infiere del producto, no del caller
            .requestMatchers(GET, "/api/marketplace/productos/*/stock-stream").permitAll()
            // Gestión de productos — roles de empresa + API keys con scope write:productos
            .requestMatchers(POST,   "/api/productos").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,    API_PRODUCTO_POR_ID).hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PATCH,  "/api/productos/*/visibilidad-catalogo").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(DELETE, API_PRODUCTO_POR_ID).hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(POST,   "/api/productos/**").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(GET, "/api/categorias").permitAll()
            .requestMatchers(GET, "/api/categorias/**").permitAll()
            .requestMatchers(GET, "/api/convenios/publicos").permitAll()
            .requestMatchers(GET, "/api/marcas/publicas").permitAll()
            .requestMatchers(GET, "/api/planes").permitAll()
            .requestMatchers(GET, "/api/billing/planes").permitAll()
            .requestMatchers("/api/billing/**").authenticated()
            // Gift cards — validación pública en checkout; admin CRUD protegido por @PreAuthorize
            .requestMatchers(GET, "/api/gift-cards/validar").authenticated()
            .requestMatchers("/api/admin/gift-cards/**").authenticated()
            // White label branding y chat público — sin auth
            .requestMatchers(GET,  "/api/public/branding").permitAll()
            .requestMatchers(POST, "/api/public/chat").permitAll()
            .requestMatchers(POST, "/api/public/shopping-assistant/chat").permitAll()
            .requestMatchers(POST, "/api/public/shopping-assistant/search-by-image").permitAll()
            .requestMatchers(POST, "/api/public/shopping-assistant/feedback").permitAll()
            .requestMatchers(DELETE, "/api/public/shopping-assistant/session/**").permitAll()
            .requestMatchers(GET, "/api/cupones/validar").permitAll()
            .requestMatchers(GET, "/api/testimonios/producto/*/resenas").permitAll()
            .requestMatchers(POST, "/api/public/solicitud-especial").permitAll()
            .requestMatchers("/api/admin/branding").authenticated()
            // Marketplace de plugins y API keys
            .requestMatchers("/api/admin/plugins/**").authenticated()
            // LATAM multi-país
            .requestMatchers(GET, "/api/admin/multipais/paises").permitAll()
            .requestMatchers("/api/admin/multipais/**").authenticated()
            // Executive dashboard + forecast
            .requestMatchers("/api/admin/executive/**").authenticated()
            .requestMatchers("/api/admin/forecast/**").authenticated()
            .requestMatchers("/api/admin/inventario/**").authenticated()
            .requestMatchers("/api/admin/ai/**").authenticated()
            .requestMatchers("/api/tenant/**").authenticated()
            .requestMatchers(GET, "/api/ruleta/premios").permitAll()
            .requestMatchers(POST, "/api/contacto").permitAll()
            // Servicios HOT — fotos y solicitudes son públicas; gestión requiere ADMIN
            .requestMatchers(POST, "/api/servicios/fotos").permitAll()
            .requestMatchers(POST, "/api/servicios").permitAll()
            .requestMatchers(GET,    "/api/servicios").hasRole(Constants.ROL_ADMIN)
            .requestMatchers(PUT,    "/api/servicios/*/estado").hasRole(Constants.ROL_ADMIN)
            .requestMatchers(DELETE, "/api/servicios/*").hasRole(Constants.ROL_ADMIN)
            // Encargos personalizados — público: subir imagen, crear, ver token, checkout
            .requestMatchers(POST, "/api/public/encargos/imagenes").permitAll()
            .requestMatchers(POST, "/api/public/encargos").permitAll()
            .requestMatchers(GET,  "/api/public/encargos/**").permitAll()
            .requestMatchers(POST, "/api/public/encargos/*/checkout").permitAll()
            .requestMatchers(GET,  "/api/encargos").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,  "/api/encargos/*/aprobar").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,  "/api/encargos/*/rechazar").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            // Recolección / entrega GAM — vendedor solicita; admin IT cotiza tarifa
            .requestMatchers(POST, "/api/recolecciones").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(GET,  "/api/recolecciones").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,  "/api/recolecciones/*/tarifa").hasRole(Constants.ROL_ADMIN)
            .requestMatchers(PUT,  "/api/recolecciones/*/rechazar").hasRole(Constants.ROL_ADMIN)
            .requestMatchers(PUT,  "/api/recolecciones/*/cancelar").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            // Métodos de cobro del vendedor (cuentas SINPE/IBAN/tarjeta referencia)
            .requestMatchers(GET,  "/api/metodos-cobro").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(POST, "/api/metodos-cobro").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,  "/api/metodos-cobro/*/predeterminado").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            // Bot Telegram del negocio: vincular / estado / equipo. Webhook admin IT aparte.
            .requestMatchers("/api/telegram/admin/**").hasRole(Constants.ROL_ADMIN)
            .requestMatchers("/api/telegram/**").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            // Garantías — mis-garantias y mis-solicitudes: auth; admin: ADMIN
            .requestMatchers(GET, "/api/garantias/solicitudes/mis-solicitudes").authenticated()
            .requestMatchers(GET, "/api/garantias/solicitudes").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT, "/api/garantias/solicitudes/*/estado").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            // Testimonios — público: GET aprobados; auth: crear + subir imagen; admin: listar todos + moderar
            .requestMatchers(GET, "/api/testimonios/publicos").permitAll()
            .requestMatchers(GET, "/api/testimonios/producto/*/rating").permitAll()
            // Blog — público: listado y detalle de publicaciones publicadas
            .requestMatchers(GET, "/api/blog/publico").permitAll()
            .requestMatchers(GET, "/api/blog/publico/*").permitAll()
            .requestMatchers(GET, "/api/testimonios/admin").hasRole(Constants.ROL_ADMIN)
            .requestMatchers(PUT, "/api/testimonios/*/aprobar").hasRole(Constants.ROL_ADMIN)
            .requestMatchers(PUT, "/api/testimonios/*/rechazar").hasRole(Constants.ROL_ADMIN)
            .requestMatchers(POST, "/api/reportes-producto").authenticated()
            .requestMatchers("/api/admin/reportes-producto/**").hasAnyAuthority(
                "ROLE_" + Constants.ROL_ADMIN, Constants.PERM_GLOBAL_APPROVALS)
            .requestMatchers(GET, "/api/admin/moderacion/**").hasAnyAuthority(
                "ROLE_" + Constants.ROL_ADMIN, Constants.PERM_GLOBAL_APPROVALS)
            // Carrito abandonado — público (incluye DELETE; el controller valida sessionId)
            .requestMatchers(POST, "/api/cart/abandoned").permitAll()
            .requestMatchers(GET,  "/api/cart/abandoned/recover/**").permitAll()
            .requestMatchers(GET,  "/api/cart/abandoned/session/**").permitAll()
            .requestMatchers(DELETE, "/api/cart/abandoned/**").permitAll()
            // Cotizaciones — enlace público para cliente (sin auth)
            .requestMatchers(GET, "/api/cotizaciones/publica/**").permitAll()
            // Hacienda — consulta de contribuyente (pública, sin auth)
            .requestMatchers(GET, "/api/hacienda/contribuyente/**").permitAll()
            // Proxy de imágenes Supabase — público, sin auth
            .requestMatchers(GET, "/api/img").permitAll()
            // Feeds y sitemap públicos
            .requestMatchers(GET, "/api/public/**").permitAll()
            .requestMatchers(GET, "/sitemap.xml").permitAll()
            // Perfil de empresa — solo lectura para todos los roles de la empresa; escritura solo EMPRENDEDOR
            .requestMatchers(GET,  "/api/empresa/perfil").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,  "/api/empresa/perfil").hasAnyRole(Constants.ROL_EMPRENDEDOR, Constants.ROL_ADMIN)
            .requestMatchers(PUT,  "/api/empresa/perfil/visibilidad").hasAnyRole(Constants.ROL_EMPRENDEDOR, Constants.ROL_ADMIN)
            .requestMatchers(PUT,  "/api/empresa/perfil/fiscal").hasAnyRole(Constants.ROL_EMPRENDEDOR, Constants.ROL_ADMIN)
            .requestMatchers(POST, "/api/empresa/perfil/cert-p12").hasAnyRole(Constants.ROL_EMPRENDEDOR, Constants.ROL_ADMIN)
            .requestMatchers(POST, "/api/empresa/perfil/logo").hasAnyRole(Constants.ROL_EMPRENDEDOR, Constants.ROL_ADMIN)
            // Gestión de equipo — accesible para EMPRENDEDOR de la misma empresa
            .requestMatchers(GET,    "/api/empresa/equipo").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(POST,   "/api/empresa/equipo").hasRole(Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,    "/api/empresa/equipo/*/rol").hasRole(Constants.ROL_EMPRENDEDOR)
            .requestMatchers(DELETE, "/api/empresa/equipo/*").hasRole(Constants.ROL_EMPRENDEDOR)
            // Sucursales (Negocio Plus) — ADMIN / EMPRENDEDOR; aislamiento por CompanyScope
            .requestMatchers(GET,  "/api/sucursales").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(POST, "/api/sucursales").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,  "/api/sucursales/*").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(DELETE, "/api/sucursales/*").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            // Security Center — ADMIN only
            .requestMatchers("/api/security/**").hasRole(Constants.ROL_ADMIN)
            // Observabilidad — ADMIN only
            .requestMatchers("/api/admin/observabilidad/**").hasRole(Constants.ROL_ADMIN)
            // Staff por permiso global.* (ADMIN tiene todos; SUPPORT/FINANCE/TRUST el suyo)
            .requestMatchers("/api/admin/empresas/**").hasAnyAuthority(
                "ROLE_" + Constants.ROL_ADMIN, Constants.PERM_GLOBAL_COMPANIES)
            .requestMatchers("/api/admin/solicitudes-aprobacion/**").hasAnyAuthority(
                "ROLE_" + Constants.ROL_ADMIN, Constants.PERM_GLOBAL_APPROVALS)
            .requestMatchers("/api/admin/payouts/**").hasAnyAuthority(
                "ROLE_" + Constants.ROL_ADMIN, Constants.PERM_GLOBAL_METRICS)
            .requestMatchers("/api/admin/pagos/**").hasAnyAuthority(
                "ROLE_" + Constants.ROL_ADMIN, "ROLE_" + Constants.ROL_EMPRENDEDOR,
                Constants.PERM_GLOBAL_METRICS)
            .requestMatchers("/api/auth/seleccionar-empresa").permitAll()
            .requestMatchers("/api/auth/mis-negocios").authenticated()
            .requestMatchers("/api/auth/cambiar-negocio").authenticated()
            .requestMatchers("/api/auth/nuevo-negocio").authenticated()
            // Dashboard y KPIs — ADMIN, EMPRENDEDOR y staff de plataforma
            .requestMatchers("/api/admin/**").hasAnyRole(
                Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR,
                Constants.ROL_SUPPORT, Constants.ROL_FINANCE, Constants.ROL_TRUST)
            // Pedidos admin — ADMIN, EMPRENDEDOR
            // Pedidos — roles de empresa + API keys con scope read:pedidos o write:pedidos
            .requestMatchers(GET,    "/api/pedidos").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(GET,    "/api/pedidos/pendientes").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(POST,   "/api/pedidos/manual").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,    "/api/pedidos/*/estado").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,    "/api/pedidos/*/guia").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(PUT,    "/api/pedidos/*/envio").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(DELETE, "/api/pedidos/*").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            .requestMatchers(POST,   "/api/pedidos/*/notificar").hasAnyRole(Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
            // Lista de usuarios — solo admin (perfil propio y actualización siguen autenticados)
            .requestMatchers(GET, "/api/usuarios").hasRole(Constants.ROL_ADMIN)
            // Todas las demás rutas /api/** requieren autenticación
            .requestMatchers("/api/**").authenticated()
            // Rutas del SPA React (frontend)
            .requestMatchers("/error", "/error/**").permitAll()
            .requestMatchers("/sw.js", "/manifest.webmanifest", "/workbox-*.js",
                "/registerSW.js", "/vite.svg", "/robots.txt").permitAll()
            .requestMatchers("/", "/*.html", "/*.ico", "/*.jpg", "/*.jpeg", "/*.png",
                "/*.svg", "/*.webp", "/favicon.ico", "/pages/**", "/css/**", "/js/**",
                "/images/**", "/assets/**", "/brand/**", "/admin/**",
                "/visitante", "/visitante/**", "/emprendedor", "/emprendedor/**",
                "/pyme", "/pyme/**", "/negocio-plus", "/negocio-plus/**",
                "/prototipo", "/prototipo/**",
                "/nosotros", "/productos", "/productos/**", "/descubri", "/informacion", "/contacto",
                "/carrito", "/login", "/registro", "/registro-empresa", "/perfil", "/perfil/**", "/mis-pedidos",
                "/wishlist", "/blog", "/blog/**", "/emprende", "/emprendimientos",
                "/404",
                "/seleccionar-negocio", "/mode-select", "/registrar-negocio",
                "/sso-callback", "/sso-complete",
                "/checkout", "/pago/exito", "/pago/cancelado",
                "/pos/pago", "/pos/pago/**",
                "/recuperar-carrito", "/recuperar-carrito/**",
                "/servicios", "/servicios/**",
                "/admin/empresas", "/admin/empresas/**",
                "/admin/equipo", "/admin/aprobaciones",
                "/admin/mi-empresa", "/admin/security",
                "/admin/billing", "/admin/billing/**",
                "/admin/offline", "/admin/offline/**",
                "/admin/gift-cards", "/admin/gift-cards/**",
                "/checkout/qr", "/checkout/qr/**").permitAll()
            .anyRequest().authenticated();
    }
}
