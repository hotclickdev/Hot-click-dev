package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.model.WebAuthnCredential;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.WebAuthnCredentialRepository;
import com.hotclick.security.HotClickCredentialRepository;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class WebAuthnService {

    private final RelyingParty rp;
    private final WebAuthnCredentialRepository credRepo;
    private final UsuarioRepository usuarioRepo;
    private final ObjectMapper mapper;

    // Retos en memoria: email → opciones pendientes (TTL implícito por el flujo HTTP)
    private final Map<String, PublicKeyCredentialCreationOptions> pendingRegistrations  = new ConcurrentHashMap<>();
    private final Map<String, AssertionRequest>                   pendingAuthentications = new ConcurrentHashMap<>();

    public WebAuthnService(
            HotClickCredentialRepository credentialRepo,
            WebAuthnCredentialRepository credRepo,
            UsuarioRepository usuarioRepo,
            ObjectMapper mapper,
            @Value("${webauthn.rp-id:hotclick.lat}") String rpId,
            @Value("${webauthn.rp-name:HotClick}") String rpName) {

        this.credRepo    = credRepo;
        this.usuarioRepo = usuarioRepo;
        this.mapper      = mapper;

        this.rp = RelyingParty.builder()
            .identity(RelyingPartyIdentity.builder().id(rpId).name(rpName).build())
            .credentialRepository(credentialRepo)
            .allowOriginPort(true)
            .allowOriginSubdomain(false)
            .build();
    }

    // ── Registro ────────────────────────────────────────────────────────────

    public String startRegistration(String email, String deviceName) throws JsonProcessingException {
        var user = usuarioRepo.findByCorreo(email)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        var userIdentity = UserIdentity.builder()
            .name(email)
            .displayName(user.getNombre() != null ? user.getNombre() : email)
            .id(new ByteArray(longToBytes(user.getId())))
            .build();

        var options = StartRegistrationOptions.builder()
            .user(userIdentity)
            .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                .userVerification(UserVerificationRequirement.PREFERRED)
                .build())
            .build();

        var creationOptions = rp.startRegistration(options);
        pendingRegistrations.put(email, creationOptions);
        return creationOptions.toCredentialsCreateJson();
    }

    @Transactional
    public void finishRegistration(String email, String responseJson, String deviceName)
            throws IOException, RegistrationFailedException {

        var pending = pendingRegistrations.remove(email);
        if (pending == null) throw new IllegalStateException("No hay registro pendiente para: " + email);

        var user = usuarioRepo.findByCorreo(email)
            .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado"));

        var response = PublicKeyCredential.parseRegistrationResponseJson(responseJson);
        var result   = rp.finishRegistration(FinishRegistrationOptions.builder()
            .request(pending)
            .response(response)
            .build());

        var cred = new WebAuthnCredential();
        cred.setUsuario(user);
        cred.setCredentialId(result.getKeyId().getId().getBase64Url());
        cred.setPublicKeyCose(result.getPublicKeyCose().getBase64Url());
        cred.setSignCount(result.getSignatureCount());
        try { cred.setAaguid(result.getAaguid().getBase64Url()); } catch (Exception ignored) {}
        cred.setTransports(result.getKeyId().getTransports()
            .map(t -> {
                try { return mapper.writeValueAsString(t); } catch (Exception e) { return null; }
            }).orElse(null));
        cred.setDeviceName(deviceName);
        credRepo.save(cred);
    }

    // ── Autenticación ───────────────────────────────────────────────────────

    public String startAuthentication(String email) throws JsonProcessingException {
        var request = rp.startAssertion(StartAssertionOptions.builder()
            .username(email)
            .userVerification(UserVerificationRequirement.PREFERRED)
            .build());
        pendingAuthentications.put(email, request);
        return request.toCredentialsGetJson();
    }

    @Transactional
    public boolean finishAuthentication(String email, String responseJson)
            throws IOException, AssertionFailedException {

        var pending = pendingAuthentications.remove(email);
        if (pending == null) return false;

        var response = PublicKeyCredential.parseAssertionResponseJson(responseJson);
        var result   = rp.finishAssertion(FinishAssertionOptions.builder()
            .request(pending)
            .response(response)
            .build());

        if (!result.isSuccess()) return false;

        // Actualizar sign_count anti-replay
        credRepo.findByCredentialId(result.getCredential().getCredentialId().getBase64Url())
            .ifPresent(c -> {
                c.setSignCount(result.getSignatureCount());
                c.setLastUsedAt(LocalDateTime.now(Constants.ZONA_CR));
                credRepo.save(c);
            });

        return true;
    }

    public boolean tieneCredenciales(String email) {
        return usuarioRepo.findByCorreo(email)
            .map(u -> credRepo.existsByUsuario_Id(u.getId()))
            .orElse(false);
    }

    private static byte[] longToBytes(long v) {
        return ByteBuffer.allocate(8).putLong(v).array();
    }
}
