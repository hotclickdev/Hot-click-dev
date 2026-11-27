package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.service.fiscal.SituacionFiscal;
import com.hotclick.service.fiscal.fec.FecModelos.LineaCompra;
import com.hotclick.service.fiscal.fec.FecModelos.Vendedor;
import com.hotclick.service.hacienda.CedulaEmisor;
import com.hotclick.service.hacienda.CodigoCabys;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * XML SIN FIRMAR de la Factura Electrónica de Compra (tipo 08, v4.4). Mismo estilo y helpers que
 * {@link XmlFacturaBuilder}. HotClick es el emisor del documento (firma, clave y consecutivo 08 son suyos) y el
 * negocio al que se le compra figura como Receptor. PENDIENTE de confirmar contra el XSD oficial de FEC, que
 * no está en el repo (ver README de hacienda/v4.4).
 *
 * <p>Las compras a un negocio de régimen simplificado o no inscrito no llevan IVA aparte: cada línea va con
 * tarifa 0 (código 10), igual que las líneas exentas de la factura.
 */
@Service
public class XmlFecBuilder {

    public static final String NS_FEC =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronicaCompra";
    static final String TIPO_NO_CONTRIBUYENTE = "06";
    private static final String CODIGO_EXENTO = "10";

    public String construir(Empresa emisor, Vendedor vendedor, String clave, String consecutivo,
                            LocalDateTime fecha, List<LineaCompra> lineas, String cabysGenerico) {
        XmlFacturaBuilder.validarEmisor(emisor);
        String cedulaVendedor = cedulaVendedor(vendedor);
        if (lineas == null || lineas.isEmpty()) {
            throw new IllegalStateException("La compra no tiene líneas");
        }
        long total = 0;
        StringBuilder xml = new StringBuilder(2048);
        xml.append("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
        xml.append("<FacturaElectronicaCompra xmlns=\"").append(NS_FEC).append("\">\n");
        tag(xml, 1, "Clave", clave);
        tag(xml, 1, "ProveedorSistemas", CedulaEmisor.normalizar(emisor.getCedulaJuridica()));
        tag(xml, 1, "CodigoActividadEmisor", emisor.getActividadEconomica());
        if (vendedor.actividad() != null && vendedor.actividad().matches("\\d{6}")) {
            tag(xml, 1, "CodigoActividadReceptor", vendedor.actividad());
        }
        tag(xml, 1, "NumeroConsecutivo", consecutivo);
        tag(xml, 1, "FechaEmision", fecha.format(XmlFacturaBuilder.DT_FMT));
        appendEmisor(xml, emisor);
        appendReceptor(xml, vendedor, cedulaVendedor);
        tag(xml, 1, "CondicionVenta", "01");
        xml.append("  <DetalleServicio>\n");
        int n = 1;
        for (LineaCompra l : lineas) {
            String cabys = l.cabys() != null ? l.cabys() : cabysGenerico;
            if (!CodigoCabys.valido(cabys)) {
                throw new IllegalStateException("SIN_CABYS: hay compras sin CAByS y no hay CAByS genérico configurado");
            }
            if (l.monto() <= 0) throw new IllegalStateException("Línea de compra con monto no positivo");
            total += l.monto();
            appendLinea(xml, n++, cabys, l);
        }
        xml.append("  </DetalleServicio>\n");
        appendResumen(xml, total);
        xml.append("</FacturaElectronicaCompra>\n");
        return xml.toString();
    }

    /** Para validar al emisor antes de reservar un consecutivo. */
    public static void validarEmisor(Empresa emisor) {
        XmlFacturaBuilder.validarEmisor(emisor);
    }

    /** Cédula del negocio normalizada; también valida nombre y situación (solo simplificado o no inscrito). */
    public static String cedulaVendedor(Vendedor v) {
        SituacionFiscal s = SituacionFiscal.desde(v.situacion()).orElse(null);
        if (s != SituacionFiscal.REGIMEN_SIMPLIFICADO && s != SituacionFiscal.NO_INSCRITO) {
            throw new IllegalStateException("SITUACION: el negocio no es de régimen simplificado ni no inscrito");
        }
        if (v.nombre() == null || v.nombre().isBlank()) {
            throw new IllegalStateException("DATOS: el negocio no tiene nombre fiscal");
        }
        String ced = v.cedula() == null ? "" : v.cedula().replaceAll("[\\s\\-]", "");
        if (!ced.matches("\\d{9,12}")) {
            throw new IllegalStateException("DATOS: el negocio no tiene una cédula válida (9 a 12 dígitos)");
        }
        return ced;
    }

    static String tipoIdentificacion(Vendedor v, String cedula) {
        if (SituacionFiscal.desde(v.situacion()).orElse(null) == SituacionFiscal.NO_INSCRITO) {
            return TIPO_NO_CONTRIBUYENTE;
        }
        return switch (cedula.length()) {
            case 9 -> "01";
            case 10 -> "02";
            default -> "03";
        };
    }

    private static void appendEmisor(StringBuilder xml, Empresa e) {
        xml.append("  <Emisor>\n");
        tag(xml, 2, "Nombre", e.getNombreComercialFe());
        xml.append("    <Identificacion>\n");
        tag(xml, 3, "Tipo", e.getTipoCedula());
        tag(xml, 3, "Numero", CedulaEmisor.normalizar(e.getCedulaJuridica()));
        xml.append("    </Identificacion>\n");
        xml.append("    <Ubicacion>\n");
        tag(xml, 3, "Provincia", e.getUbicacionProvincia());
        tag(xml, 3, "Canton", e.getUbicacionCanton());
        tag(xml, 3, "Distrito", e.getUbicacionDistrito());
        tag(xml, 3, "OtrasSenas", e.getUbicacionOtrasSenas());
        xml.append("    </Ubicacion>\n");
        tag(xml, 2, "CorreoElectronico", e.getCorreoEmpresa());
        xml.append("  </Emisor>\n");
    }

    private static void appendReceptor(StringBuilder xml, Vendedor v, String cedula) {
        xml.append("  <Receptor>\n");
        tag(xml, 2, "Nombre", v.nombre());
        xml.append("    <Identificacion>\n");
        tag(xml, 3, "Tipo", tipoIdentificacion(v, cedula));
        tag(xml, 3, "Numero", cedula);
        xml.append("    </Identificacion>\n");
        if (v.correo() != null && !v.correo().isBlank()) {
            tag(xml, 2, "CorreoElectronico", v.correo());
        }
        xml.append("  </Receptor>\n");
    }

    private static void appendLinea(StringBuilder xml, int n, String cabys, LineaCompra l) {
        xml.append("    <LineaDetalle>\n");
        tag(xml, 3, "NumeroLinea", String.valueOf(n));
        tag(xml, 3, "CodigoCABYS", cabys);
        tag(xml, 3, "Cantidad", "1");
        tag(xml, 3, "UnidadMedida", "Unid");
        tag(xml, 3, "Detalle", l.detalle());
        tag(xml, 3, "PrecioUnitario", String.valueOf(l.monto()));
        tag(xml, 3, "MontoTotal", String.valueOf(l.monto()));
        tag(xml, 3, "SubTotal", String.valueOf(l.monto()));
        tag(xml, 3, "BaseImponible", String.valueOf(l.monto()));
        xml.append("      <Impuesto>\n");
        tag(xml, 4, "Codigo", "01");
        tag(xml, 4, "CodigoTarifaIVA", CODIGO_EXENTO);
        tag(xml, 4, "Tarifa", "0");
        tag(xml, 4, "Monto", "0");
        xml.append("      </Impuesto>\n");
        tag(xml, 3, "ImpuestoAsumidoEmisorFabrica", "0");
        tag(xml, 3, "ImpuestoNeto", "0");
        tag(xml, 3, "MontoTotalLinea", String.valueOf(l.monto()));
        xml.append("    </LineaDetalle>\n");
    }

    private static void appendResumen(StringBuilder xml, long total) {
        String t = String.valueOf(total);
        xml.append("  <ResumenFactura>\n");
        xml.append("    <CodigoTipoMoneda>\n");
        tag(xml, 3, "CodigoMoneda", "CRC");
        tag(xml, 3, "TipoCambio", "1");
        xml.append("    </CodigoTipoMoneda>\n");
        tag(xml, 2, "TotalMercanciasGravadas", "0");
        tag(xml, 2, "TotalMercanciasExentas", t);
        tag(xml, 2, "TotalGravado", "0");
        tag(xml, 2, "TotalExento", t);
        tag(xml, 2, "TotalVenta", t);
        tag(xml, 2, "TotalDescuentos", "0");
        tag(xml, 2, "TotalVentaNeta", t);
        xml.append("    <TotalDesgloseImpuesto>\n");
        tag(xml, 3, "Codigo", "01");
        tag(xml, 3, "CodigoTarifaIVA", CODIGO_EXENTO);
        tag(xml, 3, "TotalMontoImpuesto", "0");
        xml.append("    </TotalDesgloseImpuesto>\n");
        tag(xml, 2, "TotalImpuesto", "0");
        xml.append("    <MedioPago>\n");
        tag(xml, 3, "TipoMedioPago", "04");
        tag(xml, 3, "TotalMedioPago", t);
        xml.append("    </MedioPago>\n");
        tag(xml, 2, "TotalComprobante", t);
        xml.append("  </ResumenFactura>\n");
    }

    private static void tag(StringBuilder xml, int nivel, String nombre, String valor) {
        xml.append("  ".repeat(nivel)).append('<').append(nombre).append('>')
            .append(XmlFacturaBuilder.esc(valor)).append("</").append(nombre).append(">\n");
    }
}
