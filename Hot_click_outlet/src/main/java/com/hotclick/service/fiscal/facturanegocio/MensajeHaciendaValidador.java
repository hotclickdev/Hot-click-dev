package com.hotclick.service.fiscal.facturanegocio;

import org.w3c.dom.Document;
import org.w3c.dom.Element;

/**
 * Revisa el XML de respuesta de Hacienda (MensajeHacienda) que el negocio puede subir junto con su factura: tiene que
 * decir ACEPTADO (Mensaje = 1) y su clave tiene que ser la de la factura. Se lee con {@link XmlSeguro}.
 * No verifica la firma de Hacienda sobre la respuesta (queda pendiente).
 */
public final class MensajeHaciendaValidador {

    /** Códigos del MensajeHacienda: 1 = aceptado, 3 = rechazado (verificar en 4.4). */
    public static final String ACEPTADO = "1";

    public record Resultado(boolean aceptado, String estado, String error) {}

    private MensajeHaciendaValidador() {}

    public static Resultado validar(byte[] xml, String claveFactura) {
        Document doc;
        try {
            doc = XmlSeguro.parsear(xml);
        } catch (XmlSeguro.XmlInvalidoException e) {
            return new Resultado(false, null, "Respuesta de Hacienda: " + e.getMessage());
        }
        Element raiz = doc.getDocumentElement();
        if (raiz == null || !"MensajeHacienda".equals(raiz.getLocalName())) {
            return new Resultado(false, null, "El segundo archivo no es la respuesta de Hacienda (MensajeHacienda).");
        }
        String clave = XmlSeguro.texto(raiz, "Clave");
        if (clave == null || claveFactura == null || !clave.equals(claveFactura)) {
            return new Resultado(false, null, "La respuesta de Hacienda es de otra factura: su clave no coincide.");
        }
        String mensaje = XmlSeguro.texto(raiz, "Mensaje");
        if (!ACEPTADO.equals(mensaje)) {
            return new Resultado(false, "RECHAZADO", "Hacienda no aceptó esta factura según la respuesta que subiste.");
        }
        return new Resultado(true, "ACEPTADO", null);
    }
}
