package com.hotclick.service.d105;

import com.hotclick.utils.Constants;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;

/**
 * Lee una factura electrónica o nota de crédito de proveedor y la deja lista para el D-105.
 * El trimestre sale de FechaEmision en hora de Costa Rica, no de la fecha de carga.
 */
@Component
public class CompraXmlD105Parser {

    public static final int MAX_XML_BYTES = 2 * 1024 * 1024;

    public CompraD105Parseada parsear(byte[] xml) {
        if (xml == null || xml.length == 0) {
            throw new IllegalArgumentException("El XML está vacío");
        }
        if (xml.length > MAX_XML_BYTES) {
            throw new IllegalArgumentException("El XML no puede superar 2 MB");
        }
        Document doc = leer(xml);
        String raiz = doc.getDocumentElement().getLocalName();
        String tipo = tipoDe(raiz);
        boolean nota = CompraD105Parseada.NOTA_CREDITO.equals(tipo);

        Element emisor = hijo(doc.getDocumentElement(), "Emisor");
        if (emisor == null) {
            throw new IllegalArgumentException("El XML no trae el emisor");
        }
        Element resumen = hijo(doc.getDocumentElement(), "ResumenFactura");
        if (resumen == null) {
            throw new IllegalArgumentException("El XML no trae el resumen de la factura");
        }

        String clave = texto(doc.getDocumentElement(), "Clave");
        if (clave == null || !clave.matches("\\d{50}")) {
            throw new IllegalArgumentException("La clave numérica debe tener 50 dígitos");
        }
        LocalDate fecha = fechaDe(obligatorio(doc.getDocumentElement(), "FechaEmision", "fecha de emisión"));
        String cedula = cedulaEmisor(emisor);
        String nombre = texto(emisor, "Nombre");
        if (cedula == null || cedula.isBlank() || nombre == null || nombre.isBlank()) {
            throw new IllegalArgumentException("El emisor no trae cédula o nombre");
        }

        return new CompraD105Parseada(
            clave,
            tipo,
            fecha,
            fecha.getYear(),
            trimestreDe(fecha),
            cedula,
            nombre,
            colones(obligatorio(resumen, "TotalVentaNeta", "venta neta"), nota),
            colones(obligatorio(resumen, "TotalImpuesto", "impuesto"), nota),
            colones(obligatorio(resumen, "TotalComprobante", "total"), nota)
        );
    }

    public static String trimestreDe(LocalDate fecha) {
        int trimestre = (fecha.getMonthValue() - 1) / 3 + 1;
        return "Q" + trimestre;
    }

    private static String tipoDe(String raiz) {
        if ("FacturaElectronica".equals(raiz)) return CompraD105Parseada.FACTURA;
        if ("NotaCreditoElectronica".equals(raiz)) return CompraD105Parseada.NOTA_CREDITO;
        throw new IllegalArgumentException(
            "Solo se aceptan Factura Electrónica (01) o Nota de Crédito (03)");
    }

    private static Document leer(byte[] xml) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            return factory.newDocumentBuilder().parse(new ByteArrayInputStream(xml));
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("No se pudo leer el XML de la compra");
        }
    }

    /** Solo el hijo directo. Un tag anidado no puede pisar el monto real del resumen. */
    private static Element hijo(Element padre, String local) {
        Node nodo = padre.getFirstChild();
        while (nodo != null) {
            if (nodo instanceof Element elemento && local.equals(nombre(elemento))) {
                return elemento;
            }
            nodo = nodo.getNextSibling();
        }
        return null;
    }

    private static String nombre(Element elemento) {
        String local = elemento.getLocalName();
        return local != null ? local : elemento.getNodeName();
    }

    private static String cedulaEmisor(Element emisor) {
        Element identificacion = hijo(emisor, "Identificacion");
        if (identificacion == null) return null;
        return texto(identificacion, "Numero");
    }

    private static String texto(Element padre, String local) {
        Element nodo = hijo(padre, local);
        if (nodo == null || nodo.getTextContent() == null) return null;
        String valor = nodo.getTextContent().trim();
        return valor.isEmpty() ? null : valor;
    }

    private static String obligatorio(Element padre, String local, String etiqueta) {
        String valor = texto(padre, local);
        if (valor == null) {
            throw new IllegalArgumentException("El XML no trae " + etiqueta);
        }
        return valor;
    }

    private static LocalDate fechaDe(String raw) {
        try {
            return OffsetDateTime.parse(raw).atZoneSameInstant(Constants.ZONA_CR).toLocalDate();
        } catch (DateTimeParseException ignored) {
            try {
                return LocalDateTime.parse(raw).toLocalDate();
            } catch (DateTimeParseException e) {
                throw new IllegalArgumentException("La fecha de emisión no es válida");
            }
        }
    }

    private static int colones(String raw, boolean notaCredito) {
        try {
            int valor = new BigDecimal(raw).setScale(0, RoundingMode.HALF_UP).intValueExact();
            return notaCredito ? -Math.abs(valor) : valor;
        } catch (ArithmeticException | NumberFormatException e) {
            throw new IllegalArgumentException("Un monto del XML no es un número válido");
        }
    }
}
