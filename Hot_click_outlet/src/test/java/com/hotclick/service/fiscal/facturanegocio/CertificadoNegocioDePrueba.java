package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.service.hacienda.XadesEpesFirmador;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

/**
 * Certificado autofirmado y desechable con SERIALNUMBER = "CPJ-" + cédula ficticia del negocio de las pruebas
 * (como los del BCCR). Se genera con keytool del mismo JDK; no hay certificados reales en el repo.
 */
final class CertificadoNegocioDePrueba {

    private static final String PIN = "prueba-654321";
    private static PrivateKey llave;
    private static X509Certificate certificado;

    private CertificadoNegocioDePrueba() {}

    static synchronized void cargar() {
        if (llave != null) return;
        try {
            Path dir = Files.createTempDirectory("hc-cert-negocio");
            Path archivo = dir.resolve("negocio.p12");
            String keytool = Path.of(System.getProperty("java.home"), "bin", "keytool").toString();
            Process p = new ProcessBuilder(keytool, "-genkeypair", "-alias", "firma", "-keyalg", "RSA",
                "-keysize", "2048", "-sigalg", "SHA256withRSA", "-validity", "2",
                "-dname", "CN=NEGOCIO PRUEBA SIN VALIDEZ, SERIALNUMBER=CPJ-3-101-123456, O=HotClick Test, C=CR",
                "-storetype", "PKCS12", "-keystore", archivo.toString(),
                "-storepass", PIN, "-keypass", PIN)
                .redirectErrorStream(true).start();
            String salida = new String(p.getInputStream().readAllBytes());
            if (p.waitFor() != 0) throw new IllegalStateException("keytool falló: " + salida);
            byte[] bytes = Files.readAllBytes(archivo);
            Files.deleteIfExists(archivo);
            Files.deleteIfExists(dir);
            KeyStore ks = KeyStore.getInstance("PKCS12");
            ks.load(new java.io.ByteArrayInputStream(bytes), PIN.toCharArray());
            llave = (PrivateKey) ks.getKey("firma", PIN.toCharArray());
            certificado = (X509Certificate) ks.getCertificate("firma");
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    static PrivateKey llave() { cargar(); return llave; }

    static X509Certificate certificado() { cargar(); return certificado; }

    static String firmar(String xml) {
        cargar();
        return XadesEpesFirmador.firmar(xml, llave, certificado, CertificadoDePrueba.POLITICA);
    }
}
