package com.hotclick.service.hacienda;

import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;

/**
 * Genera en el test un PKCS#12 autofirmado y desechable con keytool del mismo JDK.
 * No hay certificados reales ni cédulas en el repo.
 */
public final class CertificadoDePrueba {

    public static final String PIN = "prueba-123456";
    private static CertificadoDePrueba instancia;

    public final byte[] p12;
    public final PrivateKey llave;
    public final X509Certificate certificado;

    private CertificadoDePrueba(byte[] p12, PrivateKey llave, X509Certificate certificado) {
        this.p12 = p12;
        this.llave = llave;
        this.certificado = certificado;
    }

    public static synchronized CertificadoDePrueba obtener() {
        if (instancia != null) return instancia;
        try {
            Path dir = Files.createTempDirectory("hc-cert-test");
            Path archivo = dir.resolve("prueba.p12");
            String keytool = Path.of(System.getProperty("java.home"), "bin", "keytool").toString();
            Process p = new ProcessBuilder(keytool, "-genkeypair", "-alias", "firma", "-keyalg", "RSA",
                "-keysize", "2048", "-sigalg", "SHA256withRSA", "-validity", "2",
                "-dname", "CN=PRUEBA SIN VALIDEZ, O=HotClick Test, C=CR",
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
            instancia = new CertificadoDePrueba(bytes,
                (PrivateKey) ks.getKey("firma", PIN.toCharArray()),
                (X509Certificate) ks.getCertificate("firma"));
            return instancia;
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public static final XadesEpesFirmador.Politica POLITICA =
        new XadesEpesFirmador.Politica("https://example.invalid/politica.pdf", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");

    public static String firmar(String xml) {
        CertificadoDePrueba c = obtener();
        return XadesEpesFirmador.firmar(xml, c.llave, c.certificado, POLITICA);
    }
}
