package com.hotclick.service;

import com.hotclick.model.ApiKey;
import com.hotclick.model.Empresa;
import com.hotclick.repository.ApiKeyRepository;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * F32-03 — ApiKeyService: cache in-process 60s, revocación inmediata.
 *
 * Verifica:
 * - Segunda llamada dentro de 60s → sin SELECT en BD (cache hit)
 * - Revocar → cache invalidado inmediatamente
 * - Key inexistente → empty
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("F32-03 — ApiKeyService: cache in-process 60s")
class ApiKeyCacheTest {

    @Mock ApiKeyRepository  apiKeyRepository;
    @Mock EmpresaRepository empresaRepository;

    @InjectMocks ApiKeyService service;

    private ApiKey testKey;
    private Empresa testEmpresa;
    private static final String PLAIN_KEY = "hck_live_TESTKEY1234567890ABCDEF12345678";

    @BeforeEach
    void setUp() throws Exception {
        testEmpresa = new Empresa();
        testEmpresa.setId(1L);
        testEmpresa.setCorreoEmpresa("empresa@test.cr");

        testKey = new ApiKey();
        // ApiKey no tiene setId() público — usamos reflection
        java.lang.reflect.Field idField = ApiKey.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(testKey, 100L);
        testKey.setEmpresa(testEmpresa);
        testKey.setActivo(true);
        testKey.setNombre("Mi key");
        testKey.setScopes("read:all");
    }

    // ── Cache hit: segunda llamada no toca BD ──────────────────────────────

    @Test
    @DisplayName("Primera llamada → SELECT BD; segunda llamada dentro de 60s → cache hit, sin BD")
    void autenticar_secondCallWithin60s_cacheHit() {
        String hash = ApiKeyService.sha256(PLAIN_KEY);
        when(apiKeyRepository.findByHashWithEmpresa(hash)).thenReturn(Optional.of(testKey));
        // updateUltimoUso es void y se llama en CompletableFuture.runAsync → no necesita stub

        // 1ra llamada → cache miss → SELECT
        Optional<ApiKey> r1 = service.autenticar(PLAIN_KEY);
        // 2da llamada dentro del TTL → cache hit
        Optional<ApiKey> r2 = service.autenticar(PLAIN_KEY);

        assertThat(r1).isPresent();
        assertThat(r2).isPresent();
        assertThat(r2.get().getId()).isEqualTo(100L);
        // Solo UNA consulta a BD (la primera), la segunda usa el cache
        verify(apiKeyRepository, times(1)).findByHashWithEmpresa(hash);
    }

    // ── Key inexistente ───────────────────────────────────────────────────

    @Test
    @DisplayName("Key no encontrada → empty, sin excepción")
    void autenticar_unknownKey_returnsEmpty() {
        when(apiKeyRepository.findByHashWithEmpresa(any())).thenReturn(Optional.empty());

        Optional<ApiKey> result = service.autenticar("hck_live_UNKNOWN_KEY_THAT_DOES_NOT_EXIST_XYZ");

        assertThat(result).isEmpty();
    }

    // ── Revocación invalida el cache ──────────────────────────────────────

    @Test
    @DisplayName("Revocar key → cache invalidado inmediatamente")
    void revocar_invalidatesCache() {
        String hash = ApiKeyService.sha256(PLAIN_KEY);
        when(apiKeyRepository.findByHashWithEmpresa(hash)).thenReturn(Optional.of(testKey));
        when(apiKeyRepository.findById(100L)).thenReturn(Optional.of(testKey));
        when(apiKeyRepository.save(any(ApiKey.class))).thenReturn(testKey);

        // Llenar el cache con la primera autenticación
        service.autenticar(PLAIN_KEY);
        verify(apiKeyRepository, times(1)).findByHashWithEmpresa(hash);

        // Revocar
        service.revocar(100L, 1L);

        // Después de revocar, la siguiente autenticación debe ir a BD de nuevo (cache limpio)
        when(apiKeyRepository.findByHashWithEmpresa(hash)).thenReturn(Optional.empty());
        Optional<ApiKey> postRevoke = service.autenticar(PLAIN_KEY);

        assertThat(postRevoke).isEmpty();
        // Segunda vez que se llama a findByHashWithEmpresa (cache fue invalidado)
        verify(apiKeyRepository, times(2)).findByHashWithEmpresa(hash);
    }
}
