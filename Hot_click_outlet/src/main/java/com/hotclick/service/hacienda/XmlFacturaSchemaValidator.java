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
import java.io.InputStream;
import java.io.StringReader;

/**
 * Valida el XML generado contra un subset local de Hacienda 4.3
 * (namespace, fecha -06:00, estructura que emitimos hoy).
 */
@Component
public class XmlFacturaSchemaValidator {

    private static final Logger log = LoggerFactory.getLogger(XmlFacturaSchemaValidator.class);

    private final Schema schemaFactura;
    private final Schema schemaTiquete;

    public XmlFacturaSchemaValidator() {
        this.schemaFactura = cargar("hacienda/factura-electronica-4.3-subset.xsd");
        this.schemaTiquete = cargar("hacienda/tiquete-electronico-4.3-subset.xsd");
    }

    public void validar(String xml, boolean esFactura) {
        try {
            Schema schema = esFactura ? schemaFactura : schemaTiquete;
            Validator validator = schema.newValidator();
            restringirExternos(validator);
            validator.validate(new StreamSource(new StringReader(xml)));
        } catch (SAXException | IOException e) {
            log.error("[hacienda-xsd] XML invalido: {}", e.getMessage());
            throw new IllegalStateException(
                "XML de comprobante no cumple XSD 4.3 (subset local): " + e.getMessage(), e);
        }
    }

    private static Schema cargar(String classpath) {
        SchemaFactory factory = SchemaFactory.newInstance(XMLConstants.W3C_XML_SCHEMA_NS_URI);
        restringirExternos(factory);
        try (InputStream in = new ClassPathResource(classpath).getInputStream()) {
            return factory.newSchema(new StreamSource(in));
        } catch (SAXException | IOException e) {
            throw new IllegalStateException("No se pudo cargar " + classpath, e);
        }
    }

    private static void restringirExternos(SchemaFactory factory) {
        try {
            factory.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            factory.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        } catch (SAXException e) {
            log.warn("[hacienda-xsd] no se pudo restringir SchemaFactory: {}", e.getMessage());
        }
    }

    private static void restringirExternos(Validator validator) {
        try {
            validator.setProperty(XMLConstants.ACCESS_EXTERNAL_DTD, "");
            validator.setProperty(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        } catch (SAXException e) {
            log.warn("[hacienda-xsd] no se pudo restringir Validator: {}", e.getMessage());
        }
    }
}
