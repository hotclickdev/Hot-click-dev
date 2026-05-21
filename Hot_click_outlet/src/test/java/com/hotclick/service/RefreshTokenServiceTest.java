package com.hotclick.service;

import com.hotclick.model.RefreshToken;
import com.hotclick.model.Usuario;
import com.hotclick.repository.RefreshTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RefreshTokenService — unit tests")
class RefreshTokenServiceTest {

    @Mock  private RefreshTokenRepository repo;
    @InjectMocks private RefreshTokenService service;

    private Usuario testUser;

    @BeforeEach
    void setUp() {
        testUser = new Usuario();
        testUser.setId(1L);
        testUser.setCorreo("user@hotclick.cr");
    }

    // ── crear ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("crear → revoca tokens previos y persiste uno nuevo")
    void crear_revokesOldAndSavesNew() {
        when(repo.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        service.crear(testUser);

        verify(repo).revokeAllByUsuario(eq(testUser), any(LocalDateTime.class));

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repo).save(captor.capture());

        RefreshToken saved = captor.getValue();
        assertThat(saved.getToken()).isNotBlank();
        assertThat(saved.getUsuario()).isEqualTo(testUser);
        assertThat(saved.getExpiresAt()).isAfter(LocalDateTime.now().plusDays(29));
    }

    @Test
    @DisplayName("crear → token UUID es único en cada llamada")
    void crear_tokenIsUnique() {
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        RefreshToken rt1 = service.crear(testUser);
        RefreshToken rt2 = service.crear(testUser);

        assertThat(rt1.getToken()).isNotEqualTo(rt2.getToken());
    }

    // ── validar ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("validar → retorna token cuando es válido")
    void validar_validToken_returnsToken() {
        RefreshToken rt = buildValidToken("tok-ok");
        when(repo.findByToken("tok-ok")).thenReturn(Optional.of(rt));

        RefreshToken result = service.validar("tok-ok");

        assertThat(result.getToken()).isEqualTo("tok-ok");
    }

    @Test
    @DisplayName("validar → lanza excepción cuando token no existe")
    void validar_notFound_throws() {
        when(repo.findByToken("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.validar("ghost"))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("validar → lanza excepción cuando token está expirado")
    void validar_expiredToken_throws() {
        RefreshToken rt = buildValidToken("expired");
        rt.setExpiresAt(LocalDateTime.now().minusDays(1));  // expirado
        when(repo.findByToken("expired")).thenReturn(Optional.of(rt));

        assertThatThrownBy(() -> service.validar("expired"))
            .isInstanceOf(RuntimeException.class);
    }

    @Test
    @DisplayName("validar → lanza excepción cuando token está revocado")
    void validar_revokedToken_throws() {
        RefreshToken rt = buildValidToken("revoked");
        rt.setRevokedAt(LocalDateTime.now().minusHours(1)); // revocado
        when(repo.findByToken("revoked")).thenReturn(Optional.of(rt));

        // isValid() = !isExpired() && !isRevoked() → false → orElseThrow dispara
        assertThatThrownBy(() -> service.validar("revoked"))
            .isInstanceOf(RuntimeException.class);
    }

    // ── revocar ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("revocar → establece revokedAt en el token")
    void revocar_setsRevokedAt() {
        RefreshToken rt = buildValidToken("tok-to-revoke");
        when(repo.findByToken("tok-to-revoke")).thenReturn(Optional.of(rt));
        when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        service.revocar("tok-to-revoke");

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(repo).save(captor.capture());
        assertThat(captor.getValue().getRevokedAt()).isNotNull();
    }

    @Test
    @DisplayName("revocar → token inexistente no lanza excepción")
    void revocar_tokenNotFound_doesNothing() {
        when(repo.findByToken("nonexistent")).thenReturn(Optional.empty());

        assertThatCode(() -> service.revocar("nonexistent")).doesNotThrowAnyException();
        verify(repo, never()).save(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private RefreshToken buildValidToken(String token) {
        RefreshToken rt = new RefreshToken();
        rt.setToken(token);
        rt.setUsuario(testUser);
        rt.setExpiresAt(LocalDateTime.now().plusDays(30));
        return rt;
    }
}
