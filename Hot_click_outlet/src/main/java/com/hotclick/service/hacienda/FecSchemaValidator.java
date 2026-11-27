package com.hotclick.service.hacienda;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.transform.stream.StreamSource;
import javax.xml.validation.Schema;
import javax.xml.validation.SchemaFactory;
import javax.xml.validation.Validator;
import java.io.IOException;
import java.io.StringReader;

/**
 * Valida la FEC FIRMADA contra el XSD oficial de Hacienda. El XSD oficial de FEC todavía no está en el repo
 * ({@value #XSD}); mientras falte, {@link #disponible()} es false y el envío se niega en vez de mandar un XML
 * sin validar. Al agregarlo, registrar su sha256 en el README de hacienda/v4.4.
 */
@Component
public class FecSchemaValidator {

    public static final String XSD = "hacienda/v4.4/FacturaElectronicaCompra_V4.4.xsd";
    private static final Logger log = LoggerFactory.getLogger(FecSchemaValidator.class);

    private final Schema schema;

    public FecSchemaValidator() {
        this(new ClassPathResource(XSD).exists() ? XmlFacturaSchemaValidator.cargar(XSD) : null);
    }

    /** Para pruebas: un esquema ya armado (p. ej. uno derivado, que NO es el oficial). */
    public FecSchemaValidator(Schema schema) {
        this.schema = schema;
    }

    public boolean disponible() { return schema != null; }

    /** Esquema desde texto, con el mismo endurecimiento (sin red ni DTD) que el validador de factura. */
    public static Schema desdeTexto(String xsd) {
        SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        try {
            factory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            factory.setResourceResolver(XmlFacturaSchemaValidator.resolverXmldsig());
            return factory.newSchema(new StreamSource(new StringReader(xsd)));
        } catch (SAXException e) {
            throw new IllegalStateException("No se pudo cargar el esquema", e);
        }
    }

    /** @throws ComprobanteInvalidoException si no cumple, o si el XSD oficial no está disponible. */
    public void validar(String xmlFirmado) {
        if (schema == null) {
            throw new ComprobanteInvalidoException(
                "Falta el XSD oficial de la FEC en el repositorio; no se envía sin validar.", null);
        }
        try {
            Validator v = schema.newValidator();
            v.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            v.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
            v.validate(new StreamSource(new StringReader(xmlFirmado)));
        } catch (SAXException | IOException e) {
            log.error("[fec-xsd] la FEC no cumple el XSD: {}", HaciendaLogSanitizer.error(e));
            throw new ComprobanteInvalidoException(
                "La FEC no cumple el formato de Hacienda: " + HaciendaLogSanitizer.mensaje(e.getMessage()), e);
        }
    }
}
