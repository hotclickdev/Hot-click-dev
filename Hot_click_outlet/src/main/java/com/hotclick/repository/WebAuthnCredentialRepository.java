package com.hotclick.repository;

import com.hotclick.model.WebAuthnCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface WebAuthnCredentialRepository extends JpaRepository<WebAuthnCredential, Long> {

    List<WebAuthnCredential> findByUsuario_IdUsuario(Long userId);

    Optional<WebAuthnCredential> findByCredentialId(String credentialId);

    boolean existsByUsuario_IdUsuario(Long userId);

    void deleteByCredentialId(String credentialId);
}
