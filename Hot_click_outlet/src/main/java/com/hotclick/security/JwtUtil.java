package com.hotclick.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secretKey;

    private static final long EXPIRATION_TIME = 900000L; // 15 minutos

    @PostConstruct
    void validate() {
        if (secretKey == null || secretKey.length() < 32) {
            throw new IllegalStateException(
                "JWT_SECRET debe tener al menos 32 caracteres (jwt.secret)");
        }
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(secretKey.getBytes());
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    public String generateToken(String username, Long userId, String rol) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("rol", rol);
        return createToken(claims, username, EXPIRATION_TIME);
    }

    public String generateToken(String username, Long userId, String rol, Long empresaId, String empresaSlug) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("rol", rol);
        claims.put("empresaId", empresaId);
        claims.put("empresaSlug", empresaSlug != null ? empresaSlug : "");
        return createToken(claims, username, EXPIRATION_TIME);
    }

    public String generateTokenFull(String username, Long userId, String rol,
                                    Long empresaId, String empresaSlug, List<String> permisos) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("rol", rol);
        if (empresaId != null)   claims.put("empresaId", empresaId);
        if (empresaSlug != null) claims.put("empresaSlug", empresaSlug);
        if (permisos != null)    claims.put("permisos", permisos);
        return createToken(claims, username, EXPIRATION_TIME);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractPermisos(String token) {
        Object raw = extractAllClaims(token).get("permisos");
        if (raw instanceof List<?> list) return (List<String>) list;
        return List.of();
    }

    public Long extractEmpresaId(String token) {
        Object raw = extractAllClaims(token).get("empresaId");
        if (raw == null) return null;
        if (raw instanceof Long l)    return l;
        if (raw instanceof Integer i) return i.longValue();
        return Long.parseLong(raw.toString());
    }

    public String extractEmpresaSlug(String token) {
        Object raw = extractAllClaims(token).get("empresaSlug");
        return raw != null ? raw.toString() : null;
    }

    private String createToken(Map<String, Object> claims, String subject, long expiresIn) {
        return Jwts.builder()
                .setClaims(claims)
                .setSubject(subject)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiresIn))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token, String username) {
        return extractUsername(token).equals(username) && !isTokenExpired(token);
    }

    /** Token de vida corta (5 min) para el paso 2FA durante el login. */
    public String generateTempToken(String correo, Long userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("2fa_pending", true);
        return createToken(claims, correo, 300_000L);
    }

    public boolean isTempToken(String token) {
        try {
            return Boolean.TRUE.equals(extractAllClaims(token).get("2fa_pending"));
        } catch (Exception e) {
            return false;
        }
    }

    /** Token de vida corta (10 min) para la selección de empresa tras login con múltiples negocios. */
    public String generateEmpresaSelectionToken(String correo, Long userId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userId);
        claims.put("empresa_selection", true);
        return createToken(claims, correo, 600_000L);
    }

    public boolean isEmpresaSelectionToken(String token) {
        try {
            return Boolean.TRUE.equals(extractAllClaims(token).get("empresa_selection"));
        } catch (Exception e) {
            return false;
        }
    }

    public Long extractUserId(String token) {
        Object raw = extractAllClaims(token).get("userId");
        if (raw == null) return null;
        if (raw instanceof Long l)    return l;
        if (raw instanceof Integer i) return i.longValue();
        return Long.parseLong(raw.toString());
    }

    public String extractRol(String token) {
        Object raw = extractAllClaims(token).get("rol");
        return raw != null ? raw.toString() : null;
    }

    private static final long IMPERSONATION_EXPIRATION = 1_800_000L; // 30 minutos

    /**
     * Token de impersonación: autentica como el usuario objetivo (dueño de la
     * empresa) para que el tenant scoping funcione igual que un login real,
     * pero marcado con claims extra para el banner y la auditoría de soporte.
     */
    public String generateImpersonationToken(String correoObjetivo, Long userIdObjetivo, String rol,
                                              Long empresaId, String empresaSlug,
                                              Long adminOriginalId, String adminOriginalCorreo) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", userIdObjetivo);
        claims.put("rol", rol);
        if (empresaId != null)   claims.put("empresaId", empresaId);
        if (empresaSlug != null) claims.put("empresaSlug", empresaSlug);
        claims.put("impersonando", true);
        claims.put("adminOriginalId", adminOriginalId);
        claims.put("adminOriginalCorreo", adminOriginalCorreo);
        return createToken(claims, correoObjetivo, IMPERSONATION_EXPIRATION);
    }

    public boolean isImpersonationToken(String token) {
        try {
            return Boolean.TRUE.equals(extractAllClaims(token).get("impersonando"));
        } catch (Exception e) {
            return false;
        }
    }

    public Long extractAdminOriginalId(String token) {
        Object raw = extractAllClaims(token).get("adminOriginalId");
        if (raw == null) return null;
        if (raw instanceof Long l)    return l;
        if (raw instanceof Integer i) return i.longValue();
        return Long.parseLong(raw.toString());
    }

    public String extractAdminOriginalCorreo(String token) {
        Object raw = extractAllClaims(token).get("adminOriginalCorreo");
        return raw != null ? raw.toString() : null;
    }
}
