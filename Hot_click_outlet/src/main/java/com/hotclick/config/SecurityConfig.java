package com.hotclick.config;

import com.hotclick.security.JwtRequestFilter;
import com.hotclick.security.RateLimitingFilter;
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
import static org.springframework.http.HttpMethod.*;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtRequestFilter jwtRequestFilter;

    @Autowired
    private RateLimitingFilter rateLimitingFilter;

    @Autowired
    private UserDetailsService userDetailsService;

    @Value("${cors.allowed.origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    @Value("${supabase.url:https://nkevwfcjhjaawtdqquns.supabase.co}")
    private String supabaseUrl;

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
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                // Actuator — locked to ADMIN_IT only
                .requestMatchers("/actuator/**").hasRole("ADMIN_IT")
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
                .requestMatchers(POST, "/api/webhooks/payxpert").permitAll()
                .requestMatchers(POST, "/api/webhooks/paypal").permitAll()
                // Compra sin registro (invitados)
                .requestMatchers(POST, "/api/payments/guest-checkout").permitAll()
                .requestMatchers(POST, "/api/payments/guest/paypal/capture").permitAll()
                .requestMatchers(POST, "/api/payments/guest/cancel/*").permitAll()
                .requestMatchers(GET,  "/api/payments/status/*").permitAll()
                // Catálogo público - solo GETs específicos
                .requestMatchers(GET, "/api/productos/admin/todos").authenticated()
                .requestMatchers(GET, "/api/productos").permitAll()
                .requestMatchers(GET, "/api/productos/destacados").permitAll()
                .requestMatchers(GET, "/api/productos/marca/*").permitAll()
                .requestMatchers(GET, "/api/productos/*/recomendaciones").permitAll()
                .requestMatchers(GET, "/api/productos/*").permitAll()
                // Gestión de productos — solo roles de empresa
                .requestMatchers(POST,   "/api/productos").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(PUT,    "/api/productos/*").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(DELETE, "/api/productos/*").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(POST,   "/api/productos/**").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(GET, "/api/categorias").permitAll()
                .requestMatchers(GET, "/api/marcas/publicas").permitAll()
                .requestMatchers(GET, "/api/ruleta/premios").permitAll()
                .requestMatchers(POST, "/api/contacto").permitAll()
                // Servicios HOT — fotos y solicitudes son públicas; gestión requiere ADMIN_IT
                .requestMatchers(POST, "/api/servicios/fotos").permitAll()
                .requestMatchers(POST, "/api/servicios").permitAll()
                .requestMatchers(GET,    "/api/servicios").hasRole("ADMIN_IT")
                .requestMatchers(PUT,    "/api/servicios/*/estado").hasRole("ADMIN_IT")
                .requestMatchers(DELETE, "/api/servicios/*").hasRole("ADMIN_IT")
                // Garantías — mis-garantias y mis-solicitudes: auth; admin: ADMIN_IT
                .requestMatchers(GET, "/api/garantias/solicitudes/mis-solicitudes").authenticated()
                .requestMatchers(GET, "/api/garantias/solicitudes").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(PUT, "/api/garantias/solicitudes/*/estado").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                // Testimonios — público: GET aprobados; auth: crear + subir imagen; admin: listar todos + moderar
                .requestMatchers(GET, "/api/testimonios/publicos").permitAll()
                .requestMatchers(GET, "/api/testimonios/admin").hasRole("ADMIN_IT")
                .requestMatchers(PUT, "/api/testimonios/*/aprobar").hasRole("ADMIN_IT")
                .requestMatchers(PUT, "/api/testimonios/*/rechazar").hasRole("ADMIN_IT")
                // Carrito abandonado — público (incluye DELETE; el controller valida sessionId)
                .requestMatchers(POST, "/api/cart/abandoned").permitAll()
                .requestMatchers(GET,  "/api/cart/abandoned/recover/**").permitAll()
                .requestMatchers(GET,  "/api/cart/abandoned/session/**").permitAll()
                .requestMatchers(DELETE, "/api/cart/abandoned/**").permitAll()
                // Proxy de imágenes Supabase — público, sin auth
                .requestMatchers(GET, "/api/img").permitAll()
                // Feeds y sitemap públicos
                .requestMatchers(GET, "/api/public/**").permitAll()
                .requestMatchers(GET, "/sitemap.xml").permitAll()
                // Perfil de empresa — solo lectura para todos los roles de la empresa; escritura solo EMPRENDEDOR
                .requestMatchers(GET,  "/api/empresa/perfil").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(PUT,  "/api/empresa/perfil").hasAnyRole("EMPRENDEDOR", "ADMIN_IT")
                .requestMatchers(PUT,  "/api/empresa/perfil/visibilidad").hasAnyRole("EMPRENDEDOR", "ADMIN_IT")
                .requestMatchers(POST, "/api/empresa/perfil/logo").hasAnyRole("EMPRENDEDOR", "ADMIN_IT")
                // Gestión de equipo — accesible para EMPRENDEDOR y ADMIN_CLIENTE de la misma empresa
                .requestMatchers(GET,    "/api/empresa/equipo").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(POST,   "/api/empresa/equipo").hasRole("EMPRENDEDOR")
                .requestMatchers(PUT,    "/api/empresa/equipo/*/rol").hasRole("EMPRENDEDOR")
                .requestMatchers(DELETE, "/api/empresa/equipo/*").hasRole("EMPRENDEDOR")
                // Security Center — ADMIN_IT only
                .requestMatchers("/api/security/**").hasRole("ADMIN_IT")
                // Admin-only routes — ADMIN_IT only (superadmin exclusivos)
                .requestMatchers("/api/admin/empresas/**").hasRole("ADMIN_IT")
                .requestMatchers("/api/auth/seleccionar-empresa").permitAll()
                .requestMatchers("/api/auth/mis-negocios").authenticated()
                .requestMatchers("/api/auth/cambiar-negocio").authenticated()
                .requestMatchers("/api/auth/nuevo-negocio").authenticated()
                // Dashboard y KPIs — ADMIN_IT, EMPRENDEDOR y ADMIN_CLIENTE
                .requestMatchers("/api/admin/**").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                // Pedidos admin — ADMIN_IT, EMPRENDEDOR y ADMIN_CLIENTE
                .requestMatchers(GET,    "/api/pedidos").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(GET,    "/api/pedidos/pendientes").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(POST,   "/api/pedidos/manual").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(PUT,    "/api/pedidos/*/estado").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(PUT,    "/api/pedidos/*/guia").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(PUT,    "/api/pedidos/*/envio").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(DELETE, "/api/pedidos/*").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                .requestMatchers(POST,   "/api/pedidos/*/notificar").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
                // Lista de usuarios — solo admin (perfil propio y actualización siguen autenticados)
                .requestMatchers(GET, "/api/usuarios").hasRole("ADMIN_IT")
                // Todas las demás rutas /api/** requieren autenticación
                .requestMatchers("/api/**").authenticated()
                // Rutas del SPA React (frontend)
                .requestMatchers("/error", "/error/**").permitAll()
                .requestMatchers("/", "/*.html", "/*.ico", "/*.jpg", "/*.jpeg", "/*.png",
                    "/*.svg", "/*.webp", "/favicon.ico", "/pages/**", "/css/**", "/js/**",
                    "/images/**", "/assets/**", "/admin/**",
                    "/nosotros", "/productos", "/productos/**", "/informacion", "/contacto",
                    "/carrito", "/login", "/registro", "/registro-empresa", "/perfil", "/perfil/**", "/mis-pedidos",
                    "/checkout", "/pago/exito", "/pago/cancelado",
                    "/recuperar-carrito", "/recuperar-carrito/**",
                    "/servicios", "/servicios/**",
                    "/admin/empresas", "/admin/empresas/**",
                    "/admin/equipo", "/admin/aprobaciones",
                    "/admin/mi-empresa", "/admin/security").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .frameOptions(fo -> fo.sameOrigin())
                .contentTypeOptions(ct -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                .addHeaderWriter((req, res) -> {
                    res.setHeader("X-Content-Type-Options", "nosniff");
                    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
                    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
                    res.setHeader("Content-Security-Policy",
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                        "font-src 'self' https://fonts.gstatic.com; " +
                        "img-src 'self' data: blob: " + supabaseUrl + " https://www.paypalobjects.com; " +
                        "connect-src 'self' " + supabaseUrl + " https://api-m.paypal.com https://api-m.sandbox.paypal.com; " +
                        "frame-src https://www.paypal.com https://www.sandbox.paypal.com https://www.youtube.com https://www.youtube-nocookie.com; " +
                        "object-src 'none'; " +
                        "base-uri 'self';"
                    );
                })
            );

        http.exceptionHandling(ex -> ex
            .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        );
        http.addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
