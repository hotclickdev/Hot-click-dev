package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.hacienda.XadesEpesFirmador;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMValidateContext;
import java.io.ByteArrayInputStream;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Base64;

/**
 * Comprueba la integridad criptográfica de la firma XAdES del comprobante (XMLDSig: referencias y valor de firma)
 * con el certificado que trae el propio XML. Detecta un XML modificado después de firmarse.
 * NO valida la cadena de confianza del certificado (raíz del BCCR) ni su revocación: eso queda pendiente.
 */
public final class FirmaXadesVerificador {

    public enum Estado { VALIDA, INVALIDA, AUSENTE }

    private FirmaXadesVerificador() {}

    public static Estado verificar(Document doc) {
        NodeList firmas = doc.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature");
        if (firmas.getLength() == 0) return Estado.AUSENTE;
        try {
            X509Certificate cert = certificado(doc);
            if (cert == null) return Estado.INVALIDA;
            DOMValidateContext ctx = new DOMValidateContext(cert.getPublicKey(), firmas.item(0));
            ctx.setProperty("org.jcp.xml.dsig.secureValidation", Boolean.TRUE);
            registrarIds(doc, ctx);
            XMLSignature firma = XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(ctx);
            return firma.validate(ctx) ? Estado.VALIDA : Estado.INVALIDA;
        } catch (Exception e) {
            return Estado.INVALIDA;
        }
    }

    private static X509Certificate certificado(Document doc) throws Exception {
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
