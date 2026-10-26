package com.hotclick.service.hacienda;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.crypto.dsig.XMLSignature;
import javax.xml.crypto.dsig.XMLSignatureFactory;
import javax.xml.crypto.dsig.dom.DOMValidateContext;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("XadesEpesFirmador — firma XAdES-EPES real (antes el stub devolvía el XML sin firmar)")
class XadesEpesFirmadorTest {

    private static final String XML =
        "<?xml version=\"1.0\" encoding=\"utf-8\"?><FacturaElectronica xmlns=\"urn:prueba\"><Clave>1</Clave></FacturaElectronica>";

    @Test
    @DisplayName("la firma es criptográficamente válida y trae SignedProperties con la política")
    void firmaValidaConPolitica() throws Exception {
        String firmado = CertificadoDePrueba.firmar(XML);

        assertThat(firmado).contains("ds:Signature", "xades:SignedProperties", "xades:SigPolicyHash",
            "xades:SigningCertificate", XadesEpesFirmador.TYPE_SIGNED_PROPERTIES,
            CertificadoDePrueba.POLITICA.identificador());
        assertThat(validar(firmado)).isTrue();
    }

    @Test
    @DisplayName("si se altera el contenido después de firmar, la firma ya no valida")
    void alteradoNoValida() throws Exception {
        String firmado = CertificadoDePrueba.firmar(XML).replace("<Clave>1</Clave>", "<Clave>2</Clave>");
        assertThat(validar(firmado)).isFalse();
    }

    @Test
    @DisplayName("la firma queda como último hijo del elemento raíz")
    void firmaAlFinal() throws Exception {
        Document doc = XadesEpesFirmador.parsear(CertificadoDePrueba.firmar(XML));
        Element ultimo = (Element) doc.getDocumentElement().getLastChild();
        assertThat(ultimo.getLocalName()).isEqualTo("Signature");
        assertThat(ultimo.getNamespaceURI()).isEqualTo(XMLSignature.XMLNS);
    }

    private static boolean validar(String firmado) throws Exception {
        Document doc = XadesEpesFirmador.parsear(firmado);
        NodeList nl = doc.getElementsByTagNameNS(XMLSignature.XMLNS, "Signature");
        DOMValidateContext ctx = new DOMValidateContext(CertificadoDePrueba.obtener().certificado.getPublicKey(), nl.item(0));
        NodeList props = doc.getElementsByTagNameNS(XadesEpesFirmador.NS_XADES, "SignedProperties");
        ctx.setIdAttributeNS((Element) props.item(0), null, "Id");
        NodeList kis = doc.getElementsByTagNameNS(XMLSignature.XMLNS, "KeyInfo");
        ctx.setIdAttributeNS((Element) kis.item(0), null, "Id");
        XMLSignature sig = XMLSignatureFactory.getInstance("DOM").unmarshalXMLSignature(ctx);
        return sig.validate(ctx);
    }
}
