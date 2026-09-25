package com.hotclick.security.config;

import com.hotclick.security.BlockedIpFilter;
import com.hotclick.security.InternalSecretFilter;
import com.hotclick.security.JwtRequestFilter;
import com.hotclick.security.MaxRequestBodySizeFilter;
import com.hotclick.security.RateLimitingFilter;
import com.hotclick.security.TenantFilter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
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
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    /** Work factor de bcrypt. OWASP da 10 como piso aceptable; 12 es el objetivo del proyecto. */
    static final int BCRYPT_COST_DEFAULT = 12;
    /** Debajo de 10 el hash queda por debajo del mínimo que OWASP acepta. */
    static final int BCRYPT_COST_MIN = 10;
    /** Cada +1 duplica el tiempo de verificación; arriba de 15 el login pasa de ~2 s. */
    static final int BCRYPT_COST_MAX = 15;

    @Autowired
    private UserDetailsService userDetailsService;

    @Value("${cors.allowed.origins:http://localhost:3000,http://localhost:5173}")
    private String allowedOrigins;

    @Value("${security.password.bcrypt-cost:" + BCRYPT_COST_DEFAULT + "}")
    private int bcryptCost;

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

    /**
     * Bcrypt lleva su propio cost dentro del hash ({@code $2a$12$...}), así que subirlo
     * no invalida nada: los hashes viejos se siguen validando con matches() y los
     * nuevos salen con el cost configurado. Migración a Argon2id: ver
     * docs/plan-argon2id-hashing-contrasenas.md.
     */
    @Bean
    MaxRequestBodySizeFilter maxRequestBodySizeFilter() { return new MaxRequestBodySizeFilter(); }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(bcryptCostOrDefault());
    }

    /** Un cost mal configurado no debe ni debilitar el hash ni colgar el login. */
    private int bcryptCostOrDefault() {
        if (bcryptCost >= BCRYPT_COST_MIN && bcryptCost <= BCRYPT_COST_MAX) return bcryptCost;
        log.warn("[security] security.password.bcrypt-cost={} fuera del rango {}-{}; se usa {}",
                bcryptCost, BCRYPT_COST_MIN, BCRYPT_COST_MAX, BCRYPT_COST_DEFAULT);
        return BCRYPT_COST_DEFAULT;
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
            "X-Requested-With", "X-Internal-Secret", "X-Turnstile-Token",
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
            BlockedIpFilter blockedIpFilter,
            MaxRequestBodySizeFilter maxRequestBodySizeFilter) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(SecurityAuthorizationRules.configure())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .headers(headers -> headers
                .frameOptions(fo -> fo.sameOrigin())
                .contentTypeOptions(ct -> {})
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                    .preload(true))
                .addHeaderWriter(SecurityHeadersWriter.create(s3PublicUrl))
            );

        http.exceptionHandling(ex -> ex
            .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
        );
        // Orden: BlockedIp(~300) → MaxBodySize(~350) → Internal(~400) → RateLimiting(~500) → Jwt(~700) → Tenant(~900)
        http.addFilterBefore(blockedIpFilter, CsrfFilter.class);
        http.addFilterBefore(maxRequestBodySizeFilter, CsrfFilter.class);
        http.addFilterBefore(internalSecretFilter, CsrfFilter.class);
        http.addFilterBefore(rateLimitingFilter, CsrfFilter.class);
        http.addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(tenantFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
