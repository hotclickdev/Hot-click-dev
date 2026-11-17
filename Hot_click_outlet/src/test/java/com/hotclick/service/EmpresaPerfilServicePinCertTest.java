package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.SancionPlataformaRepository;
import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmpresaPerfilService — PIN del certificado .p12")
class EmpresaPerfilServicePinCertTest {

    private static final String PIN_4 = "0000";
    /** 14 caracteres inventados solo para el test. */
    private static final String PIN_14 = "Zz9!Zz9!Zz9!Zz";
    private static final String RUTA = "certs/7.p12";

    @Mock EmpresaRepository empresaRepository;
    @Mock SupabaseStorageService supabaseStorageService;
    @Mock TotpSecretEncryptionService encryptionService;
    @Mock ImageModerationService imageModerationService;
    @Mock SancionPlataformaRepository sancionRepo;
    @Mock AuditoriaAdminRegistroService auditoria;
    @Mock FirmaDigitalService firmaDigitalService;

    @InjectMocks EmpresaPerfilService service;

    private Empresa empresa;

    @BeforeEach
    void preparar() {
        empresa = new Empresa();
        empresa.setId(7L);
        empresa.setNombreEmpresa("Negocio de prueba");
        org.mockito.Mockito.lenient().when(empresaRepository.findById(7L)).thenReturn(Optional.of(empresa));
        org.mockito.Mockito.lenient().when(empresaRepository.save(any(Empresa.class))).thenAnswer(i -> i.getArgument(0));
    }

    /** PKCS12 desechable con un PIN dado (keytool del JDK). Nada real. */
    static byte[] p12Con(String pin) throws Exception {
        if (pin.length() < 6) { // keytool exige 6+; se reempaqueta con el PIN corto (llaves viejas de 4 dígitos)
            char[] tmp = "tmp-123".toCharArray();
            char[] corto = pin.toCharArray();
            java.security.KeyStore ks = java.security.KeyStore.getInstance("PKCS12");
            ks.load(new java.io.ByteArrayInputStream(p12Con("tmp-123")), tmp);
            java.security.Key llave = ks.getKey("firma", tmp);
            java.security.cert.Certificate[] cadena = ks.getCertificateChain("firma");
            java.security.KeyStore nuevo = java.security.KeyStore.getInstance("PKCS12");
            nuevo.load(null, null);
            nuevo.setKeyEntry("firma", llave, corto, cadena);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            nuevo.store(out, corto);
            return out.toByteArray();
        }
        Path dir = Files.createTempDirectory("hc-pin-test");
        Path f = dir.resolve("t.p12");
        String keytool = Path.of(System.getProperty("java.home"), "bin", "keytool").toString();
        Process p = new ProcessBuilder(keytool, "-genkeypair", "-alias", "firma", "-keyalg", "RSA",
            "-keysize", "2048", "-validity", "2", "-dname", "CN=PRUEBA SIN VALIDEZ, C=CR",
            "-storetype", "PKCS12", "-keystore", f.toString(), "-storepass", pin, "-keypass", pin)
            .redirectErrorStream(true).start();
        String out = new String(p.getInputStream().readAllBytes());
        if (p.waitFor() != 0) throw new IllegalStateException("keytool: " + out);
        byte[] b = Files.readAllBytes(f);
        Files.deleteIfExists(f);
        Files.deleteIfExists(dir);
        return b;
    }

    private void conP12(byte[] bytes) {
        empresa.setCertP12Path(RUTA);
        when(supabaseStorageService.leerPrivado(RUTA)).thenReturn(bytes);
    }

    @Test
    @DisplayName("PIN de 14 caracteres que abre el .p12: se cifra, se persiste y se invalida el cache")
    void pin14Correcto() throws Exception {
        assertThat(PIN_14).hasSize(14);
        conP12(p12Con(PIN_14));
        when(encryptionService.encryptPin(PIN_14)).thenReturn("ENC:x");

        Map<String, Object> out = service.guardarPinCert(7L, PIN_14);

        assertThat(empresa.getPinCertEnc()).isEqualTo("ENC:x");
        assertThat(out.get("tienePinCert")).isEqualTo(true);
        assertThat(out).doesNotContainKeys("pin", "pinCertEnc", "certP12Path");
        assertThat(out.toString()).doesNotContain(PIN_14).doesNotContain("ENC:x").doesNotContain(RUTA);
        verify(empresaRepository).save(empresa);
        verify(firmaDigitalService).invalidarCache(7L);
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.NullSource
    @ValueSource(strings = {PIN_14, "sin-prefijo"})
    @DisplayName("Cifrado fail-closed: si encryptPin no devuelve ENC:, no se persiste y no queda el PIN en la entidad")
    void cifradoSinPrefijoSeRechaza(String devuelto) throws Exception {
        conP12(p12Con(PIN_14));
        when(encryptionService.encryptPin(PIN_14)).thenReturn(devuelto);

        assertThatThrownBy(() -> service.guardarPinCert(7L, PIN_14))
            .isInstanceOf(HaciendaConfiguracionException.class)
            .hasMessageNotContaining(PIN_14);

        assertThat(empresa.getPinCertEnc()).isNull();
        verify(empresaRepository, never()).save(any(Empresa.class));
        verify(firmaDigitalService, never()).invalidarCache(any());
    }

    @Test
    @DisplayName("PIN de 4 dígitos (llave vieja) que abre el .p12 se acepta")
    void pin4Correcto() throws Exception {
        conP12(p12Con(PIN_4));
        when(encryptionService.encryptPin(PIN_4)).thenReturn("ENC:4");

        Map<String, Object> out = service.guardarPinCert(7L, PIN_4);

        assertThat(empresa.getPinCertEnc()).isEqualTo("ENC:4");
        assertThat(out.get("tienePinCert")).isEqualTo(true);
        verify(firmaDigitalService).invalidarCache(7L);
    }

    @Test
    @DisplayName("PIN incorrecto: no se cifra ni persiste y el mensaje no incluye el valor")
    void pinIncorrecto() {
        conP12(CertificadoDePrueba.obtener().p12); // abre con otro PIN
        String malo = "Mal-Pin-12345!";

        assertThatThrownBy(() -> service.guardarPinCert(7L, malo))
            .isInstanceOf(HaciendaConfiguracionException.class)
            .hasMessageContaining("PIN")
            .satisfies(e -> assertThat(e.getMessage()).doesNotContain(malo));
        assertThat(empresa.getPinCertEnc()).isNull();
        verify(encryptionService, never()).encryptPin(anyString());
        verify(empresaRepository, never()).save(any());
        verify(firmaDigitalService, never()).invalidarCache(any());
    }

    @Test
    @DisplayName("Sin .p12 subido: error claro y no se cifra")
    void sinP12() {
        assertThatThrownBy(() -> service.guardarPinCert(7L, PIN_4))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Subí primero el certificado de firma (.p12).");
        verify(encryptionService, never()).encryptPin(anyString());
        verify(supabaseStorageService, never()).leerPrivado(anyString());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "123", "12345", "abcd", "1a34", "1234567890123", "123456789012345"})
    @DisplayName("Formato inválido se rechaza antes de leer el .p12")
    void formatoInvalido(String pin) {
        empresa.setCertP12Path(RUTA);

        assertThatThrownBy(() -> service.guardarPinCert(7L, pin))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("PIN");
        verify(supabaseStorageService, never()).leerPrivado(anyString());
        verify(encryptionService, never()).encryptPin(anyString());
    }

    @Test
    @DisplayName("PIN nulo se rechaza")
    void pinNulo() {
        assertThatThrownBy(() -> service.guardarPinCert(7L, null)).isInstanceOf(IllegalArgumentException.class);
        verify(encryptionService, never()).encryptPin(anyString());
    }

    @Test
    @DisplayName("obtener/toSafeMap nunca expone pinCertEnc aunque esté seteado")
    void obtenerNoExpone() {
        empresa.setPinCertEnc("enc-secreto-pin");
        empresa.setCertP12Path(RUTA);

        Map<String, Object> out = service.obtener(7L);

        assertThat(out.get("tienePinCert")).isEqualTo(true);
        assertThat(out).doesNotContainKeys("pin", "pinCertEnc", "certP12Path");
        assertThat(out.values().toString()).doesNotContain("enc-secreto-pin");
    }

    @Test
    @DisplayName("tienePinCert es false sin PIN")
    void sinPinFlagFalso() {
        assertThat(service.obtener(7L).get("tienePinCert")).isEqualTo(false);
    }

    @Test
    @DisplayName("Subir un .p12 invalida el cache y conserva el PIN si todavía abre el archivo")
    void subirConservaPinValido() throws Exception {
        empresa.setPinCertEnc("enc-viejo");
        when(encryptionService.decryptPin("enc-viejo")).thenReturn(CertificadoDePrueba.PIN);
        MultipartFile file = mock(MultipartFile.class);
        when(file.getBytes()).thenReturn(CertificadoDePrueba.obtener().p12);
        when(supabaseStorageService.subirCertificado(file, 7L)).thenReturn(RUTA);

        service.subirCertP12(7L, file);

        assertThat(empresa.getCertP12Path()).isEqualTo(RUTA);
        assertThat(empresa.getPinCertEnc()).isEqualTo("enc-viejo");
        verify(firmaDigitalService).invalidarCache(7L);
    }

    @Test
    @DisplayName("Subir un .p12 distinto: el cert queda, el PIN viejo se limpia y tienePinCert=false")
    void subirLimpiaPinQueNoAbre() throws Exception {
        empresa.setPinCertEnc("enc-viejo");
        when(encryptionService.decryptPin("enc-viejo")).thenReturn(CertificadoDePrueba.PIN);
        MultipartFile file = mock(MultipartFile.class);
        when(file.getBytes()).thenReturn(p12Con(PIN_4));
        when(supabaseStorageService.subirCertificado(file, 7L)).thenReturn(RUTA);

        service.subirCertP12(7L, file);

        assertThat(empresa.getCertP12Path()).isEqualTo(RUTA);
        assertThat(empresa.getPinCertEnc()).isNull();
        assertThat(service.toSafeMap(empresa).get("tienePinCert")).isEqualTo(false);
        assertThat(service.toSafeMap(empresa).get("tieneCertP12")).isEqualTo(true);
        verify(firmaDigitalService).invalidarCache(7L);
    }

    @Test
    @DisplayName("Subir un .p12 sin PIN previo invalida el cache y no toca el descifrado")
    void subirSinPinPrevio() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(file.getBytes()).thenReturn(new byte[] {1});
        when(supabaseStorageService.subirCertificado(file, 7L)).thenReturn(RUTA);

        service.subirCertP12(7L, file);

        verify(encryptionService, never()).decryptPin(anyString());
        verify(firmaDigitalService).invalidarCache(7L);
    }
}
