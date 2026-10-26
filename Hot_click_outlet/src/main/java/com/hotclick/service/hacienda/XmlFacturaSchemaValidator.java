package com.hotclick.service.hacienda;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.w3c.dom.ls.LSInput;
import org.w3c.dom.ls.LSResourceResolver;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import java.io.IOException;
import java.io.InputStream;
import java.io.Reader;
import java.io.StringReader;
import java.io.UncheckedIOException;

/**
 * Valida el comprobante FIRMADO contra los XSD oficiales de Hacienda v4.4
 * (src/main/resources/hacienda/v4.4, ver README ahí). El XSD oficial exige ds:Signature,
 * así que se valida después de firmar. Nada se baja de la red: el import de xmldsig se resuelve
 * desde el classpath y el acceso externo a DTD o esquemas queda bloqueado.
 */
@Component
public class XmlFacturaSchemaValidator {

    private static final Logger log = LoggerFactory.getLogger(XmlFacturaSchemaValidator.class);
    private static final String BASE = "hacienda/v4.4/";
    private static final String XMLDSIG = BASE + "xmldsig-core-schema.xsd";

    private final Schema schemaFactura;
    private final Schema schemaTiquete;

    public XmlFacturaSchemaValidator() {
        this.schemaFactura = cargar(BASE + "FacturaElectronica_V4.4.xsd");
        this.schemaTiquete = cargar(BASE + "TiqueteElectronico_V4.4.xsd");
    }

    /** @throws ComprobanteInvalidoException si el XML no cumple el XSD oficial. */
    public void validar(String xmlFirmado, boolean esFactura) {
        try {
            Validator validator = (esFactura ? schemaFactura : schemaTiquete).newValidator();
            validator.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            validator.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            validator.validate(new StreamSource(new StringReader(xmlFirmado)));
        } catch (SAXException | IOException e) {
            log.error("[hacienda-xsd] XML no cumple el XSD oficial 4.4: {}", HaciendaLogSanitizer.error(e));
            throw new ComprobanteInvalidoException(
                "El comprobante no cumple el formato oficial 4.4 de Hacienda: " + HaciendaLogSanitizer.mensaje(e.getMessage()), e);
        }
    }

    private static Schema cargar(String classpath) {
        SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        try {
            factory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setResourceResolver(resolverXmldsig());
            try (InputStream in = new ClassPathResource(classpath).getInputStream()) {
                return factory.newSchema(new StreamSource(in, "classpath:" + classpath));
            }
        } catch (SAXException | IOException e) {
            throw new IllegalStateException("No se pudo cargar " + classpath, e);
        }
    }

    /** Solo resuelve el import de xmldsig y lo trae del classpath. */
    private static LSResourceResolver resolverXmldsig() {
        return (type, namespaceURI, publicId, systemId, baseURI) -> {
            boolean esDsig = "http://www.w3.org/2000/09/xmldsig#".equals(namespaceURI)
                || (systemId != null && systemId.endsWith("xmldsig-core-schema.xsd"));
            if (!esDsig) {
                return null;
            }
            try {
                String contenido = new String(new ClassPathResource(XMLDSIG).getInputStream().readAllBytes(),
                    java.nio.charset.StandardCharsets.UTF_8);
                return new InputLocal(contenido, publicId, "classpath:" + XMLDSIG);
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        };
    }

    private record InputLocal(String data, String publicIdValor, String systemIdValor) implements LSInput {
        public Reader getCharacterStream() { return new StringReader(data); }
        public void setCharacterStream(Reader r) {}
        public InputStream getByteStream() { return null; }
        public void setByteStream(InputStream s) {}
        public String getStringData() { return data; }
        public void setStringData(String s) {}
        public String getSystemId() { return systemIdValor; }
        public void setSystemId(String s) {}
        public String getPublicId() { return publicIdValor; }
        public void setPublicId(String s) {}
        public String getBaseURI() { return null; }
        public void setBaseURI(String s) {}
        public String getEncoding() { return "UTF-8"; }
        public void setEncoding(String s) {}
        public boolean getCertifiedText() { return false; }
        public void setCertifiedText(boolean b) {}
    }
}
