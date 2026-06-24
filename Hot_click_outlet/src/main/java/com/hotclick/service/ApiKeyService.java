package com.hotclick.service;
nimport com.hotclick.utils.Constants;

import com.hotclick.model.ApiKey;
import com.hotclick.model.Empresa;
import com.hotclick.repository.ApiKeyRepository;
import com.hotclick.repository.EmpresaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ApiKeyService {

    private static final SecureRandom RNG          = new SecureRandom();
    private static final String       CHARS        = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final long         CACHE_TTL_MS = 60_000L;   // 60 segundos
    private static final long         USO_THROTTLE = 300_000L;  // actualiza BD cada 5 minutos

    @Autowired private ApiKeyRepository  apiKeyRepository;
    @Autowired private EmpresaRepository empresaRepository;

    // Cache in-process: hash → (ApiKey con empresa cargado, timestamp)
    private final ConcurrentHashMap<String, CachedKey> keyCache      = new ConcurrentHashMap<>();
    // Throttle: keyId → último millis en que se escribió ultimoUso en BD
    private final ConcurrentHashMap<Long, Long>        lastUsoUpdate = new ConcurrentHashMap<>();

    private record CachedKey(ApiKey apiKey, long cachedAt) {}

    /**
     * Generates a new API key for the given empresa.
     * Returns a map that includes the plaintext key (shown ONCE — never stored).
     */
    @Transactional
    public Map<String, Object> crear(Long empresaId, String nombre, String entorno) {
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

        String env      = "test".equals(entorno) ? "test" : "live";
        String random   = randomChars(32);
        String plain    = "hck_" + env + "_" + random;
        String hash     = sha256(plain);
        String prefijo  = plain.substring(0, Math.min(plain.length(), 16)) + "...";

        ApiKey key = new ApiKey();
        key.setEmpresa(empresa);
        key.setNombre(nombre != null && !nombre.isBlank() ? nombre.trim() : "Clave " + env);
        key.setPrefijo(prefijo);
        key.setKeyHash(hash);
        key.setEntorno(env);
        apiKeyRepository.save(key);

        Map<String, Object> result = new LinkedHashMap<>(toMap(key));
        result.put("plaintextKey", plain); // only returned here, never again
        return result;
    }

    /**
     * Looks up an API key by its plaintext value.
     * Cache-first (60s TTL): evita SELECT + UPDATE por cada request autenticado.
     * ultimoUso se actualiza en BD máximo cada 5 minutos por key (throttle asíncrono).
     */
    public Optional<ApiKey> autenticar(String plainKey) {
        String hash = sha256(plainKey);
        long   now  = System.currentTimeMillis();

        CachedKey cached = keyCache.get(hash);
        if (cached != null && now - cached.cachedAt() < CACHE_TTL_MS) {
            scheduleUltimoUso(cached.apiKey().getId(), now);
            return Optional.of(cached.apiKey());
        }

        // Cache miss o expirado → consulta BD con empresa cargada en memoria
        Optional<ApiKey> opt = apiKeyRepository.findByHashWithEmpresa(hash);
        opt.ifPresent(k -> {
            keyCache.put(hash, new CachedKey(k, now));
            scheduleUltimoUso(k.getId(), now);
        });
        return opt;
    }

    @Transactional
    public void revocar(Long id, Long empresaId) {
        ApiKey key = apiKeyRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("API key no encontrada"));
        if (!key.getEmpresa().getId().equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }
        key.setActivo(false);
        apiKeyRepository.save(key);
        // Invalida la entrada del cache para que el filtro no siga aceptando la key revocada
        keyCache.entrySet().removeIf(e -> e.getValue().apiKey().getId().equals(id));
        lastUsoUpdate.remove(id);
    }

    // Actualiza ultimoUso en BD como máximo cada 5 min por key (evita UPDATE en cada request)
    private void scheduleUltimoUso(Long keyId, long now) {
        Long lastUpdate = lastUsoUpdate.get(keyId);
        if (lastUpdate == null || now - lastUpdate > USO_THROTTLE) {
            lastUsoUpdate.put(keyId, now);
            CompletableFuture.runAsync(() ->
                apiKeyRepository.updateUltimoUso(keyId, LocalDateTime.now(Constants.ZONA_CR)));
        }
    }

    public List<Map<String, Object>> listar(Long empresaId) {
        return apiKeyRepository.findByEmpresaIdOrderByFechaCreacionDesc(empresaId)
            .stream().map(this::toMap).collect(Collectors.toList());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    public Map<String, Object> toMap(ApiKey k) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id",            k.getId());
        m.put("nombre",        k.getNombre());
        m.put("prefijo",       k.getPrefijo());
        m.put("entorno",       k.getEntorno());
        m.put("activo",        k.getActivo());
        m.put("ultimoUso",     k.getUltimoUso() != null ? k.getUltimoUso().toString() : null);
        m.put("fechaCreacion", k.getFechaCreacion() != null ? k.getFechaCreacion().toString() : null);
        return m;
    }

    static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private String randomChars(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) sb.append(CHARS.charAt(RNG.nextInt(CHARS.length())));
        return sb.toString();
    }
}
