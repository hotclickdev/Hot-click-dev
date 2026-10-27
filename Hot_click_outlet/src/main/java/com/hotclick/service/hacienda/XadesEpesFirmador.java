package com.hotclick.service.hacienda;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

import javax.xml.XMLConstants;
import javax.xml.crypto.dom.DOMStructure;
import javax.xml.crypto.dsig.CanonicalizationMethod;
import javax.xml.crypto.dsig.DigestMethod;
import javax.xml.crypto.dsig.Reference;
import javax.xml.crypto.dsig.SignatureMethod;
import javax.xml.crypto.dsig.SignedInfo;
import javax.xml.crypto.dsig.Transform;
import javax.xml.crypto.dsig.XMLObject;
import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMSignContext;
import javax.xml.crypto.dsig.keyinfo.KeyInfo;
import javax.xml.crypto.dsig.keyinfo.KeyInfoFactory;
import javax.xml.crypto.dsig.keyinfo.X509Data;
import javax.xml.crypto.dsig.spec.C14NMethodParameterSpec;
import javax.xml.crypto.dsig.spec.TransformParameterSpec;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.ByteArrayInputStream;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

/**
 * Firma XAdES-EPES enveloped (RSA-SHA256, C14N inclusiva) según la política de Hacienda CR.
 * Solo usa la API estándar del JDK (JSR 105). La firma queda como último hijo del elemento raíz.
 */
public final class XadesEpesFirmador {

    public static final String NS_DS = XMLSignature.XMLNS;
    public static final String NS_XADES = "http://uri.etsi.org/01903/v1.3.2#";
    public static final String TYPE_SIGNED_PROPERTIES = "http://uri.etsi.org/01903#SignedProperties";

    private static final DateTimeFormatter FECHA_FIRMA = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX");

    private XadesEpesFirmador() {}

    public record Politica(String identificador, String digestSha256Base64) {}

    public static String firmar(String xml, PrivateKey llave, X509Certificate certificado, Politica politica) {
        try {
            Document doc = parsear(xml);
            String sufijo = UUID.randomUUID().toString();
            String idFirma = "Signature-" + sufijo;
            String idSignedProps = "SignedProperties-" + sufijo;
            String idKeyInfo = "KeyInfo-" + sufijo;
            String idRefDoc = "Reference-" + sufijo;

            XMLSignatureFactory fac = XMLSignatureFactory.getInstance("DOM");
            DigestMethod sha256 = fac.newDigestMethod(DigestMethod.SHA256, null);
            Transform enveloped = fac.newTransform(Transform.ENVELOPED, (TransformParameterSpec) null);
            Transform c14n = fac.newTransform(CanonicalizationMethod.INCLUSIVE, (TransformParameterSpec) null);

            Reference refDoc = fac.newReference("", sha256, List.of(enveloped, c14n), null, idRefDoc);
            Reference refKeyInfo = fac.newReference("#" + idKeyInfo, sha256, List.of(c14n), null, null);
            Reference refProps = fac.newReference("#" + idSignedProps, sha256, List.of(c14n),
                TYPE_SIGNED_PROPERTIES, null);

            SignedInfo si = fac.newSignedInfo(
                fac.newCanonicalizationMethod(CanonicalizationMethod.INCLUSIVE, (C14NMethodParameterSpec) null),
                fac.newSignatureMethod("http://www.w3.org/2001/04/xmldsig-more#rsa-sha256", null),
                List.of(refDoc, refKeyInfo, refProps));

            KeyInfoFactory kif = fac.getKeyInfoFactory();
            X509Data x509 = kif.newX509Data(List.of(certificado));
            KeyInfo ki = kif.newKeyInfo(List.of(x509, kif.newKeyValue(certificado.getPublicKey())), idKeyInfo);

            Element qualifying = qualifyingProperties(doc, idFirma, idSignedProps, idRefDoc, certificado, politica);
            XMLObject obj = fac.newXMLObject(List.of(new DOMStructure(qualifying)), null, null, null);

            XMLSignature firma = fac.newXMLSignature(si, ki, List.of(obj), idFirma, "SignatureValue-" + sufijo);
            DOMSignContext ctx = new DOMSignContext(llave, doc.getDocumentElement());
            ctx.setDefaultNamespacePrefix("ds");
            Element signedProps = (Element) qualifying.getFirstChild();
            ctx.setIdAttributeNS(signedProps, null, "Id");
            firma.sign(ctx);
            return serializar(doc);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar el comprobante: " + e.getMessage(), e);
        }
    }

    private static Element qualifyingProperties(Document doc, String idFirma, String idSignedProps, String idRefDoc,
                                                X509Certificate cert, Politica politica) throws Exception {
        Element qp = doc.createElementNS(NS_XADES, "xades:QualifyingProperties");
        qp.setAttributeNS(XMLConstants.XMLNS_ATTRIBUTE_NS_URI, "xmlns:xades", NS_XADES);
        qp.setAttribute("Target", "#" + idFirma);

        Element sp = hijo(doc, qp, NS_XADES, "xades:SignedProperties");
        sp.setAttribute("Id", idSignedProps);
        Element ssp = hijo(doc, sp, NS_XADES, "xades:SignedSignatureProperties");
        texto(doc, ssp, NS_XADES, "xades:SigningTime",
            OffsetDateTime.now(ZoneOffset.ofHours(-6)).format(FECHA_FIRMA));

        Element sc = hijo(doc, ssp, NS_XADES, "xades:SigningCertificate");
        Element certEl = hijo(doc, sc, NS_XADES, "xades:Cert");
        Element certDigest = hijo(doc, certEl, NS_XADES, "xades:CertDigest");
        digest(doc, certDigest, b64(MessageDigest.getInstance("SHA-256").digest(cert.getEncoded())));
        Element issuer = hijo(doc, certEl, NS_XADES, "xades:IssuerSerial");
        texto(doc, issuer, NS_DS, "ds:X509IssuerName", cert.getIssuerX500Principal().getName());
        texto(doc, issuer, NS_DS, "ds:X509SerialNumber", cert.getSerialNumber().toString());

        Element spi = hijo(doc, ssp, NS_XADES, "xades:SignaturePolicyIdentifier");
        Element spid = hijo(doc, spi, NS_XADES, "xades:SignaturePolicyId");
        Element sigPolicyId = hijo(doc, spid, NS_XADES, "xades:SigPolicyId");
        texto(doc, sigPolicyId, NS_XADES, "xades:Identifier", politica.identificador());
        Element hash = hijo(doc, spid, NS_XADES, "xades:SigPolicyHash");
        digest(doc, hash, politica.digestSha256Base64());

        Element sdop = hijo(doc, sp, NS_XADES, "xades:SignedDataObjectProperties");
        Element dof = hijo(doc, sdop, NS_XADES, "xades:DataObjectFormat");
        dof.setAttribute("ObjectReference", "#" + idRefDoc);
        texto(doc, dof, NS_XADES, "xades:MimeType", "text/xml");
        texto(doc, dof, NS_XADES, "xades:Encoding", "UTF-8");
        return qp;
    }

    private static void digest(Document doc, Element padre, String valorB64) {
        Element dm = hijo(doc, padre, NS_DS, "ds:DigestMethod");
        dm.setAttribute("Algorithm", DigestMethod.SHA256);
        texto(doc, padre, NS_DS, "ds:DigestValue", valorB64);
    }

    private static Element hijo(Document doc, Element padre, String ns, String nombre) {
        Element e = doc.createElementNS(ns, nombre);
        padre.appendChild(e);
        return e;
    }

    private static void texto(Document doc, Element padre, String ns, String nombre, String valor) {
        hijo(doc, padre, ns, nombre).setTextContent(valor);
    }

    private static String b64(byte[] bytes) {
        return Base64.getEncoder().encodeToString(bytes);
    }

    static Document parsear(String xml) throws Exception {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        dbf.setNamespaceAware(true);
        dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        dbf.setExpandEntityReferences(false);
        return dbf.newDocumentBuilder().parse(new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8)));
    }

    private static String serializar(Document doc) throws Exception {
        TransformerFactory tf = TransformerFactory.newInstance();
        tf.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        tf.setAttribute(XMLConstants.ACCESS_EXTERNAL_STYLESHEET, "");
        var t = tf.newTransformer();
        t.setOutputProperty(OutputKeys.ENCODING, "UTF-8");
        StringWriter sw = new StringWriter();
        t.transform(new DOMSource(doc), new StreamResult(sw));
        return sw.toString();
    }
}
