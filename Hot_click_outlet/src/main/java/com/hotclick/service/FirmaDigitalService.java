package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.XadesEpesFirmador;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Firma XAdES-EPES de los comprobantes con el PKCS#12 de la empresa (política de Hacienda CR).
 *
 * <p>El .p12 se lee de Storage privado ({@code empresa.certP12Path}), el PIN se descifra de
 * {@code empresa.pinCertEnc}, y la llave se cachea solo en heap, por empresa y path.
 * Sin certificado no se firma nada: se lanza {@link HaciendaConfiguracionException}.
 */
@Service
public class FirmaDigitalService {

    private static final Logger log = LoggerFactory.getLogger(FirmaDigitalService.class);

    record Credencial(String path, PrivateKey llave, X509Certificate certificado) {}

    private final ConcurrentHashMap<Long, Credencial> keyStoreCache = new ConcurrentHashMap<>();
    private final SupabaseStorageService storage;
    private final TotpSecretEncryptionService cifrado;
    private final XadesEpesFirmador.Politica politica;

    public FirmaDigitalService(
            SupabaseStorageService storage,
            TotpSecretEncryptionService cifrado,
            @Value("${hacienda.firma.politica.url:https://cdn.comprobanteselectronicos.go.cr/xml-schemas/Resoluci%C3%B3n_General_sobre_disposiciones_t%C3%A9cnicas_comprobantes_electr%C3%B3nicos_para_efectos_tributarios.pdf}") String politicaUrl,
            @Value("${hacienda.firma.politica.digest-sha256:DWxin1xWOeI8OuWQXazh4VjLWAaCLAA954em7DMh0h8=}") String politicaDigest) {
        this.storage = storage;
        this.cifrado = cifrado;
        this.politica = new XadesEpesFirmador.Politica(politicaUrl, politicaDigest);
    }

    public String firmar(String xmlSinFirmar, Empresa empresa) {
        if (empresa.getCertP12Path() == null || empresa.getCertP12Path().isBlank()
                || empresa.getPinCertEnc() == null || empresa.getPinCertEnc().isBlank()) {
            throw new HaciendaConfiguracionException(
                "Falta subir el certificado de firma (.p12) y su PIN para emitir comprobantes.");
        }
        Credencial cred = credencial(empresa);
        String firmado = XadesEpesFirmador.firmar(xmlSinFirmar, cred.llave(), cred.certificado(), politica);
        log.info("[firma-digital] empresa={} comprobante firmado (XAdES-EPES)", empresa.getId());
        return firmado;
    }

    private Credencial credencial(Empresa empresa) {
        Credencial c = keyStoreCache.get(empresa.getId());
        if (c != null && c.path().equals(empresa.getCertP12Path())) {
            return c;
        }
        byte[] p12 = storage.leerPrivado(empresa.getCertP12Path());
        if (p12 == null || p12.length == 0) {
            throw new HaciendaConfiguracionException(
                "No pudimos leer el certificado de firma. Volvé a subir el .p12.");
        }
        char[] pin = cifrado.decrypt(empresa.getPinCertEnc()).toCharArray();
        Credencial nueva = cargar(empresa.getCertP12Path(), p12, pin);
        keyStoreCache.put(empresa.getId(), nueva);
        return nueva;
    }

    static Credencial cargar(String path, byte[] p12, char[] pin) {
        try {
            KeyStore ks = KeyStore.getInstance("PKCS12");
            ks.load(new ByteArrayInputStream(p12), pin);
            for (String alias : Collections.list(ks.aliases())) {
                if (ks.isKeyEntry(alias)) {
                    return new Credencial(path, (PrivateKey) ks.getKey(alias, pin),
                        (X509Certificate) ks.getCertificate(alias));
                }
            }
            throw new HaciendaConfiguracionException("El certificado .p12 no trae llave privada.");
        } catch (HaciendaConfiguracionException e) {
            throw e;
        } catch (Exception e) {
            throw new HaciendaConfiguracionException(
                "No pudimos abrir el certificado .p12. Revisá que el PIN sea el correcto.");
        } finally {
            java.util.Arrays.fill(pin, '\0');
        }
    }

    /** Invalida el cache del KeyStore para la empresa (llamar cuando cambia el cert). */
    public void invalidarCache(Long empresaId) {
        keyStoreCache.remove(empresaId);
    }
}
