package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.service.hacienda.CodigoCabys;
import com.hotclick.service.hacienda.CalculadoraIva;
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
        if (pedidos == null || pedidos.stream().allMatch(p -> p.getItems() == null || p.getItems().isEmpty())) {
            throw new IllegalStateException("La compra no tiene líneas para el tiquete");
        }
        // M4: misma regla que el cobro (checkout/POS): régimen, descuento repartido por línea y envío como otro cargo.
        CalculadoraIva.Resumen resumen = CalculadoraIva.resumen(empresa, esFactura, pedidos);
        appendDetalle(xml, pedidos, empresa, esFactura);
        appendOtrosCargos(xml, resumen.otrosCargos());
        appendResumen(xml, resumen, desglosePorTarifa(pedidos, empresa, esFactura));
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

    private void appendDetalle(StringBuilder xml, List<Pedido> pedidos, Empresa empresa, boolean esFactura) {
        xml.append("  <DetalleServicio>\n");
        int lineaNum = 1;
        for (Pedido pedido : pedidos) {
            if (pedido.getItems() == null) continue;
            List<CalculadoraIva.LineaXml> xs = CalculadoraIva.desglosar(empresa, esFactura,
                CalculadoraIva.lineasDe(pedido), CalculadoraIva.descuentoDe(pedido));
            for (int i = 0; i < xs.size(); i++) {
                appendLinea(xml, pedido.getItems().get(i), lineaNum++, xs.get(i));
            }
        }
        xml.append("  </DetalleServicio>\n");
    }

    private void appendLinea(StringBuilder xml, PedidoItem item, int lineaNum, CalculadoraIva.LineaXml m) {
        Producto producto = item.getProducto();
        String cabys = producto != null ? producto.getCodigoCabys() : null;
        if (!CodigoCabys.valido(cabys)) {
            String nombre = producto != null ? producto.getNombreProducto() : "línea " + lineaNum;
            throw new IllegalStateException("Producto sin CAByS de 13 dígitos: " + nombre);
        }
        BigDecimal pctIva = tarifaDe(producto);
        String codTarifa = codigoTarifa(producto);
        String detalle = producto != null ? producto.getNombreProducto() : "Producto";

        xml.append("    <LineaDetalle>\n");
        xml.append("      <NumeroLinea>").append(lineaNum).append("</NumeroLinea>\n");
        xml.append("      <CodigoCABYS>").append(cabys).append("</CodigoCABYS>\n");
        xml.append("      <Cantidad>").append(item.getCantidad()).append("</Cantidad>\n");
        xml.append("      <UnidadMedida>Unid</UnidadMedida>\n");
        xml.append("      <Detalle>").append(esc(detalle)).append("</Detalle>\n");
        xml.append("      <PrecioUnitario>").append(m.precioUnitario()).append("</PrecioUnitario>\n");
        xml.append("      <MontoTotal>").append(m.montoTotal()).append("</MontoTotal>\n");
        if (m.descuento() > 0) {
            xml.append("      <Descuento>\n");
            xml.append("        <MontoDescuento>").append(m.descuento()).append("</MontoDescuento>\n");
            xml.append("        <CodigoDescuento>").append(CODIGO_DESCUENTO_PROMOCIONAL).append("</CodigoDescuento>\n");
            xml.append("      </Descuento>\n");
        }
        xml.append("      <SubTotal>").append(m.subTotal()).append("</SubTotal>\n");
        xml.append("      <BaseImponible>").append(m.subTotal()).append("</BaseImponible>\n");
        xml.append("      <Impuesto>\n");
        xml.append("        <Codigo>01</Codigo>\n");
        xml.append("        <CodigoTarifaIVA>").append(esc(codTarifa)).append("</CodigoTarifaIVA>\n");
        xml.append("        <Tarifa>").append(pctIva.stripTrailingZeros().toPlainString()).append("</Tarifa>\n");
        xml.append("        <Monto>").append(m.impuesto()).append("</Monto>\n");
        xml.append("      </Impuesto>\n");
        xml.append("      <ImpuestoAsumidoEmisorFabrica>0</ImpuestoAsumidoEmisorFabrica>\n");
        xml.append("      <ImpuestoNeto>").append(m.impuesto()).append("</ImpuestoNeto>\n");
        xml.append("      <MontoTotalLinea>").append(m.total()).append("</MontoTotalLinea>\n");
        xml.append("    </LineaDetalle>\n");
    }

    /** 06 = Descuento promocional (cupón, descuento de caja, SINPE). */
    static final String CODIGO_DESCUENTO_PROMOCIONAL = "06";

    private static BigDecimal tarifaDe(Producto producto) {
        return producto != null && producto.getPorcentajeIva() != null ? producto.getPorcentajeIva() : BigDecimal.ZERO;
    }

    private static String codigoTarifa(Producto producto) {
        String cod = producto != null ? producto.getCodigoTarifaIva() : null;
        if (cod == null || cod.isBlank()) {
            cod = tarifaDe(producto).signum() > 0 ? "08" : "10"; // 08 = tarifa general 13 %, 10 = tarifa exenta
        }
        return cod;
    }

    private static java.util.Map<String, Long> desglosePorTarifa(List<Pedido> pedidos, Empresa empresa, boolean esFactura) {
        java.util.LinkedHashMap<String, Long> d = new java.util.LinkedHashMap<>();
        for (Pedido pedido : pedidos) {
            if (pedido.getItems() == null) continue;
            List<CalculadoraIva.LineaXml> xs = CalculadoraIva.desglosar(empresa, esFactura,
                CalculadoraIva.lineasDe(pedido), CalculadoraIva.descuentoDe(pedido));
            for (int i = 0; i < xs.size(); i++) {
                d.merge(codigoTarifa(pedido.getItems().get(i).getProducto()), xs.get(i).impuesto(), Long::sum);
            }
        }
        return d;
    }

    /** Envío: otro cargo 99 sin IVA, para que TotalComprobante sea igual a lo cobrado. */
    private static void appendOtrosCargos(StringBuilder xml, long envio) {
        if (envio <= 0) return;
        xml.append("  <OtrosCargos>\n");
        xml.append("    <TipoDocumentoOC>99</TipoDocumentoOC>\n");
        xml.append("    <TipoDocumentoOTROS>Envío a domicilio</TipoDocumentoOTROS>\n");
        xml.append("    <Detalle>Costo de envío</Detalle>\n");
        xml.append("    <MontoCargo>").append(envio).append("</MontoCargo>\n");
        xml.append("  </OtrosCargos>\n");
    }

    private static void appendResumen(StringBuilder xml, CalculadoraIva.Resumen t, java.util.Map<String, Long> desglose) {
        xml.append("  <ResumenFactura>\n");
        xml.append("    <CodigoTipoMoneda>\n");
        xml.append("      <CodigoMoneda>CRC</CodigoMoneda>\n");
        xml.append("      <TipoCambio>1</TipoCambio>\n");
        xml.append("    </CodigoTipoMoneda>\n");
        xml.append("    <TotalMercanciasGravadas>").append(t.gravado()).append("</TotalMercanciasGravadas>\n");
        xml.append("    <TotalMercanciasExentas>").append(t.exento()).append("</TotalMercanciasExentas>\n");
        xml.append("    <TotalGravado>").append(t.gravado()).append("</TotalGravado>\n");
        xml.append("    <TotalExento>").append(t.exento()).append("</TotalExento>\n");
        xml.append("    <TotalVenta>").append(t.venta()).append("</TotalVenta>\n");
        xml.append("    <TotalDescuentos>").append(t.descuentos()).append("</TotalDescuentos>\n");
        xml.append("    <TotalVentaNeta>").append(t.ventaNeta()).append("</TotalVentaNeta>\n");
        desglose.forEach((tarifa, monto) -> {
            xml.append("    <TotalDesgloseImpuesto>\n");
            xml.append("      <Codigo>01</Codigo>\n");
            xml.append("      <CodigoTarifaIVA>").append(esc(tarifa)).append("</CodigoTarifaIVA>\n");
            xml.append("      <TotalMontoImpuesto>").append(monto).append("</TotalMontoImpuesto>\n");
            xml.append("    </TotalDesgloseImpuesto>\n");
        });
        xml.append("    <TotalImpuesto>").append(t.impuesto()).append("</TotalImpuesto>\n");
        if (t.otrosCargos() > 0) {
            xml.append("    <TotalOtrosCargos>").append(t.otrosCargos()).append("</TotalOtrosCargos>\n");
        }
        xml.append("    <MedioPago>\n");
        xml.append("      <TipoMedioPago>01</TipoMedioPago>\n");
        xml.append("      <TotalMedioPago>").append(t.totalComprobante()).append("</TotalMedioPago>\n");
        xml.append("    </MedioPago>\n");
        xml.append("    <TotalComprobante>").append(t.totalComprobante()).append("</TotalComprobante>\n");
        xml.append("  </ResumenFactura>\n");
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
