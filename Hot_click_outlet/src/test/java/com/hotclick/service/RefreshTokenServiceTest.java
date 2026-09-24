package com.hotclick.service;

import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RefreshTokenRepository;
import com.hotclick.security.SecurityEventSeverity;
import com.hotclick.security.SecurityEventType;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService — unit tests")
class RefreshTokenServiceTest {

    @Mock  private RefreshTokenRepository repo;
    @Mock  private SecurityAuditService auditService;
    @InjectMocks private RefreshTokenService service;

    private Usuario testUser;

    @BeforeEach
    void setUp() {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setCorreo("user@hotclick.cr");
    }

    @Test
    @DisplayName("crear → revoca tokens previos y persiste hash SHA-256 (no el valor en claro)")
    void crear_storesSha256HashNotPlaintext() {
        when(repo.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshToken saved = service.crear(testUser);

        verify(repo).revokeAllByUsuario(eq(testUser), any(LocalDateTime.class));
        assertThat(saved.getRawToken()).isNotBlank();
        assertThat(saved.getToken()).isEqualTo(RefreshTokenService.hashToken(saved.getRawToken()));
        assertThat(saved.getToken()).isNotEqualTo(saved.getRawToken());
        assertThat(saved.getToken()).hasSize(64);
        assertThat(saved.getUsuario()).isEqualTo(testUser);
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().plusDays(29));
    }

    @Test
    @DisplayName("crear → raw token UUID es único en cada llamada")
    void crear_rawTokenIsUnique() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RefreshToken rt1 = service.crear(testUser);
        RefreshToken rt2 = service.crear(testUser);

        assertThat(rt1.getRawToken()).isNotEqualTo(rt2.getRawToken());
        assertThat(rt1.getToken()).isNotEqualTo(rt2.getToken());
    }

    @Test
    @DisplayName("validar → busca por hash y retorna token válido")
    void validar_validToken_returnsToken() {
        String raw = "tok-ok";
        RefreshToken rt = buildValidToken(raw);
        when(repo.findByToken(RefreshTokenService.hashToken(raw))).thenReturn(Optional.of(rt));

        RefreshToken result = service.validar(raw);

        assertThat(result.getToken()).isEqualTo(RefreshTokenService.hashToken(raw));
    }

    @Test
    @DisplayName("validar → lanza excepción cuando token no existe")
    void validar_notFound_throws() {
        when(repo.findByToken(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.validar("ghost"))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("validar → lanza excepción cuando token está expirado")
    void validar_expiredToken_throws() {
        String raw = "expired";
        RefreshToken rt = buildValidToken(raw);
        rt.setExpiresAt(LocalDateTime.now().minusDays(1));
        when(repo.findByToken(RefreshTokenService.hashToken(raw))).thenReturn(Optional.of(rt));

        assertThatThrownBy(() -> service.validar(raw))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("validar → lanza excepción cuando token está revocado")
    void validar_revokedToken_throws() {
        String raw = "revoked";
        RefreshToken rt = buildValidToken(raw);
        rt.setRevokedAt(LocalDateTime.now().minusHours(1));
        when(repo.findByToken(RefreshTokenService.hashToken(raw))).thenReturn(Optional.of(rt));

        assertThatThrownBy(() -> service.validar(raw))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("rotar → revoca el usado, emite uno nuevo con hash distinto")
    void rotar_revokesUsedAndIssuesNew() {
        String raw = "current-raw";
        RefreshToken current = buildValidToken(raw);
        when(repo.findByToken(RefreshTokenService.hashToken(raw))).thenReturn(Optional.of(current));
        when(repo.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshToken next = service.rotar(raw, null);

        assertThat(current.getRevokedAt()).isNotNull();
        assertThat(next.getRawToken()).isNotBlank().isNotEqualTo(raw);
        assertThat(next.getToken()).isEqualTo(RefreshTokenService.hashToken(next.getRawToken()));
        verify(repo, never()).revokeAllByUsuario(eq(testUser), any());
    }

    @Test
    @DisplayName("rotar → reuso de revocado no expirado revoca familia y audita")
    void rotar_reusedRevoked_revokesFamilyAndAudits() {
        String raw = "stolen-reuse";
        RefreshToken revoked = buildValidToken(raw);
        revoked.setRevokedAt(LocalDateTime.now().minusMinutes(5));
        when(repo.findByToken(RefreshTokenService.hashToken(raw))).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.rotar(raw, mock(HttpServletRequest.class)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("inválida");

        verify(repo).revokeAllByUsuario(eq(testUser), any(LocalDateTime.class));
        verify(auditService).log(
            eq(SecurityEventType.TOKEN_REJECTED),
            eq(SecurityEventSeverity.HIGH),
            eq(1L),
            eq("user@hotclick.cr"),
            any(),
            any(),
            eq("/api/auth/refresh"),
            argThat((Map<String, Object> meta) -> "refresh_token_reuse".equals(meta.get("reason")))
        );
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("revocar → establece revokedAt buscando por hash")
    void revocar_setsRevokedAt() {
        String raw = "tok-to-revoke";
        RefreshToken rt = buildValidToken(raw);
        when(repo.findByToken(RefreshTokenService.hashToken(raw))).thenReturn(Optional.of(rt));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.revocar(raw);

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getRevokedAt()).isNotNull();
    }

    @Test
    @DisplayName("revocar → token inexistente no lanza excepción")
    void revocar_tokenNotFound_doesNothing() {
        when(repo.findByToken(anyString())).thenReturn(Optional.empty());

        assertThatCode(() -> service.revocar("nonexistent")).doesNotThrowAnyException();
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("hashToken → hex SHA-256 estable de 64 chars")
    void hashToken_isStableSha256Hex() {
        String a = RefreshTokenService.hashToken("abc");
        String b = RefreshTokenService.hashToken("abc");
        assertThat(a).isEqualTo(b).hasSize(64).matches("[0-9a-f]{64}");
        assertThat(RefreshTokenService.hashToken("abd")).isNotEqualTo(a);
    }

    private RefreshToken buildValidToken(String raw) {
        RefreshToken rt = new RefreshToken();
        rt.setToken(RefreshTokenService.hashToken(raw));
        rt.setRawToken(raw);
        rt.setUsuario(testUser);
        rt.setExpiresAt(LocalDateTime.now().plusDays(30));
        return rt;
    }
}
