package com.hotclick.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Ticker;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.repository.WebAuthnCredentialRepository;
import com.hotclick.security.HotClickCredentialRepository;
import com.yubico.webauthn.data.AuthenticatorTransport;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("WebAuthnService — anti-enumeración y retos pendientes acotados")
class WebAuthnServiceTest {
    public static final int CANTIDAD = WebAuthnService.CANTIDAD_ALLOW_CREDENTIALS;


    /** Base64 de 48 bytes, solo para tests. */
    private static final String CLAVE_TEST = "dGVzdC1vbmx5LXdlYmF1dGhuLXN5bnRoZXRpYy1pZC1rZXktTk9ULUEtU0VDUkVU";

    @Test
    @DisplayName("clave ausente, no Base64 o <32 bytes → el servicio no arranca")
    void claveInvalidaFalla() {
        for (String k : new String[]{"", null, "no-es-base64!!", java.util.Base64.getEncoder().encodeToString(new byte[31])}) {
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> new WebAuthnService(credentialRepo,
                    mock(WebAuthnCredentialRepository.class), mock(UsuarioRepository.class), mapper,
                    "localhost", "Test", 10, 60, k, ticker))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("WEBAUTHN_SYNTHETIC_ID_KEY");
        }
        assertThat(WebAuthnService.problemaClaveSintetica(java.util.Base64.getEncoder().encodeToString(new byte[32]))).isNull();
    }

    private final AtomicLong nanos = new AtomicLong();
    private final Ticker ticker = nanos::get;
    private final ObjectMapper mapper = new ObjectMapper();
    private HotClickCredentialRepository credentialRepo;

    @BeforeEach
    void setUp() {
        credentialRepo = mock(HotClickCredentialRepository.class);
        when(credentialRepo.getCredentialIdsForUsername(anyString())).thenReturn(Set.of());
    }

    private WebAuthnService servicio(long max, long ttl) {
        return new WebAuthnService(credentialRepo, mock(WebAuthnCredentialRepository.class),
            mock(UsuarioRepository.class), mapper, "localhost", "Test", max, ttl, CLAVE_TEST, ticker);
    }

    @Test
    @DisplayName("máximo configurable: al superarlo se desalojan entradas")
    void desalojaPorTamano() throws Exception {
        var s = servicio(3, 300);
        for (int i = 0; i < 10; i++) s.startAuthentication("u" + i + "@example.com");
        assertThat(s.pendientesAutenticacion()).isLessThanOrEqualTo(3);
    }

    @Test
    @DisplayName("TTL: el reto vence y finish devuelve false")
    void expiraPorTtl() throws Exception {
        var s = servicio(100, 60);
        s.startAuthentication("a@example.com");
        assertThat(s.pendientesAutenticacion()).isEqualTo(1);
        nanos.addAndGet(TimeUnit.SECONDS.toNanos(61));
        assertThat(s.pendientesAutenticacion()).isZero();
        assertThat(s.finishAuthentication("a@example.com", "{}")).isFalse();
    }

    @Test
    @DisplayName("usuario con llaves reales vs desconocido → misma forma (sin transports), 1 entrada cada uno")
    void mismaForma() throws Exception {
        var real = PublicKeyCredentialDescriptor.builder()
            .id(new ByteArray(new byte[WebAuthnService.LARGO_ID_SINTETICO]))
            .transports(Set.of(AuthenticatorTransport.INTERNAL)).build();
        when(credentialRepo.getCredentialIdsForUsername("real@example.com")).thenReturn(Set.of(real));
        var s = servicio(100, 300);

        var a = mapper.readTree(s.startAuthentication("real@example.com")).at("/publicKey/allowCredentials");
        var b = mapper.readTree(s.startAuthentication("nadie@example.com")).at("/publicKey/allowCredentials");
        var b2 = mapper.readTree(s.startAuthentication("NADIE@example.com ")).at("/publicKey/allowCredentials");

        assertThat(a.size()).isEqualTo(WebAuthnService.CANTIDAD_ALLOW_CREDENTIALS);
        assertThat(b.size()).isEqualTo(WebAuthnService.CANTIDAD_ALLOW_CREDENTIALS);
        assertThat(iter(a.get(0))).isEqualTo(iter(b.get(0)));
        assertThat(a.get(0).get("id").asText()).hasSameSizeAs(b.get(0).get("id").asText());
        assertThat(b).isEqualTo(b2);
    }

    @Test
    @DisplayName("0, 1, 4 o 6 llaves reales → siempre la misma cantidad fija; la llave real va incluida")
    void cantidadFija() throws Exception {
        var s = servicio(100, 300);
        for (int n : new int[]{0, 1, 4, 6}) {
            var reales = new java.util.HashSet<PublicKeyCredentialDescriptor>();
            for (int i = 0; i < n; i++) {
                byte[] id = new byte[WebAuthnService.LARGO_ID_SINTETICO];
                id[0] = (byte) (i + 1);
                reales.add(PublicKeyCredentialDescriptor.builder().id(new ByteArray(id)).build());
            }
            var lista = s.allowCredentialsUniformes("n" + n + "@example.com", reales);
            assertThat(lista).as("n=" + n).hasSize(WebAuthnService.CANTIDAD_ALLOW_CREDENTIALS);
            assertThat(lista.stream().map(PublicKeyCredentialDescriptor::getId).distinct().count())
                .isEqualTo(WebAuthnService.CANTIDAD_ALLOW_CREDENTIALS);
            if (n == 1) assertThat(lista.stream().map(PublicKeyCredentialDescriptor::getId)).containsAll(
                reales.stream().map(PublicKeyCredentialDescriptor::getId).toList());
        }
        // determinista por correo
        assertThat(s.allowCredentialsUniformes("x@example.com", Set.of()))
            .isEqualTo(s.allowCredentialsUniformes("x@example.com", Set.of()));
    }

    private static java.util.List<String> iter(com.fasterxml.jackson.databind.JsonNode n) {
        var l = new java.util.ArrayList<String>();
        n.fieldNames().forEachRemaining(l::add);
        java.util.Collections.sort(l);
        return l;
    }
    @Test
    @DisplayName("ids sintéticos del mismo largo que las llaves reales del usuario; 32 sin llaves")
    void largosUniformes() throws Exception {
        var s = servicio(100, 300);
        for (int[] lens : new int[][]{{}, {16}, {20}, {64}, {64, 64, 16}}) {
            var set = new java.util.HashSet<PublicKeyCredentialDescriptor>();
            byte k = 1;
            for (int L : lens) { byte[] b = new byte[L]; java.util.Arrays.fill(b, k++); set.add(PublicKeyCredentialDescriptor.builder().id(new ByteArray(b)).build()); }
            int esperado = lens.length == 0 ? 32 : (lens.length == 3 ? 64 : lens[0]);
            var r = s.allowCredentialsUniformes("a@example.com", set);
            assertThat(r).hasSize(4);
            long sinteticosOtroLargo = r.stream().map(d -> d.getId())
                .filter(id -> set.stream().noneMatch(x -> x.getId().equals(id)))
                .filter(id -> id.size() != esperado).count();
            assertThat(sinteticosOtroLargo).as(java.util.Arrays.toString(lens)).isZero();
            if (lens.length == 1) assertThat(r.stream().map(d -> d.getId().size()).distinct().toList()).containsExactly(lens[0]);
        }
        // compatibilidad: con 32 bytes el primer bloque coincide con el id histórico
        assertThat(s.idSintetico("a@example.com", 0, 32)).isEqualTo(s.idSintetico("a@example.com"));
        assertThat(java.util.Arrays.copyOf(s.idSintetico("a@example.com", 1, 64), 32)).isEqualTo(s.idSintetico("a@example.com", 1, 32));
    }

    @org.junit.jupiter.api.Test
    void secLargos() {
        var s = servicio(100, 300);
        for (int[] lens : new int[][]{{}, {16}, {64}, {16, 64, 32}}) {
            var set = new java.util.HashSet<com.yubico.webauthn.data.PublicKeyCredentialDescriptor>();
            byte k = 1; for (int L : lens) { byte[] b = new byte[L]; java.util.Arrays.fill(b, k++);
                set.add(com.yubico.webauthn.data.PublicKeyCredentialDescriptor.builder().id(new com.yubico.webauthn.data.ByteArray(b)).build()); }
            var r1 = s.allowCredentialsUniformes("a@example.com", set);
            var r2 = s.allowCredentialsUniformes("a@example.com", set);
            System.out.println("SEC_B2 reales=" + java.util.Arrays.toString(lens) + " n=" + r1.size() + " largos=" + r1.stream().map(d -> d.getId().size()).toList() + " estable=" + r1.equals(r2));
        }
    }
}
