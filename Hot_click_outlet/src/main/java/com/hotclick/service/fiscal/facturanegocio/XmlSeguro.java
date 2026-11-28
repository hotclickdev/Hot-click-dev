package com.hotclick.service.fiscal.facturanegocio;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Lectura segura de XML subido por un negocio: sin DOCTYPE (corta XXE y "billion laughs" antes de expandir nada),
 * sin DTD ni esquemas externos, procesamiento seguro y tope de tamaño. Nunca resuelve nada de la red.
 */
public final class XmlSeguro {

    /** 1 MB: una factura de una quincena con cientos de líneas pesa muy por debajo. */
    public static final int MAX_BYTES = 1024 * 1024;

    /** Error de lectura con mensaje listo para mostrarle al negocio. */
    public static final class XmlInvalidoException extends RuntimeException {
        public XmlInvalidoException(String mensaje) { super(mensaje); }
    }

    private XmlSeguro() {}

    public static Document parsear(byte[] xml) {
        if (xml == null || xml.length == 0) throw new XmlInvalidoException("El archivo está vacío.");
        if (xml.length > MAX_BYTES) throw new XmlInvalidoException("El archivo pesa más de 1 MB.");
        try {
            DocumentBuilder db = fabrica().newDocumentBuilder();
            db.setEntityResolver((publicId, systemId) -> {
                throw new SAXException("Entidades externas no permitidas");
            });
            db.setErrorHandler(new org.xml.sax.ErrorHandler() {
                @Override public void warning(org.xml.sax.SAXParseException e) { /* sin ruido en consola */ }
                @Override public void error(org.xml.sax.SAXParseException e) throws SAXException { throw e; }
                @Override public void fatalError(org.xml.sax.SAXParseException e) throws SAXException { throw e; }
            });
            return db.parse(new ByteArrayInputStream(xml));
        } catch (SAXException e) {
            String m = e.getMessage() == null ? "" : e.getMessage();
            if (m.contains("DOCTYPE") || m.contains("doctype")) {
                throw new XmlInvalidoException("El XML trae una declaración DOCTYPE, que no se permite por seguridad.");
            }
            throw new XmlInvalidoException("El archivo no es un XML válido.");
        } catch (IOException | ParserConfigurationException e) {
            throw new XmlInvalidoException("No se pudo leer el XML.");
        }
    }

    private static DocumentBuilderFactory fabrica() throws ParserConfigurationException {
        DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
        dbf.setNamespaceAware(true);
        dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
        dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        dbf.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        dbf.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        dbf.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD, "");
        dbf.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA, "");
        try {
            // Tope explícito de expansión de entidades (redundante con el DOCTYPE prohibido, por si acaso).
            dbf.setAttribute("jdk.xml.entityExpansionLimit", "100");
        } catch (IllegalArgumentException ignorado) {
            // Parser que no reconoce la propiedad: el DOCTYPE prohibido ya corta la expansión.
        }
        dbf.setXIncludeAware(false);
        dbf.setExpandEntityReferences(false);
        return dbf;
    }

    // ── lectura por nombre local (los comprobantes usan namespace por defecto) ────────────────────────────────

    public static List<Element> hijos(Element padre, String nombre) {
        List<Element> r = new ArrayList<>();
        if (padre == null) return r;
        NodeList nl = padre.getChildNodes();
        for (int i = 0; i < nl.getLength(); i++) {
            Node n = nl.item(i);
            if (n instanceof Element e && nombre.equals(e.getLocalName())) r.add(e);
        }
        return r;
    }

    public static Element hijo(Element padre, String nombre) {
        List<Element> h = hijos(padre, nombre);
        return h.isEmpty() ? null : h.get(0);
    }

    /** Texto de una ruta de hijos directos ("Emisor", "Identificacion", "Numero"), o null. */
    public static String texto(Element raiz, String... ruta) {
        Element e = raiz;
        for (String paso : ruta) {
            e = hijo(e, paso);
            if (e == null) return null;
        }
        String t = e.getTextContent();
        return t == null ? null : t.trim();
    }

    /** Número decimal de una ruta, o null si falta o no es número. */
    public static BigDecimal numero(Element raiz, String... ruta) {
        String t = texto(raiz, ruta);
        if (t == null || t.isEmpty()) return null;
        try {
            return new BigDecimal(t);
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
