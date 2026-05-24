package com.hotclick.config;

import com.hotclick.security.JwtRequestFilter;
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
    private UserDetailsService userDetailsService;

    @Value("${cors.allowed.origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

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
                // Auth: 2FA verify es público; el resto requiere JWT
                .requestMatchers(POST, "/api/auth/2fa/verify").permitAll()
                .requestMatchers("/api/auth/2fa/**").authenticated()
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
                .requestMatchers(GET, "/api/productos/*").permitAll()
                .requestMatchers(GET, "/api/productos/*/recomendaciones").permitAll()
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
                // Testimonios — público: GET aprobados; auth: crear + subir imagen; admin: listar todos + moderar
                .requestMatchers(GET, "/api/testimonios/publicos").permitAll()
                .requestMatchers(GET, "/api/testimonios/admin").hasRole("ADMIN_IT")
                .requestMatchers(PUT, "/api/testimonios/*/aprobar").hasRole("ADMIN_IT")
                .requestMatchers(PUT, "/api/testimonios/*/rechazar").hasRole("ADMIN_IT")
                // Carrito abandonado — público (usuarios anónimos y links de email)
                .requestMatchers(POST, "/api/cart/abandoned").permitAll()
                .requestMatchers(GET,  "/api/cart/abandoned/recover/**").permitAll()
                .requestMatchers(GET,  "/api/cart/abandoned/session/**").permitAll()
                .requestMatchers(DELETE, "/api/cart/abandoned/**").permitAll()
                // Feeds y sitemap públicos
                .requestMatchers(GET, "/api/public/**").permitAll()
                .requestMatchers(GET, "/sitemap.xml").permitAll()
                // Admin-only routes — ADMIN_IT required
                .requestMatchers("/api/admin/**").hasRole("ADMIN_IT")
                .requestMatchers(GET,    "/api/pedidos").hasRole("ADMIN_IT")
                .requestMatchers(GET,    "/api/pedidos/pendientes").hasRole("ADMIN_IT")
                .requestMatchers(POST,   "/api/pedidos/manual").hasRole("ADMIN_IT")
                .requestMatchers(PUT,    "/api/pedidos/*/estado").hasRole("ADMIN_IT")
                .requestMatchers(PUT,    "/api/pedidos/*/guia").hasRole("ADMIN_IT")
                .requestMatchers(PUT,    "/api/pedidos/*/envio").hasRole("ADMIN_IT")
                .requestMatchers(DELETE, "/api/pedidos/*").hasRole("ADMIN_IT")
                .requestMatchers(POST,   "/api/pedidos/*/notificar").hasRole("ADMIN_IT")
                // Todas las demás rutas /api/** requieren autenticación
                .requestMatchers("/api/**").authenticated()
                // Rutas del SPA React (frontend)
                .requestMatchers("/error", "/error/**").permitAll()
                .requestMatchers("/", "/*.html", "/*.ico", "/*.jpg", "/*.jpeg", "/*.png",
                    "/*.svg", "/*.webp", "/favicon.ico", "/pages/**", "/css/**", "/js/**",
                    "/images/**", "/assets/**", "/admin/**",
                    "/nosotros", "/productos", "/productos/**", "/informacion", "/contacto",
                    "/carrito", "/login", "/registro", "/perfil", "/perfil/**", "/mis-pedidos",
                    "/checkout", "/pago/exito", "/pago/cancelado",
                    "/recuperar-carrito", "/recuperar-carrito/**",
                    "/servicios", "/servicios/**").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .frameOptions(fo -> fo.deny())
                .contentTypeOptions(ct -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                .addHeaderWriter((req, res) -> {
                    res.setHeader("X-Content-Type-Options", "nosniff");
                    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
                    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
                    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
                })
            );

        http.exceptionHandling(ex -> ex
            .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        );
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
