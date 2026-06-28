package com.hotclick.security;

import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.WebAuthnCredentialRepository;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class HotClickCredentialRepository implements CredentialRepository {

    private final WebAuthnCredentialRepository credRepo;
    private final UsuarioRepository usuarioRepo;

    public HotClickCredentialRepository(WebAuthnCredentialRepository credRepo, UsuarioRepository usuarioRepo) {
        this.credRepo = credRepo;
        this.usuarioRepo = usuarioRepo;
    }

    @Override
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        var user = usuarioRepo.findByCorreo(username).orElse(null);
        if (user == null) return Set.of();
        return credRepo.findByUsuario_Id(user.getId()).stream()
            .map(c -> {
                try {
                    return PublicKeyCredentialDescriptor.builder()
                        .id(ByteArray.fromBase64Url(c.getCredentialId()))
                        .build();
                } catch (Exception e) {
                    throw new IllegalStateException("credentialId inválido: " + c.getCredentialId(), e);
                }
            })
            .collect(Collectors.toSet());
    }

    @Override
    public Optional<ByteArray> getUserHandleForUsername(String username) {
        return usuarioRepo.findByCorreo(username)
            .map(u -> new ByteArray(longToBytes(u.getId())));
    }

    @Override
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        long userId = bytesToLong(userHandle.getBytes());
        return usuarioRepo.findById(userId).map(u -> u.getCorreo());
    }

    @Override
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        return credRepo.findByCredentialId(credentialId.getBase64Url())
            .map(c -> {
                try {
                    return RegisteredCredential.builder()
                        .credentialId(ByteArray.fromBase64Url(c.getCredentialId()))
                        .userHandle(new ByteArray(longToBytes(c.getUsuario().getId())))
                        .publicKeyCose(ByteArray.fromBase64Url(c.getPublicKeyCose()))
                        .signatureCount(c.getSignCount())
                        .build();
                } catch (Exception e) {
                    throw new IllegalStateException("Credencial WebAuthn corrupta", e);
                }
            });
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        return credRepo.findByCredentialId(credentialId.getBase64Url())
            .map(c -> {
                try {
                    return RegisteredCredential.builder()
                        .credentialId(ByteArray.fromBase64Url(c.getCredentialId()))
                        .userHandle(new ByteArray(longToBytes(c.getUsuario().getId())))
                        .publicKeyCose(ByteArray.fromBase64Url(c.getPublicKeyCose()))
                        .signatureCount(c.getSignCount())
                        .build();
                } catch (Exception e) {
                    throw new IllegalStateException("Credencial WebAuthn corrupta", e);
                }
            })
            .map(Set::of)
            .orElse(Set.of());
    }

    private static byte[] longToBytes(long v) {
        return ByteBuffer.allocate(8).putLong(v).array();
    }

    private static long bytesToLong(byte[] b) {
        return ByteBuffer.wrap(b).getLong();
    }
}
