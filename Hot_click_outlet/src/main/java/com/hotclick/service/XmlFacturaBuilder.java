package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.service.hacienda.CodigoCabys;
import com.hotclick.service.hacienda.ImpuestoLinea;
import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * XML de comprobante electrónico Hacienda CR 4.4 (factura y tiquete).
 * El subset local no es el XSD oficial: hay que contrastarlo antes de producción.
 */
@Service
public class XmlFacturaBuilder {

    private static final DateTimeFormatter DT_FMT =
        DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss-06:00");

    private static final String NS_FACTURA =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica";
    private static final String NS_TIQUETE =
        "https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico";

    private final XmlFacturaSchemaValidator schemaValidator;

    public XmlFacturaBuilder(XmlFacturaSchemaValidator schemaValidator) {
        this.schemaValidator = schemaValidator;
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
        ImpuestoLinea.Montos totales = appendDetalle(xml, lineasDe(pedidos));
        appendResumen(xml, totales);
        xml.append("</").append(rootTag).append(">\n");

        String resultado = xml.toString();
        schemaValidator.validar(resultado, esFactura);
        return resultado;
    }

    private static void validarEmisor(Empresa empresa) {
        if (empresa.getCedulaJuridica() == null || empresa.getCedulaJuridica().isBlank()) {
            throw new IllegalStateException("El emisor no tiene cédula para el XML");
        }
        if (empresa.getActividadEconomica() == null || empresa.getActividadEconomica().isBlank()) {
            throw new IllegalStateException("El emisor no tiene código de actividad económica");
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
        xml.append("  <MedioPago>01</MedioPago>\n");
    }

    private void appendEmisor(StringBuilder xml, Empresa empresa) {
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

    private ImpuestoLinea.Montos appendDetalle(StringBuilder xml, List<PedidoItem> items) {
        xml.append("  <DetalleServicio>\n");
        long base = 0;
        long impuesto = 0;
        int lineaNum = 1;
        for (PedidoItem item : items) {
            ImpuestoLinea.Montos montos = appendLinea(xml, item, lineaNum++);
            base += montos.base();
            impuesto += montos.impuesto();
        }
        xml.append("  </DetalleServicio>\n");
        return new ImpuestoLinea.Montos(base, impuesto);
    }

    private ImpuestoLinea.Montos appendLinea(StringBuilder xml, PedidoItem item, int lineaNum) {
        Producto producto = item.getProducto();
        String cabys = producto != null ? producto.getCodigoCabys() : null;
        if (!CodigoCabys.valido(cabys)) {
            String nombre = producto != null ? producto.getNombreProducto() : "línea " + lineaNum;
            throw new IllegalStateException("Producto sin CAByS de 13 dígitos: " + nombre);
        }
        long precioUnit = item.getPrecioUnitarioMomento() != null ? item.getPrecioUnitarioMomento() : 0L;
        int cantidad = item.getCantidad();
        BigDecimal pctIva = BigDecimal.ZERO;
        String codTarifa = "01";
        if (producto != null) {
            pctIva = producto.getPorcentajeIva();
            codTarifa = producto.getCodigoTarifaIva();
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
        if (montos.impuesto() > 0) {
            xml.append("      <Impuesto>\n");
            xml.append("        <Codigo>01</Codigo>\n");
            xml.append("        <CodigoTarifaIVA>").append(esc(codTarifa)).append("</CodigoTarifaIVA>\n");
            xml.append("        <Tarifa>").append(pctIva.toPlainString()).append("</Tarifa>\n");
            xml.append("        <Monto>").append(montos.impuesto()).append("</Monto>\n");
            xml.append("      </Impuesto>\n");
        }
        xml.append("      <ImpuestoNeto>").append(montos.impuesto()).append("</ImpuestoNeto>\n");
        xml.append("      <MontoTotalLinea>").append(montos.total()).append("</MontoTotalLinea>\n");
        xml.append("    </LineaDetalle>\n");
        return montos;
    }

    private static void appendResumen(StringBuilder xml, ImpuestoLinea.Montos totales) {
        xml.append("  <ResumenFactura>\n");
        xml.append("    <CodigoTipoMoneda>\n");
        xml.append("      <CodigoMoneda>CRC</CodigoMoneda>\n");
        xml.append("      <TipoCambio>1</TipoCambio>\n");
        xml.append("    </CodigoTipoMoneda>\n");
        xml.append("    <TotalGravado>").append(totales.base()).append("</TotalGravado>\n");
        xml.append("    <TotalImpuesto>").append(totales.impuesto()).append("</TotalImpuesto>\n");
        xml.append("    <TotalComprobante>").append(totales.total()).append("</TotalComprobante>\n");
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

    private static String digitos(String cedula) {
        return cedula.replaceAll("[^0-9]", "");
    }

    private static String esc(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&apos;");
    }
}
