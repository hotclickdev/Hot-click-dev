package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Construye el XML de comprobante electrónico según esquema Hacienda CR versión 4.3.
 *
 * Referencia: https://www.hacienda.go.cr/contenido/14638-esquemas-xsd-para-los-comprobantes-electronicos
 *
 * PENDIENTE antes de producción:
 *   1. Validar el XML generado contra el XSD oficial descargado de Hacienda.
 *   2. Verificar el namespace exacto: FacturaElectronica_V4.3.xsd o TiqueteElectronico_V4.3.xsd
 *   3. Confirmar el formato de fecha/hora: debe incluir zona horaria Costa Rica (-06:00)
 *   4. Los montos van en la moneda de la empresa (CRC por defecto)
 */
@Service
public class XmlFacturaBuilder {

    private static final DateTimeFormatter DT_FMT =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss-06:00");

    private static final String NS_FACTURA =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica";
    private static final String NS_TIQUETE =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/tiqueteElectronico";

    /**
     * Genera el XML completo del comprobante.
     * Soporta Factura Electrónica ('01') y Tiquete Electrónico ('04').
     *
     * @param comprobante con clave, consecutivo, tipo y datos del receptor
     * @param empresa     emisor con cédula y actividad económica
     * @param pedido      con items, totales y cliente
     * @return XML como String (sin firma — la firma la aplica FirmaDigitalService)
     */
    public String construir(ComprobanteFiscal comprobante, Empresa empresa, Pedido pedido) {
        boolean esFactura = ComprobanteFiscal.TIPO_FACTURA.equals(comprobante.getTipo());
        String rootTag    = esFactura ? "FacturaElectronica" : "TiqueteElectronico";
        String ns         = esFactura ? NS_FACTURA : NS_TIQUETE;

        StringBuilder xml = new StringBuilder(2048);
        xml.append("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
        xml.append("<").append(rootTag).append(" xmlns=\"").append(ns).append("\">\n");

        // ── Clave ─────────────────────────────────────────────────────────
        xml.append("  <Clave>").append(esc(comprobante.getClaveNumerica())).append("</Clave>\n");
        xml.append("  <CodigoActividad>").append(esc(empresa.getActividadEconomica())).append("</CodigoActividad>\n");
        xml.append("  <NumeroConsecutivo>").append(esc(comprobante.getNumeroConsecutivo())).append("</NumeroConsecutivo>\n");
        xml.append("  <FechaEmision>").append(comprobante.getFechaEmision().format(DT_FMT)).append("</FechaEmision>\n");

        // ── Emisor ────────────────────────────────────────────────────────
        xml.append("  <Emisor>\n");
        xml.append("    <Nombre>").append(esc(empresa.getNombreComercialFe())).append("</Nombre>\n");
        xml.append("    <Identificacion>\n");
        xml.append("      <Tipo>").append(esc(empresa.getTipoCedula())).append("</Tipo>\n");
        xml.append("      <Numero>").append(esc(empresa.getCedulaJuridica())).append("</Numero>\n");
        xml.append("    </Identificacion>\n");
        if (empresa.getCorreoEmpresa() != null) {
            xml.append("    <CorreoElectronico>").append(esc(empresa.getCorreoEmpresa())).append("</CorreoElectronico>\n");
        }
        xml.append("  </Emisor>\n");

        // ── Receptor (solo en Factura, no en Tiquete sin identificación) ──
        if (esFactura && comprobante.getReceptorCedula() != null) {
            xml.append("  <Receptor>\n");
            xml.append("    <Nombre>").append(esc(comprobante.getReceptorNombre())).append("</Nombre>\n");
            xml.append("    <Identificacion>\n");
            xml.append("      <Tipo>").append(esc(comprobante.getReceptorTipo())).append("</Tipo>\n");
            xml.append("      <Numero>").append(esc(comprobante.getReceptorCedula())).append("</Numero>\n");
            xml.append("    </Identificacion>\n");
            if (comprobante.getReceptorCorreo() != null) {
                xml.append("    <CorreoElectronico>").append(esc(comprobante.getReceptorCorreo())).append("</CorreoElectronico>\n");
            }
            xml.append("  </Receptor>\n");
        }

        // ── Condición de venta ─────────────────────────────────────────────
        xml.append("  <CondicionVenta>01</CondicionVenta>\n");  // 01=Contado
        xml.append("  <MedioPago>01</MedioPago>\n");            // 01=Efectivo (simplificado)

        // ── Detalle de líneas ─────────────────────────────────────────────
        xml.append("  <DetalleServicio>\n");
        List<PedidoItem> items = pedido.getItems();
        int lineaNum = 1;
        long totalGravado = 0;
        long totalImpuesto = 0;

        for (PedidoItem item : items) {
            long precioUnit    = item.getPrecioUnitarioMomento() != null ? item.getPrecioUnitarioMomento() : 0L;
            int  cantidad      = item.getCantidad();
            long subtotalLinea = precioUnit * cantidad;

            // IVA desde el producto (default 13% si no está configurado)
            BigDecimal pctIva = BigDecimal.ZERO;
            String codTarifa  = "01"; // exento por defecto
            if (item.getProducto() != null) {
                BigDecimal ivaProducto = item.getProducto().getPorcentajeIva();
                pctIva    = ivaProducto != null ? ivaProducto : BigDecimal.ZERO;
                String codProducto = item.getProducto().getCodigoTarifaIva();
                codTarifa = codProducto != null ? codProducto : "01";
            }

            long montoImpuesto = 0;
            if (pctIva != null && pctIva.compareTo(BigDecimal.ZERO) > 0) {
                montoImpuesto = BigDecimal.valueOf(subtotalLinea)
                    .multiply(pctIva).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                    .longValue();
            }

            long totalLinea = subtotalLinea + montoImpuesto;
            totalGravado    += subtotalLinea;
            totalImpuesto   += montoImpuesto;

            xml.append("    <LineaDetalle>\n");
            xml.append("      <NumeroLinea>").append(lineaNum++).append("</NumeroLinea>\n");
            xml.append("      <Detalle>").append(esc(item.getProducto() != null
                ? item.getProducto().getNombreProducto() : "Producto")).append("</Detalle>\n");
            xml.append("      <Cantidad>").append(cantidad).append("</Cantidad>\n");
            xml.append("      <UnidadMedida>Unid</UnidadMedida>\n");
            xml.append("      <PrecioUnitario>").append(precioUnit).append("</PrecioUnitario>\n");
            xml.append("      <MontoTotal>").append(subtotalLinea).append("</MontoTotal>\n");

            if (montoImpuesto > 0) {
                xml.append("      <Impuesto>\n");
                xml.append("        <Codigo>01</Codigo>\n");  // 01=IVA
                xml.append("        <CodigoTarifa>").append(codTarifa).append("</CodigoTarifa>\n");
                xml.append("        <Tarifa>").append(pctIva.toPlainString()).append("</Tarifa>\n");
                xml.append("        <Monto>").append(montoImpuesto).append("</Monto>\n");
                xml.append("      </Impuesto>\n");
            }

            xml.append("      <SubTotal>").append(subtotalLinea).append("</SubTotal>\n");
            xml.append("      <ImpuestoNeto>").append(montoImpuesto).append("</ImpuestoNeto>\n");
            xml.append("      <MontoTotalLinea>").append(totalLinea).append("</MontoTotalLinea>\n");
            xml.append("    </LineaDetalle>\n");
        }
        xml.append("  </DetalleServicio>\n");

        // ── ResumenFactura ────────────────────────────────────────────────
        long totalComprobante = totalGravado + totalImpuesto;
        xml.append("  <ResumenFactura>\n");
        xml.append("    <CodigoTipoMoneda>\n");
        xml.append("      <CodigoMoneda>CRC</CodigoMoneda>\n");
        xml.append("      <TipoCambio>1</TipoCambio>\n");
        xml.append("    </CodigoTipoMoneda>\n");
        xml.append("    <TotalGravado>").append(totalGravado).append("</TotalGravado>\n");
        xml.append("    <TotalImpuesto>").append(totalImpuesto).append("</TotalImpuesto>\n");
        xml.append("    <TotalComprobante>").append(totalComprobante).append("</TotalComprobante>\n");
        xml.append("  </ResumenFactura>\n");

        xml.append("</").append(rootTag).append(">\n");

        return xml.toString();
    }

    /** Escapa caracteres especiales XML. */
    private String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
