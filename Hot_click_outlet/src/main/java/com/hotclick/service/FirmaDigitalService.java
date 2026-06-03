package com.hotclick.service;

import com.hotclick.model.Empresa;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

/**
 * Firma digital de XML usando certificado PKCS#12 de Hacienda CR.
 *
 * ESTADO: STUB — retorna el XML sin firmar hasta que se configure el certificado.
 *
 * PREREQUISITO DE PRODUCCIÓN (F12.5):
 *   1. Certificado PKCS#12 emitido por SINPE/Bansaseguros costarricense
 *   2. Subir el .p12 a Supabase Storage → guardar path en empresa.certP12Path
 *   3. Cifrar el PIN con TotpSecretEncryptionService y guardarlo en empresa.pinCertEnc
 *
 * Implementación completa (F12.5):
 *   - Cargar KeyStore desde Supabase Storage (path = empresa.certP12Path)
 *   - Cachear en ConcurrentHashMap<empresaId, KeyStore> para evitar I/O repetido
 *   - Aplicar XMLDSig (W3C XML Digital Signature) al XML antes de enviar a Hacienda
 *   - Invalidar cache cuando cambia certP12Path de la empresa
 *
 * Nota de seguridad: El KeyStore debe cachearse en heap JVM, nunca en disco.
 * Render destruye el filesystem local en cada deploy/restart.
 */
@Service
public class FirmaDigitalService {

    private static final Logger log = LoggerFactory.getLogger(FirmaDigitalService.class);

    /** Cache en memoria para cuando se implemente la firma real en F12.5 */
    private final ConcurrentHashMap<Long, Object> keyStoreCache = new ConcurrentHashMap<>();

    /**
     * Firma el XML del comprobante con el certificado PKCS#12 de la empresa.
     *
     * @param xmlSinFirmar XML generado por XmlFacturaBuilder
     * @param empresa      con certP12Path y pinCertEnc
     * @return XML firmado (actualmente stub — retorna XML sin firma)
     */
    public String firmar(String xmlSinFirmar, Empresa empresa) {
        if (empresa.getCertP12Path() == null || empresa.getCertP12Path().isBlank()) {
            if ("PROD".equalsIgnoreCase(empresa.getAmbienteHacienda())) {
                throw new IllegalStateException(
                    "Empresa " + empresa.getId() + " en ambiente PROD sin certificado PKCS#12 configurado. " +
                    "Configurar empresa.certP12Path antes de facturar en producción.");
            }
            log.warn("[firma-digital] empresa={} sin certificado — XML sin firmar (stub)", empresa.getId());
            return xmlSinFirmar;
        }
        // TODO F12.5: implementar XMLDSig con PKCS#12
        log.info("[firma-digital] empresa={} ambiente={} — stub activo (implementar en F12.5)",
            empresa.getId(), empresa.getAmbienteHacienda());
        return xmlSinFirmar;
    }

    /** Invalida el cache del KeyStore para la empresa (llamar cuando cambia el cert). */
    public void invalidarCache(Long empresaId) {
        keyStoreCache.remove(empresaId);
    }
}
