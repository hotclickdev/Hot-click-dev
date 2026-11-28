package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.hacienda.XadesEpesFirmador;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.naming.InvalidNameException;
import javax.naming.ldap.LdapName;
import javax.naming.ldap.Rdn;
import javax.security.auth.x500.X500Principal;
import javax.xml.crypto.dsig.Reference;
import javax.xml.crypto.dsig.Transform;
import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import java.io.ByteArrayInputStream;
import java.security.cert.CertificateException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Revisa la firma XAdES del comprobante con el certificado que trae el propio XML:
 * <ul>
 *   <li>integridad XMLDSig (referencias y valor de firma): detecta un XML modificado después de firmarse;</li>
 *   <li>que exista una referencia {@code URI=""} con la transformación enveloped (la firma cubre el documento);</li>
 *   <li>que el {@code SERIALNUMBER} del certificado contenga la cédula del emisor.</li>
 * </ul>
 * NO valida la cadena de confianza contra las raíces del BCCR ni la revocación ({@link #CADENA_BCCR_VALIDADA}):
 * un certificado autofirmado con la cédula correcta pasa estas comprobaciones. Por eso una factura que pasa todo
 * queda RECIBIDA y la aprueba un ADMIN; nunca se acepta sola.
 */
public final class FirmaXadesVerificador {

    public enum Estado { VALIDA, INVALIDA, AUSENTE }

    /** Validación contra las raíces del BCCR: pendiente. Mientras sea false, ninguna factura se acepta automáticamente. */
    public static final boolean CADENA_BCCR_VALIDADA = false;

    static final String OID_SERIALNUMBER = "2.5.4.5";

    /** Resultado de la revisión de la firma. */
    public record Verificacion(Estado estado, boolean referenciaRaiz, boolean serialCoincide) {
        public boolean completa() { return estado == Estado.VALIDA && referenciaRaiz && serialCoincide; }
    }

    private FirmaXadesVerificador() {}

    public static Verificacion verificar(Document doc, String cedulaEmisor) {
        NodeList firmas = doc.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature");
        if (firmas.getLength() == 0) return new Verificacion(Estado.AUSENTE, false, false);
        X509Certificate cert;
        try {
            cert = certificado(doc);
        } catch (CertificateException | IllegalArgumentException e) {
            cert = null;
        }
        if (cert == null) return new Verificacion(Estado.INVALIDA, false, false);
        boolean serial = serialContieneCedula(cert, cedulaEmisor);
        try {
            DOMValidateContext ctx = new DOMValidateContext(cert.getPublicKey(), firmas.item(0));
            ctx.setProperty("org.jcp.xml.dsig.secureValidation", Boolean.TRUE);
            registrarIds(doc, ctx);
            XMLSignature firma = XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(ctx);
            boolean raiz = cubreElDocumento(firma);
            boolean valida = firma.validate(ctx);
            return new Verificacion(valida ? Estado.VALIDA : Estado.INVALIDA, raiz, serial);
        } catch (javax.xml.crypto.MarshalException | javax.xml.crypto.dsig.XMLSignatureException | RuntimeException e) {
            return new Verificacion(Estado.INVALIDA, false, serial);
        }
    }

    /** Hay una referencia {@code URI=""} con la transformación enveloped: la firma cubre la raíz completa. */
    static boolean cubreElDocumento(XMLSignature firma) {
        for (Object o : firma.getSignedInfo().getReferences()) {
            Reference r = (Reference) o;
            if (!"".equals(r.getURI())) continue;
            for (Object t : r.getTransforms()) {
                if (Transform.ENVELOPED.equals(((Transform) t).getAlgorithm())) return true;
            }
        }
        return false;
    }

    /** El SERIALNUMBER del sujeto (p. ej. "CPJ-3-101-123456") contiene la cédula del emisor, sin ceros de relleno. */
    static boolean serialContieneCedula(X509Certificate cert, String cedula) {
        String esperada = FacturaNegocioXmlValidador.soloDigitos(cedula);
        if (esperada == null) return false;
        esperada = esperada.replaceFirst("^0+", "");
        String serial = serialNumber(cert.getSubjectX500Principal());
        String digitos = FacturaNegocioXmlValidador.soloDigitos(serial);
        return digitos != null && !esperada.isEmpty() && digitos.contains(esperada);
    }

    static String serialNumber(X500Principal sujeto) {
        try {
            String dn = sujeto.getName(X500Principal.RFC2253, Map.of(OID_SERIALNUMBER, "SERIALNUMBER"));
            List<Rdn> rdns = new LdapName(dn).getRdns();
            for (Rdn rdn : rdns) {
                if ("SERIALNUMBER".equalsIgnoreCase(rdn.getType())) return String.valueOf(rdn.getValue());
            }
            return null;
        } catch (InvalidNameException e) {
            return null;
        }
    }

    private static X509Certificate certificado(Document doc) throws CertificateException {
        NodeList certs = doc.getElementsByTagNameNS(XMLSignature.XMLNS, "X509Certificate");
        if (certs.getLength() == 0) return null;
        String b64 = certs.item(0).getTextContent().replaceAll("\\s", "");
        return (X509Certificate) CertificateFactory.getInstance("X.509")
            .generateCertificate(new ByteArrayInputStream(Base64.getDecoder().decode(b64)));
    }

    /** Las referencias de XAdES apuntan por Id a SignedProperties y KeyInfo. */
    private static void registrarIds(Document doc, DOMValidateContext ctx) {
        marcar(doc.getElementsByTagNameNS(XadesEpesFirmador.NS_XADES, "SignedProperties"), ctx);
        marcar(doc.getElementsByTagNameNS(XMLSignature.XMLNS, "KeyInfo"), ctx);
    }

    private static void marcar(NodeList nl, DOMValidateContext ctx) {
        for (int i = 0; i < nl.getLength(); i++) {
            Element e = (Element) nl.item(i);
            if (e.hasAttribute("Id")) ctx.setIdAttributeNS(e, null, "Id");
        }
    }
}
