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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.ByteBuffer;
import java.io.IOException;
import java.time.LocalDateTime;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;
import org.springframework.beans.factory.annotation.Autowired;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class WebAuthnService {

    private static final Logger log = LoggerFactory.getLogger(WebAuthnService.class);

    private final RelyingParty rp;
    private final WebAuthnCredentialRepository credRepo;
    private final UsuarioRepository usuarioRepo;
    private final ObjectMapper mapper;

    /** Largo de los ids sintéticos de allowCredentials (bytes), mismo orden que un credentialId real. */
    static final int LARGO_ID_SINTETICO = 32;

    /** Tope de largo para ids sintéticos (WebAuthn permite hasta 1023 bytes; los reales rara vez pasan de 64-128). */
    static final int LARGO_MAX_ID_SINTETICO = 128;

    /** Cantidad fija de allowCredentials (se rellena y se recorta a este número). */
    static final int CANTIDAD_ALLOW_CREDENTIALS = 4;

    private final HotClickCredentialRepository credentialRepo;
    private final byte[] claveIdSintetico;

    // Retos en memoria: email → opciones pendientes. Acotados (máximo configurable) y con expiración (TTL),
    // para que un atacante no pueda crecer la memoria con /login/start para correos arbitrarios.
    private final Cache<String, PublicKeyCredentialCreationOptions> pendingRegistrations;
    private final Cache<String, AssertionRequest>                   pendingAuthentications;

    @Autowired
    public WebAuthnService(
            HotClickCredentialRepository credentialRepo,
            WebAuthnCredentialRepository credRepo,
            UsuarioRepository usuarioRepo,
            ObjectMapper mapper,
            @Value("${webauthn.rp-id:hotclick.lat}") String rpId,
            @Value("${webauthn.rp-name:HotClick}") String rpName,
            @Value("${webauthn.pending.max-size:10000}") long maxPendientes,
            @Value("${webauthn.pending.ttl-seconds:300}") long ttlSegundos,
            @Value("${webauthn.synthetic-id-key:}") String claveSintetica) {
        this(credentialRepo, credRepo, usuarioRepo, mapper, rpId, rpName, maxPendientes, ttlSegundos, claveSintetica, Ticker.systemTicker());
    }

    WebAuthnService(
            HotClickCredentialRepository credentialRepo,
            WebAuthnCredentialRepository credRepo,
            UsuarioRepository usuarioRepo,
            ObjectMapper mapper,
            String rpId,
            String rpName,
            long maxPendientes,
            long ttlSegundos,
            String claveSintetica,
            Ticker ticker) {

        this.credentialRepo = credentialRepo;
        this.credRepo    = credRepo;
        this.usuarioRepo = usuarioRepo;
        this.mapper      = mapper;
        this.pendingRegistrations   = cachePendientes(maxPendientes, ttlSegundos, ticker);
        this.pendingAuthentications = cachePendientes(maxPendientes, ttlSegundos, ticker);
        // Fail-closed: sin clave válida no arranca (ni clave aleatoria por proceso ni default en código).
        // dev/test la definen en application-dev/test.properties con un valor solo de prueba.
        String problema = problemaClaveSintetica(claveSintetica);
        if (problema != null) throw new IllegalStateException(problema);
        this.claveIdSintetico = java.util.Base64.getDecoder().decode(claveSintetica.trim());

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

        var pending = pendingRegistrations.asMap().remove(email);
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
        try { cred.setAaguid(result.getAaguid().getBase64Url()); } catch (Exception e) { log.warn("aaguid error: {}", e.getMessage()); }
        cred.setTransports(result.getKeyId().getTransports()
            .map(t -> {
                try { return mapper.writeValueAsString(t); } catch (Exception e) { return null; }
            }).orElse(null));
        cred.setDeviceName(deviceName);
        credRepo.save(cred);
    }

    // ── Autenticación ───────────────────────────────────────────────────────

    /**
     * Anti-enumeración: la respuesta tiene la misma forma exista o no el usuario. Si el correo no tiene
     * llaves, allowCredentials lleva un id sintético determinista por correo (HMAC-SHA256), así dos
     * consultas al mismo correo devuelven lo mismo. Ambos caminos hacen la misma consulta y el mismo HMAC.
     */
    public String startAuthentication(String email) throws JsonProcessingException {
        List<PublicKeyCredentialDescriptor> permitidas = allowCredentialsUniformes(email,
            credentialRepo.getCredentialIdsForUsername(email));

        var base = rp.startAssertion(StartAssertionOptions.builder()
            .userVerification(UserVerificationRequirement.PREFERRED)
            .build());
        var opciones = base.getPublicKeyCredentialRequestOptions().toBuilder()
            .allowCredentials(permitidas)
            .build();
        var request = AssertionRequest.builder()
            .publicKeyCredentialRequestOptions(opciones)
            .username(email)
            .build();
        pendingAuthentications.put(email, request);
        return request.toCredentialsGetJson();
    }

    /**
     * Siempre exactamente {@link #CANTIDAD_ALLOW_CREDENTIALS} entradas, sin transports: las llaves reales
     * (ordenadas y recortadas a ese tope) completadas con ids sintéticos HMAC deterministas por correo e
     * índice, y todo ordenado por id. Así no se distingue 0, 1 o N llaves. Siempre se calculan todos los
     * sintéticos para igualar el costo.
     *
     * <p>Largo de los sintéticos: el largo más frecuente entre las llaves reales del usuario (en empate, el
     * mayor); sin llaves, {@link #LARGO_ID_SINTETICO} (32, el largo típico de los autenticadores de plataforma).
     * Así un usuario con llaves de un solo largo se ve uniforme. Residual aceptado: un usuario con llaves de
     * largos distintos, o con llaves de un largo distinto de 32, se distingue de un correo desconocido por los
     * largos. Eliminarlo del todo exigiría ids de largo fijo, y eso lo decide el autenticador.
     */
    List<PublicKeyCredentialDescriptor> allowCredentialsUniformes(String email, Set<PublicKeyCredentialDescriptor> reales) {
        var ids = new java.util.ArrayList<ByteArray>();
        if (reales != null) {
            reales.stream().map(PublicKeyCredentialDescriptor::getId).sorted().limit(CANTIDAD_ALLOW_CREDENTIALS).forEach(ids::add);
        }
        int largo = largoSintetico(ids);
        for (int i = 0; i < CANTIDAD_ALLOW_CREDENTIALS; i++) {
            ByteArray sint = new ByteArray(idSintetico(email, i, largo));
            if (ids.size() < CANTIDAD_ALLOW_CREDENTIALS) ids.add(sint);
        }
        return ids.stream().sorted()
            .map(id -> PublicKeyCredentialDescriptor.builder().id(id).build())
            .toList();
    }

    static int largoSintetico(List<ByteArray> reales) {
        var conteo = new java.util.TreeMap<Integer, Integer>();
        for (ByteArray id : reales) conteo.merge(id.size(), 1, Integer::sum);
        int mejor = LARGO_ID_SINTETICO, veces = 0;
        for (var e : conteo.entrySet()) {
            if (e.getValue() >= veces) { mejor = e.getKey(); veces = e.getValue(); }
        }
        return Math.max(16, Math.min(mejor, LARGO_MAX_ID_SINTETICO));
    }

    byte[] idSintetico(String email) {
        return idSintetico(email, 0, LARGO_ID_SINTETICO);
    }

    /** HMAC-SHA256 en modo contador (bloques de 32 bytes) truncado a {@code largo}. */
    byte[] idSintetico(String email, int indice, int largo) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(claveIdSintetico, "HmacSHA256"));
            String correo = email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
            byte[] out = new byte[largo];
            for (int bloque = 0, pos = 0; pos < largo; bloque++) {
                // bloque 0 conserva el mismo input que antes (ids de 32 bytes no cambian)
                String entrada = "webauthn-allow:" + indice + ":" + (bloque == 0 ? "" : bloque + ":") + correo;
                byte[] h = mac.doFinal(entrada.getBytes(StandardCharsets.UTF_8));
                int n = Math.min(h.length, largo - pos);
                System.arraycopy(h, 0, out, pos, n);
                pos += n;
            }
            return out;
        } catch (java.security.GeneralSecurityException e) {
            throw new IllegalStateException("HMAC no disponible", e);
        }
    }

    static final int LARGO_MIN_CLAVE_SINTETICA = 32;

    /** Problema con webauthn.synthetic-id-key (Base64, ≥32 bytes decodificada), o null si es válida. */
    public static String problemaClaveSintetica(String valor) {
        if (valor == null || valor.isBlank()) return "WEBAUTHN_SYNTHETIC_ID_KEY (webauthn.synthetic-id-key) no configurada";
        byte[] b;
        try {
            b = java.util.Base64.getDecoder().decode(valor.trim());
        } catch (IllegalArgumentException e) {
            return "WEBAUTHN_SYNTHETIC_ID_KEY no es Base64 válido";
        }
        if (b.length < LARGO_MIN_CLAVE_SINTETICA) {
            return "WEBAUTHN_SYNTHETIC_ID_KEY demasiado corta: " + b.length + " bytes (mínimo " + LARGO_MIN_CLAVE_SINTETICA + ")";
        }
        return null;
    }

    private static <V> Cache<String, V> cachePendientes(long max, long ttlSegundos, Ticker ticker) {
        return Caffeine.newBuilder()
            .maximumSize(Math.max(1, max))
            .expireAfterWrite(Duration.ofSeconds(Math.max(1, ttlSegundos)))
            .ticker(ticker)
            .executor(Runnable::run)
            .build();
    }

    /** Solo tests: tamaño estimado tras limpiar las entradas vencidas o desalojadas. */
    long pendientesAutenticacion() {
        pendingAuthentications.cleanUp();
        return pendingAuthentications.estimatedSize();
    }

    @Transactional
    public boolean finishAuthentication(String email, String responseJson)
            throws IOException, AssertionFailedException {

        var pending = pendingAuthentications.asMap().remove(email);
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
