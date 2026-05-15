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
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;
import java.util.List;
import static org.springframework.http.HttpMethod.*;

@Configuration
@EnableWebSecurity
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
                // Catálogo público - solo GETs específicos
                .requestMatchers(GET, "/api/productos/admin/todos").authenticated()
                .requestMatchers(GET, "/api/productos").permitAll()
                .requestMatchers(GET, "/api/productos/destacados").permitAll()
                .requestMatchers(GET, "/api/productos/*").permitAll()
                .requestMatchers(GET, "/api/categorias").permitAll()
                .requestMatchers(GET, "/api/ruleta/premios").permitAll()
                .requestMatchers(POST, "/api/contacto").permitAll()
                // Todas las demás rutas /api/** requieren autenticación
                .requestMatchers("/api/**").authenticated()
                // Rutas del SPA React (frontend)
                .requestMatchers("/error", "/error/**").permitAll()
                .requestMatchers("/", "/*.html", "/*.ico", "/*.jpg", "/*.jpeg", "/*.png",
                    "/*.svg", "/*.webp", "/favicon.ico", "/pages/**", "/css/**", "/js/**",
                    "/images/**", "/assets/**", "/admin/**",
                    "/nosotros", "/productos", "/productos/**", "/informacion", "/contacto",
                    "/carrito", "/login", "/registro", "/perfil", "/perfil/**",
                    "/checkout", "/pago/exito", "/pago/cancelado").permitAll()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
