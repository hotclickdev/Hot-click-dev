package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.service.hacienda.CodigoCabys;
import com.hotclick.service.hacienda.ImpuestoLinea;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * XML SIN FIRMAR del comprobante electrónico Hacienda CR 4.4 (factura y tiquete).
 * La validación contra el XSD oficial se hace después de firmar, porque el esquema exige ds:Signature
 * (ver FacturacionEnvioProcessor y XmlFacturaSchemaValidator).
 */
@Service
public class XmlFacturaBuilder {

    private static final DateTimeFormatter DT_FMT =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss-06:00");

    private static final String NS_FACTURA =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica";
    private static final String NS_TIQUETE =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico";

    public XmlFacturaBuilder() {
    }

    public String construir(ComprobanteFiscal comprobante, Empresa empresa, Pedido pedido) {
        if (pedido == null) {
            throw new IllegalStateException("El comprobante no tiene pedido para armar el XML");
        }
        return construir(comprobante, empresa, List.of(pedido));
    }

    public String construir(ComprobanteFiscal comprobante, Empresa empresa, List<Pedido> pedidos) {
        validarEmisor(empresa);
        boolean esFactura = ComprobanteFiscal.TIPO_FACTURA.equals(comprobante.getTipo());
        String rootTag = esFactura ? "FacturaElectronica" : "TiqueteElectronico";
        String ns = esFactura ? NS_FACTURA : NS_TIQUETE;

        StringBuilder xml = new StringBuilder(2048);
        xml.append("<?xml version=\"1.0\" encoding=\"utf-8\"?>\n");
        xml.append("<").append(rootTag).append(" xmlns=\"").append(ns).append("\">\n");
        appendEncabezado(xml, comprobante, empresa, esFactura);
        Totales totales = appendDetalle(xml, lineasDe(pedidos));
        appendResumen(xml, totales);
        xml.append("</").append(rootTag).append(">\n");
        return xml.toString();
    }

    private static void validarEmisor(Empresa empresa) {
        if (empresa.getCedulaJuridica() == null || empresa.getCedulaJuridica().isBlank()) {
            throw new IllegalStateException("El emisor no tiene cédula para el XML");
        }
        if (empresa.getActividadEconomica() == null || empresa.getActividadEconomica().isBlank()) {
            throw new IllegalStateException("El emisor no tiene código de actividad económica");
        }
        if (vacio(empresa.getUbicacionProvincia()) || vacio(empresa.getUbicacionCanton())
                || vacio(empresa.getUbicacionDistrito()) || vacio(empresa.getUbicacionOtrasSenas())) {
            throw new HaciendaConfiguracionException(
                "Falta la ubicación fiscal de la empresa (provincia, cantón, distrito y otras señas).");
        }
        if (vacio(empresa.getCorreoEmpresa())) {
            throw new HaciendaConfiguracionException("Falta el correo de la empresa para el comprobante.");
        }
    }

    private void appendEncabezado(StringBuilder xml, ComprobanteFiscal comprobante,
                                  Empresa empresa, boolean esFactura) {
        xml.append("  <Clave>").append(esc(comprobante.getClaveNumerica())).append("</Clave>\n");
        xml.append("  <ProveedorSistemas>").append(digitos(empresa.getCedulaJuridica())).append("</ProveedorSistemas>\n");
        xml.append("  <CodigoActividadEmisor>").append(esc(empresa.getActividadEconomica())).append("</CodigoActividadEmisor>\n");
        xml.append("  <NumeroConsecutivo>").append(esc(comprobante.getNumeroConsecutivo())).append("</NumeroConsecutivo>\n");
        xml.append("  <FechaEmision>").append(comprobante.getFechaEmision().format(DT_FMT)).append("</FechaEmision>\n");
        appendEmisor(xml, empresa);
        if (esFactura || comprobante.getReceptorCedula() != null) {
            appendReceptor(xml, comprobante);
        }
        xml.append("  <CondicionVenta>01</CondicionVenta>\n");
    }

    private void appendEmisor(StringBuilder xml, Empresa empresa) {
        xml.append("  <Emisor>\n");
        xml.append("    <Nombre>").append(esc(empresa.getNombreComercialFe())).append("</Nombre>\n");
        xml.append("    <Identificacion>\n");
        xml.append("      <Tipo>").append(esc(empresa.getTipoCedula())).append("</Tipo>\n");
        xml.append("      <Numero>").append(esc(empresa.getCedulaJuridica())).append("</Numero>\n");
        xml.append("    </Identificacion>\n");
        xml.append("    <Ubicacion>\n");
        xml.append("      <Provincia>").append(esc(empresa.getUbicacionProvincia())).append("</Provincia>\n");
        xml.append("      <Canton>").append(esc(empresa.getUbicacionCanton())).append("</Canton>\n");
        xml.append("      <Distrito>").append(esc(empresa.getUbicacionDistrito())).append("</Distrito>\n");
        xml.append("      <OtrasSenas>").append(esc(empresa.getUbicacionOtrasSenas())).append("</OtrasSenas>\n");
        xml.append("    </Ubicacion>\n");
        xml.append("    <CorreoElectronico>").append(esc(empresa.getCorreoEmpresa())).append("</CorreoElectronico>\n");
        xml.append("  </Emisor>\n");
    }

    private void appendReceptor(StringBuilder xml, ComprobanteFiscal comprobante) {
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

    /** Acumula por tarifa para el desglose y separa gravado de exento. */
    private static final class Totales {
        long gravado;
        long exento;
        long impuesto;
        final java.util.LinkedHashMap<String, Long> desglose = new java.util.LinkedHashMap<>();

        long venta() { return gravado + exento; }
        long total() { return venta() + impuesto; }
    }

    private Totales appendDetalle(StringBuilder xml, List<PedidoItem> items) {
        xml.append("  <DetalleServicio>\n");
        Totales t = new Totales();
        int lineaNum = 1;
        for (PedidoItem item : items) {
            appendLinea(xml, item, lineaNum++, t);
        }
        xml.append("  </DetalleServicio>\n");
        return t;
    }

    private void appendLinea(StringBuilder xml, PedidoItem item, int lineaNum, Totales t) {
        Producto producto = item.getProducto();
        String cabys = producto != null ? producto.getCodigoCabys() : null;
        if (!CodigoCabys.valido(cabys)) {
            String nombre = producto != null ? producto.getNombreProducto() : "línea " + lineaNum;
            throw new IllegalStateException("Producto sin CAByS de 13 dígitos: " + nombre);
        }
        long precioUnit = item.getPrecioUnitarioMomento() != null ? item.getPrecioUnitarioMomento() : 0L;
        int cantidad = item.getCantidad();
        BigDecimal pctIva = BigDecimal.ZERO;
        String codTarifa = null;
        if (producto != null) {
            pctIva = producto.getPorcentajeIva() != null ? producto.getPorcentajeIva() : BigDecimal.ZERO;
            codTarifa = producto.getCodigoTarifaIva();
        }
        boolean gravado = pctIva.signum() > 0;
        if (codTarifa == null || codTarifa.isBlank()) {
            codTarifa = gravado ? "08" : "10"; // 08 = tarifa general 13 %, 10 = tarifa exenta
        }
        ImpuestoLinea.Montos montos = ImpuestoLinea.de(precioUnit, cantidad, pctIva);
        String detalle = producto != null ? producto.getNombreProducto() : "Producto";

        xml.append("    <LineaDetalle>\n");
        xml.append("      <NumeroLinea>").append(lineaNum).append("</NumeroLinea>\n");
        xml.append("      <CodigoCABYS>").append(cabys).append("</CodigoCABYS>\n");
        xml.append("      <Cantidad>").append(cantidad).append("</Cantidad>\n");
        xml.append("      <UnidadMedida>Unid</UnidadMedida>\n");
        xml.append("      <Detalle>").append(esc(detalle)).append("</Detalle>\n");
        xml.append("      <PrecioUnitario>").append(precioUnit).append("</PrecioUnitario>\n");
        xml.append("      <MontoTotal>").append(montos.base()).append("</MontoTotal>\n");
        xml.append("      <SubTotal>").append(montos.base()).append("</SubTotal>\n");
        xml.append("      <BaseImponible>").append(montos.base()).append("</BaseImponible>\n");
        xml.append("      <Impuesto>\n");
        xml.append("        <Codigo>01</Codigo>\n");
        xml.append("        <CodigoTarifaIVA>").append(esc(codTarifa)).append("</CodigoTarifaIVA>\n");
        xml.append("        <Tarifa>").append(pctIva.stripTrailingZeros().toPlainString()).append("</Tarifa>\n");
        xml.append("        <Monto>").append(montos.impuesto()).append("</Monto>\n");
        xml.append("      </Impuesto>\n");
        xml.append("      <ImpuestoAsumidoEmisorFabrica>0</ImpuestoAsumidoEmisorFabrica>\n");
        xml.append("      <ImpuestoNeto>").append(montos.impuesto()).append("</ImpuestoNeto>\n");
        xml.append("      <MontoTotalLinea>").append(montos.total()).append("</MontoTotalLinea>\n");
        xml.append("    </LineaDetalle>\n");

        if (gravado) t.gravado += montos.base(); else t.exento += montos.base();
        t.impuesto += montos.impuesto();
        t.desglose.merge(codTarifa, montos.impuesto(), Long::sum);
    }

    private static void appendResumen(StringBuilder xml, Totales t) {
        xml.append("  <ResumenFactura>\n");
        xml.append("    <CodigoTipoMoneda>\n");
        xml.append("      <CodigoMoneda>CRC</CodigoMoneda>\n");
        xml.append("      <TipoCambio>1</TipoCambio>\n");
        xml.append("    </CodigoTipoMoneda>\n");
        xml.append("    <TotalMercanciasGravadas>").append(t.gravado).append("</TotalMercanciasGravadas>\n");
        xml.append("    <TotalMercanciasExentas>").append(t.exento).append("</TotalMercanciasExentas>\n");
        xml.append("    <TotalGravado>").append(t.gravado).append("</TotalGravado>\n");
        xml.append("    <TotalExento>").append(t.exento).append("</TotalExento>\n");
        xml.append("    <TotalVenta>").append(t.venta()).append("</TotalVenta>\n");
        xml.append("    <TotalDescuentos>0</TotalDescuentos>\n");
        xml.append("    <TotalVentaNeta>").append(t.venta()).append("</TotalVentaNeta>\n");
        t.desglose.forEach((tarifa, monto) -> {
            xml.append("    <TotalDesgloseImpuesto>\n");
            xml.append("      <Codigo>01</Codigo>\n");
            xml.append("      <CodigoTarifaIVA>").append(esc(tarifa)).append("</CodigoTarifaIVA>\n");
            xml.append("      <TotalMontoImpuesto>").append(monto).append("</TotalMontoImpuesto>\n");
            xml.append("    </TotalDesgloseImpuesto>\n");
        });
        xml.append("    <TotalImpuesto>").append(t.impuesto).append("</TotalImpuesto>\n");
        xml.append("    <MedioPago>\n");
        xml.append("      <TipoMedioPago>01</TipoMedioPago>\n");
        xml.append("      <TotalMedioPago>").append(t.total()).append("</TotalMedioPago>\n");
        xml.append("    </MedioPago>\n");
        xml.append("    <TotalComprobante>").append(t.total()).append("</TotalComprobante>\n");
        xml.append("  </ResumenFactura>\n");
    }

    private static List<PedidoItem> lineasDe(List<Pedido> pedidos) {
        List<PedidoItem> lineas = new ArrayList<>();
        if (pedidos == null) return lineas;
        for (Pedido pedido : pedidos) {
            if (pedido.getItems() != null) lineas.addAll(pedido.getItems());
        }
        if (lineas.isEmpty()) {
            throw new IllegalStateException("La compra no tiene líneas para el tiquete");
        }
        return lineas;
    }

    private static boolean vacio(String s) {
        return s == null || s.isBlank();
    }

    private static String digitos(String cedula) {
        return cedula.replaceAll("[^0-9]", "");
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
