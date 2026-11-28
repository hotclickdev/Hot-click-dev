package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.hacienda.CodigoCabys;
import com.hotclick.service.hacienda.ComprobanteInvalidoException;
import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import org.springframework.stereotype.Component;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Predicate;

/**
 * Revisa la factura electrónica (v4.4) que un negocio le emite a HotClick. Cada problema sale con un mensaje claro
 * para el negocio. El XML se lee con {@link XmlSeguro} (sin DOCTYPE, sin red, tope de 1 MB) antes de cualquier otra cosa.
 */
@Component
public class FacturaNegocioXmlValidador {

    /** Redondeo aritmético permitido entre líneas y totales (los montos traen hasta 5 decimales). */
    static final BigDecimal TOLERANCIA_ARITMETICA = BigDecimal.ONE;
    static final String TIPO_FACTURA = "01";

    /** Lo que se espera de esta factura: quién la emite, a quién, cuánto, y cómo saber si la clave ya se usó. */
    public record Esperado(String cedulaEmisor, String cedulaReceptor, long montoCrc, long toleranciaCrc,
                           Predicate<String> claveYaUsada) {}

    public record Resultado(boolean valida, List<String> errores, List<String> avisos, String clave,
                            String cedulaEmisor, Long totalComprobanteCrc, Long totalImpuestoCrc) {}

    private final XmlFacturaSchemaValidator xsd;

    public FacturaNegocioXmlValidador(XmlFacturaSchemaValidator xsd) { this.xsd = xsd; }

    public Resultado validar(byte[] xml, Esperado esperado) {
        List<String> errores = new ArrayList<>();
        List<String> avisos = new ArrayList<>();
        Document doc;
        try {
            doc = XmlSeguro.parsear(xml);
        } catch (XmlSeguro.XmlInvalidoException e) {
            errores.add(e.getMessage());
            return new Resultado(false, errores, avisos, null, null, null, null);
        }
        Element raiz = doc.getDocumentElement();
        if (raiz == null || !"FacturaElectronica".equals(raiz.getLocalName())) {
            errores.add("El archivo no es una Factura Electrónica: el elemento principal debe ser FacturaElectronica "
                + "(no un tiquete, nota de crédito ni otro comprobante).");
            return new Resultado(false, errores, avisos, null, null, null, null);
        }
        try {
            xsd.validar(new String(xml, StandardCharsets.UTF_8), true);
        } catch (ComprobanteInvalidoException e) {
            errores.add("El XML no cumple el formato oficial 4.4 de Hacienda. Revisá que sea el XML firmado que "
                + "generó tu sistema de facturación.");
        }

        String clave = XmlSeguro.texto(raiz, "Clave");
        String emisor = soloDigitos(XmlSeguro.texto(raiz, "Emisor", "Identificacion", "Numero"));
        String receptor = soloDigitos(XmlSeguro.texto(raiz, "Receptor", "Identificacion", "Numero"));
        revisarClave(clave, emisor, XmlSeguro.texto(raiz, "NumeroConsecutivo"), errores);
        if (clave != null && esperado.claveYaUsada() != null && esperado.claveYaUsada().test(clave)) {
            errores.add("Esta factura (su clave) ya se subió antes. Cada factura se puede usar una sola vez.");
        }
        if (esperado.cedulaEmisor() == null || emisor == null || !mismaCedula(emisor, esperado.cedulaEmisor())) {
            errores.add("La cédula del emisor no coincide con la cédula fiscal verificada de tu negocio.");
        }
        if (esperado.cedulaReceptor() == null) {
            errores.add("HotClick todavía no tiene su cédula configurada para recibir facturas. Escribinos a soporte.");
        } else if (receptor == null || !mismaCedula(receptor, esperado.cedulaReceptor())) {
            errores.add("La factura tiene que ir a nombre de HotClick: la cédula del receptor no es la de HotClick.");
        }

        Totales t = revisarLineas(raiz, errores);
        Long total = redondear(XmlSeguro.numero(raiz, "ResumenFactura", "TotalComprobante"));
        Long iva = redondear(XmlSeguro.numero(raiz, "ResumenFactura", "TotalImpuesto"));
        revisarResumen(raiz, t, errores);
        if (total != null && Math.abs(total - esperado.montoCrc()) > Math.max(0, esperado.toleranciaCrc())) {
            errores.add("El total de la factura (₡" + total + ") no coincide con lo que te corresponde facturar "
                + "esta quincena (₡" + esperado.montoCrc() + ").");
        }
        if (FirmaXadesVerificador.verificar(doc) != FirmaXadesVerificador.Estado.VALIDA) {
            errores.add("La firma digital del XML no es válida: el archivo se modificó después de firmarse o no está firmado.");
        }
        return new Resultado(errores.isEmpty(), errores, avisos, clave, emisor, total, iva);
    }

    // ── clave numérica ───────────────────────────────────────────────────────────────────────────────────────

    /**
     * 50 dígitos: 506 + DDMMAA + cédula del emisor (12) + consecutivo (20) + situación (1) + código de seguridad (8).
     * El consecutivo lleva el tipo de comprobante en las posiciones 9 y 10 (01 = factura).
     */
    static void revisarClave(String clave, String emisor, String consecutivo, List<String> errores) {
        if (clave == null || !clave.matches("\\d{50}")) {
            errores.add("La clave de la factura tiene que tener exactamente 50 dígitos.");
            return;
        }
        if (!clave.startsWith("506")) errores.add("La clave tiene que empezar con 506 (código de Costa Rica).");
        try {
            int dd = Integer.parseInt(clave.substring(3, 5));
            int mm = Integer.parseInt(clave.substring(5, 7));
            int aa = Integer.parseInt(clave.substring(7, 9));
            LocalDate.of(2000 + aa, mm, dd);
        } catch (DateTimeException e) {
            errores.add("La fecha dentro de la clave (DDMMAA) no es una fecha válida.");
        }
        String cedulaClave = clave.substring(9, 21);
        String consecutivoClave = clave.substring(21, 41);
        char situacion = clave.charAt(41);
        if (emisor == null || !mismaCedula(cedulaClave, emisor)) {
            errores.add("La cédula dentro de la clave no es la del emisor de la factura.");
        }
        if (!TIPO_FACTURA.equals(consecutivoClave.substring(8, 10))) {
            errores.add("El consecutivo de la clave no es de una factura electrónica (tipo 01).");
        }
        if (consecutivo != null && !consecutivo.equals(consecutivoClave)) {
            errores.add("El número consecutivo no coincide con el que trae la clave.");
        }
        if (situacion < '1' || situacion > '3') {
            errores.add("El dígito de situación de la clave tiene que ser 1, 2 o 3.");
        }
    }

    // ── líneas y totales ─────────────────────────────────────────────────────────────────────────────────────

    record Totales(BigDecimal venta, BigDecimal descuentos, BigDecimal ventaNeta, BigDecimal impuesto, int lineas) {}

    static Totales revisarLineas(Element raiz, List<String> errores) {
        BigDecimal venta = BigDecimal.ZERO;
        BigDecimal descuentos = BigDecimal.ZERO;
        BigDecimal neta = BigDecimal.ZERO;
        BigDecimal impuesto = BigDecimal.ZERO;
        List<Element> lineas = XmlSeguro.hijos(XmlSeguro.hijo(raiz, "DetalleServicio"), "LineaDetalle");
        if (lineas.isEmpty()) errores.add("La factura no tiene líneas de detalle.");
        boolean faltaCabys = false;
        for (int i = 0; i < lineas.size(); i++) {
            Element l = lineas.get(i);
            String n = "Línea " + (i + 1) + ": ";
            if (!CodigoCabys.valido(XmlSeguro.texto(l, "CodigoCABYS"))) faltaCabys = true;
            BigDecimal cantidad = cero(XmlSeguro.numero(l, "Cantidad"));
            BigDecimal precio = cero(XmlSeguro.numero(l, "PrecioUnitario"));
            BigDecimal montoTotal = cero(XmlSeguro.numero(l, "MontoTotal"));
            BigDecimal desc = BigDecimal.ZERO;
            for (Element d : XmlSeguro.hijos(l, "Descuento")) desc = desc.add(cero(XmlSeguro.numero(d, "MontoDescuento")));
            BigDecimal subTotal = cero(XmlSeguro.numero(l, "SubTotal"));
            BigDecimal base = XmlSeguro.numero(l, "BaseImponible");
            BigDecimal impLinea = BigDecimal.ZERO;
            for (Element imp : XmlSeguro.hijos(l, "Impuesto")) {
                BigDecimal tarifa = cero(XmlSeguro.numero(imp, "Tarifa"));
                BigDecimal monto = cero(XmlSeguro.numero(imp, "Monto"));
                BigDecimal esperado = (base != null ? base : subTotal).multiply(tarifa)
                    .divide(BigDecimal.valueOf(100), 5, RoundingMode.HALF_UP);
                if (difiere(esperado, monto)) {
                    errores.add(n + "el IVA no corresponde a la tarifa (" + tarifa.stripTrailingZeros().toPlainString()
                        + " %) sobre la base imponible.");
                }
                impLinea = impLinea.add(monto);
            }
            BigDecimal impNeto = XmlSeguro.numero(l, "ImpuestoNeto");
            if (impNeto == null) impNeto = impLinea;
            BigDecimal totalLinea = cero(XmlSeguro.numero(l, "MontoTotalLinea"));
            if (difiere(cantidad.multiply(precio), montoTotal)) errores.add(n + "cantidad por precio unitario no da el monto total.");
            if (difiere(montoTotal.subtract(desc), subTotal)) errores.add(n + "el subtotal no es el monto total menos los descuentos.");
            if (difiere(subTotal.add(impNeto), totalLinea)) errores.add(n + "el total de la línea no es el subtotal más el impuesto.");
            venta = venta.add(montoTotal);
            descuentos = descuentos.add(desc);
            neta = neta.add(subTotal);
            impuesto = impuesto.add(impNeto);
        }
        if (faltaCabys) errores.add("Todas las líneas necesitan un código CAByS válido de 13 dígitos.");
        return new Totales(venta, descuentos, neta, impuesto, lineas.size());
    }

    static void revisarResumen(Element raiz, Totales t, List<String> errores) {
        Element r = XmlSeguro.hijo(raiz, "ResumenFactura");
        if (r == null) {
            errores.add("La factura no tiene el resumen de totales (ResumenFactura).");
            return;
        }
        BigDecimal totalVenta = XmlSeguro.numero(r, "TotalVenta");
        BigDecimal totalDesc = XmlSeguro.numero(r, "TotalDescuentos");
        BigDecimal totalNeta = XmlSeguro.numero(r, "TotalVentaNeta");
        BigDecimal totalImp = cero(XmlSeguro.numero(r, "TotalImpuesto"));
        BigDecimal otros = cero(XmlSeguro.numero(r, "TotalOtrosCargos"));
        BigDecimal totalComp = XmlSeguro.numero(r, "TotalComprobante");
        if (totalVenta == null || difiere(totalVenta, t.venta())) errores.add("El total de venta no es la suma de las líneas.");
        if (totalDesc != null && difiere(totalDesc, t.descuentos())) errores.add("El total de descuentos no es la suma de las líneas.");
        if (totalNeta == null || difiere(totalNeta, t.ventaNeta())) errores.add("La venta neta no es la suma de los subtotales de las líneas.");
        if (difiere(totalImp, t.impuesto())) errores.add("El IVA total no es la suma del IVA de las líneas.");
        if (totalComp == null || totalNeta == null || difiere(totalComp, totalNeta.add(totalImp).add(otros))) {
            errores.add("El total del comprobante no es la venta neta más el IVA y los otros cargos.");
        }
    }

    // ── utilidades ───────────────────────────────────────────────────────────────────────────────────────────

    static boolean difiere(BigDecimal a, BigDecimal b) {
        return a.subtract(b).abs().compareTo(TOLERANCIA_ARITMETICA) > 0;
    }

    private static BigDecimal cero(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }

    private static Long redondear(BigDecimal v) {
        return v == null ? null : v.setScale(0, RoundingMode.HALF_UP).longValue();
    }

    static String soloDigitos(String v) {
        if (v == null) return null;
        String d = v.replaceAll("\\D", "");
        return d.isEmpty() ? null : d;
    }

    /** Compara cédulas sin los ceros de relleno a la izquierda (la clave las trae a 12 dígitos). */
    static boolean mismaCedula(String a, String b) {
        String x = soloDigitos(a);
        String y = soloDigitos(b);
        if (x == null || y == null) return false;
        return x.replaceFirst("^0+", "").equals(y.replaceFirst("^0+", ""));
    }
}
