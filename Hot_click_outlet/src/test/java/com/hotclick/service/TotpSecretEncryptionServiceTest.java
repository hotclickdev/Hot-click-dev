package com.hotclick.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("TotpSecretEncryptionService — AAD separa el PIN del .p12 del secreto TOTP")
class TotpSecretEncryptionServiceTest {

    private TotpSecretEncryptionService svc;

    @BeforeEach
    void preparar() {
        svc = new TotpSecretEncryptionService(new MockEnvironment());
        ReflectionTestUtils.setField(svc, "encryptionKeyHex", "ab".repeat(32));
    }

    @Test
    @DisplayName("PIN: ida y vuelta con encryptPin/decryptPin y el valor lleva prefijo ENC:")
    void pinIdaYVuelta() {
        String blob = svc.encryptPin("1111");
        assertThat(blob).startsWith("ENC:").doesNotContain("1111");
        assertThat(svc.decryptPin(blob)).isEqualTo("1111");
    }

    @Test
    @DisplayName("Un blob cifrado con AAD de PIN no se descifra como TOTP")
    void blobDePinNoEsTotp() {
        String blob = svc.encryptPin("1111");
        assertThatThrownBy(() -> svc.decrypt(blob)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Un blob de TOTP no se descifra como PIN, y el TOTP sigue funcionando igual")
    void blobTotpNoEsPin() {
        String blob = svc.encrypt("JBSWY3DPEHPK3PXP");
        assertThat(svc.decrypt(blob)).isEqualTo("JBSWY3DPEHPK3PXP");
        assertThatThrownBy(() -> svc.decryptPin(blob)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("Sin clave encrypt/encryptPin devuelven el texto plano (por eso guardarPinCert exige ENC:)")
    void sinClaveDevuelvePlano() {
        ReflectionTestUtils.setField(svc, "encryptionKeyHex", "");
        assertThat(svc.encryptPin("1111")).isEqualTo("1111");
    }
}
