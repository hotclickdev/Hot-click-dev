package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("FirmaDigitalService — firma con el .p12 de Storage, nunca devuelve XML sin firmar")
class FirmaDigitalServiceTest {

    private final SupabaseStorageService storage = mock(SupabaseStorageService.class);
    private final TotpSecretEncryptionService cifrado = mock(TotpSecretEncryptionService.class);
    private final FirmaDigitalService service = new FirmaDigitalService(storage, cifrado,
        CertificadoDePrueba.POLITICA.identificador(), CertificadoDePrueba.POLITICA.digestSha256Base64());

    private static final String XML = "<Raiz xmlns=\"urn:x\"><A>1</A></Raiz>";

    @Test
    @DisplayName("sin certificado (cualquier ambiente) lanza error de configuración en vez de devolver XML sin firmar")
    void sinCertificadoFalla() {
        Empresa e = empresa();
        e.setCertP12Path(null);
        e.setAmbienteHacienda("STAG");
        assertThatThrownBy(() -> service.firmar(XML, e)).isInstanceOf(HaciendaConfiguracionException.class);
        e.setAmbienteHacienda("PROD");
        assertThatThrownBy(() -> service.firmar(XML, e)).isInstanceOf(HaciendaConfiguracionException.class);
    }

    @Test
    @DisplayName("con certificado firma XAdES y cachea el KeyStore por empresa")
    void firmaYCachea() {
        when(storage.leerPrivado("certificados/1/x.p12")).thenReturn(CertificadoDePrueba.obtener().p12);
        when(cifrado.decrypt("pin-cifrado")).thenReturn(CertificadoDePrueba.PIN);
        Empresa e = empresa();

        String firmado = service.firmar(XML, e);
        service.firmar(XML, e);

        assertThat(firmado).contains("ds:SignatureValue", "xades:SignedProperties");
        verify(storage, times(1)).leerPrivado("certificados/1/x.p12");
    }

    @Test
    @DisplayName("PIN incorrecto da un mensaje claro")
    void pinIncorrecto() {
        when(storage.leerPrivado(anyString())).thenReturn(CertificadoDePrueba.obtener().p12);
        when(cifrado.decrypt(anyString())).thenReturn("otro-pin-malo");
        assertThatThrownBy(() -> service.firmar(XML, empresa()))
            .isInstanceOf(HaciendaConfiguracionException.class)
            .hasMessageContaining("PIN");
    }

    private static Empresa empresa() {
        Empresa e = new Empresa();
        e.setId(1L);
        e.setCertP12Path("certificados/1/x.p12");
        e.setPinCertEnc("pin-cifrado");
        return e;
    }
}
