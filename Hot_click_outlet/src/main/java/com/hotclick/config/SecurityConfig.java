package com.hotclick.config;

import com.hotclick.security.BlockedIpFilter;
import com.hotclick.security.InternalSecretFilter;
import com.hotclick.security.JwtRequestFilter;
import com.hotclick.security.RateLimitingFilter;
import com.hotclick.security.TenantFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List;
import org.springframework.security.web.csrf.CsrfFilter;
import static org.springframework.http.HttpMethod.*;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private UserDetailsService userDetailsService;

    @Value("${cors.allowed.origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    @Value("${aws.s3.public-url:https://hotclick-media.s3.us-east-2.amazonaws.com}")
    private String s3PublicUrl;

    // ── Filtros de seguridad como @Bean (sin @Component) ─────────────────────────
    // Spring Security 6.3 requiere que los filtros usados en addFilterBefore no sean
    // @Component auto-detectados por Tomcat. Se crean aquí para que Spring gestione
    // su ciclo de vida e inyecte sus dependencias vía @Autowired.

    @Bean
    JwtRequestFilter jwtRequestFilter() { return new JwtRequestFilter(); }

    @Bean
    RateLimitingFilter rateLimitingFilter() { return new RateLimitingFilter(); }

    @Bean
    TenantFilter tenantFilter() { return new TenantFilter(); }

    @Bean
    InternalSecretFilter internalSecretFilter() { return new InternalSecretFilter(); }

    @Bean
    BlockedIpFilter blockedIpFilter() { return new BlockedIpFilter(); }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of(
            "Authorization", "Content-Type", "Accept", "Origin",
            "X-Requested-With", "X-Internal-Secret",
            "Access-Control-Request-Method", "Access-Control-Request-Headers"
        ));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
            JwtRequestFilter jwtRequestFilter,
            RateLimitingFilter rateLimitingFilter,
            TenantFilter tenantFilter,
            InternalSecretFilter internalSecretFilter,
            BlockedIpFilter blockedIpFilter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Actuator — locked to ADMIN only
                .requestMatchers("/actuator/**").hasRole("ADMIN")
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
                .requestMatchers(GET, "/api/productos/*").permitAll()
                // Stock en tiempo real (SSE) — público; el tenant se infiere del producto, no del caller
                .requestMatchers(GET, "/api/marketplace/productos/*/stock-stream").permitAll()
                // Gestión de productos — roles de empresa + API keys con scope write:productos
                .requestMatchers(POST,   "/api/productos").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(PUT,    "/api/productos/*").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(DELETE, "/api/productos/*").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(POST,   "/api/productos/**").hasAnyRole("ADMIN", "EMPRENDEDOR")
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
                .requestMatchers(GET,    "/api/servicios").hasRole("ADMIN")
                .requestMatchers(PUT,    "/api/servicios/*/estado").hasRole("ADMIN")
                .requestMatchers(DELETE, "/api/servicios/*").hasRole("ADMIN")
                // Garantías — mis-garantias y mis-solicitudes: auth; admin: ADMIN
                .requestMatchers(GET, "/api/garantias/solicitudes/mis-solicitudes").authenticated()
                .requestMatchers(GET, "/api/garantias/solicitudes").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(PUT, "/api/garantias/solicitudes/*/estado").hasAnyRole("ADMIN", "EMPRENDEDOR")
                // Testimonios — público: GET aprobados; auth: crear + subir imagen; admin: listar todos + moderar
                .requestMatchers(GET, "/api/testimonios/publicos").permitAll()
                .requestMatchers(GET, "/api/testimonios/producto/*/rating").permitAll()
                // Blog — público: listado y detalle de publicaciones publicadas
                .requestMatchers(GET, "/api/blog/publico").permitAll()
                .requestMatchers(GET, "/api/blog/publico/*").permitAll()
                .requestMatchers(GET, "/api/testimonios/admin").hasRole("ADMIN")
                .requestMatchers(PUT, "/api/testimonios/*/aprobar").hasRole("ADMIN")
                .requestMatchers(PUT, "/api/testimonios/*/rechazar").hasRole("ADMIN")
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
                .requestMatchers(GET,  "/api/empresa/perfil").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(PUT,  "/api/empresa/perfil").hasAnyRole("EMPRENDEDOR", "ADMIN")
                .requestMatchers(PUT,  "/api/empresa/perfil/visibilidad").hasAnyRole("EMPRENDEDOR", "ADMIN")
                .requestMatchers(PUT,  "/api/empresa/perfil/fiscal").hasAnyRole("EMPRENDEDOR", "ADMIN")
                .requestMatchers(POST, "/api/empresa/perfil/cert-p12").hasAnyRole("EMPRENDEDOR", "ADMIN")
                .requestMatchers(POST, "/api/empresa/perfil/logo").hasAnyRole("EMPRENDEDOR", "ADMIN")
                // Gestión de equipo — accesible para EMPRENDEDOR de la misma empresa
                .requestMatchers(GET,    "/api/empresa/equipo").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(POST,   "/api/empresa/equipo").hasRole("EMPRENDEDOR")
                .requestMatchers(PUT,    "/api/empresa/equipo/*/rol").hasRole("EMPRENDEDOR")
                .requestMatchers(DELETE, "/api/empresa/equipo/*").hasRole("EMPRENDEDOR")
                // Security Center — ADMIN only
                .requestMatchers("/api/security/**").hasRole("ADMIN")
                // Observabilidad — ADMIN only
                .requestMatchers("/api/admin/observabilidad/**").hasRole("ADMIN")
                // Admin-only routes — ADMIN only (superadmin exclusivos)
                .requestMatchers("/api/admin/empresas/**").hasRole("ADMIN")
                .requestMatchers("/api/auth/seleccionar-empresa").permitAll()
                .requestMatchers("/api/auth/mis-negocios").authenticated()
                .requestMatchers("/api/auth/cambiar-negocio").authenticated()
                .requestMatchers("/api/auth/nuevo-negocio").authenticated()
                // Dashboard y KPIs — ADMIN, EMPRENDEDOR
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "EMPRENDEDOR")
                // Pedidos admin — ADMIN, EMPRENDEDOR
                // Pedidos — roles de empresa + API keys con scope read:pedidos o write:pedidos
                .requestMatchers(GET,    "/api/pedidos").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(GET,    "/api/pedidos/pendientes").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(POST,   "/api/pedidos/manual").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(PUT,    "/api/pedidos/*/estado").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(PUT,    "/api/pedidos/*/guia").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(PUT,    "/api/pedidos/*/envio").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(DELETE, "/api/pedidos/*").hasAnyRole("ADMIN", "EMPRENDEDOR")
                .requestMatchers(POST,   "/api/pedidos/*/notificar").hasAnyRole("ADMIN", "EMPRENDEDOR")
                // Lista de usuarios — solo admin (perfil propio y actualización siguen autenticados)
                .requestMatchers(GET, "/api/usuarios").hasRole("ADMIN")
                // Todas las demás rutas /api/** requieren autenticación
                .requestMatchers("/api/**").authenticated()
                // Rutas del SPA React (frontend)
                .requestMatchers("/error", "/error/**").permitAll()
                .requestMatchers("/sw.js", "/manifest.webmanifest", "/workbox-*.js",
                    "/registerSW.js", "/vite.svg", "/robots.txt").permitAll()
                .requestMatchers("/", "/*.html", "/*.ico", "/*.jpg", "/*.jpeg", "/*.png",
                    "/*.svg", "/*.webp", "/favicon.ico", "/pages/**", "/css/**", "/js/**",
                    "/images/**", "/assets/**", "/admin/**",
                    "/nosotros", "/productos", "/productos/**", "/informacion", "/contacto",
                    "/carrito", "/login", "/registro", "/registro-empresa", "/perfil", "/perfil/**", "/mis-pedidos",
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
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .frameOptions(fo -> fo.sameOrigin())
                .contentTypeOptions(ct -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                    .preload(true))
                .addHeaderWriter((req, res) -> {
                    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
                    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
                    res.setHeader("Content-Security-Policy",
                        "default-src 'self'; " +
                        "script-src 'self' https://js.stripe.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://www.googletagmanager.com https://www.google-analytics.com; " +
                        "script-src-elem 'self' https://js.stripe.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://www.googletagmanager.com https://www.google-analytics.com; " +
                        "worker-src blob: 'self'; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                        "font-src 'self' https://fonts.gstatic.com; " +
                        "img-src 'self' data: blob: " + s3PublicUrl + " https://*.amazonaws.com https://images.unsplash.com https://*.googleusercontent.com https://img.clerk.com https://avatars.githubusercontent.com https://cdnjs.cloudflare.com; " +
                        "connect-src 'self' " + s3PublicUrl + " https://*.amazonaws.com https://*.clerk.accounts.dev https://clerk.hotclick.lat https://api.clerk.com https://clerk-telemetry.com https://api.stripe.com https://hooks.stripe.com https://www.google-analytics.com https://region1.google-analytics.com; " +
                        "frame-src https://js.stripe.com https://hooks.stripe.com https://www.youtube.com https://www.youtube-nocookie.com https://www.tiktok.com https://www.instagram.com; " +
                        "frame-ancestors 'self'; " +
                        "object-src 'none'; " +
                        "base-uri 'self';"
                    );
                })
            );

        http.exceptionHandling(ex -> ex
            .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        );
        // Orden: BlockedIp(~300) → Internal(~400) → RateLimiting(~500) → Jwt(~700) → Tenant(~900)
        http.addFilterBefore(blockedIpFilter, CsrfFilter.class);
        http.addFilterBefore(internalSecretFilter, CsrfFilter.class);
        http.addFilterBefore(rateLimitingFilter, CsrfFilter.class);
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(tenantFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
