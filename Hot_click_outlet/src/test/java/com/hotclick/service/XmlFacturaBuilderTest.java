package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.service.hacienda.ComprobanteInvalidoException;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("XmlFacturaBuilder — XSD oficial 4.4 (firmado) y zona -06:00")
class XmlFacturaBuilderTest {

    private static final String CABYS = "4321150100101";

    private static final XmlFacturaSchemaValidator VALIDADOR = new XmlFacturaSchemaValidator();
    private XmlFacturaBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new XmlFacturaBuilder();
    }

    /** Firma con el certificado de prueba y valida contra el XSD oficial. */
    private static void validarOficial(String xml, boolean esFactura) {
        VALIDADOR.validar(CertificadoDePrueba.firmar(xml), esFactura);
    }

    @Test
    @DisplayName("factura valida namespace 4.4 y fecha Costa Rica")
    void facturaCumpleSubsetYTimezone() {
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedidoConIva());
        assertThat(xml).contains("xmlns=\"https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica\"");
        assertThat(xml).containsPattern("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}-06:00");
        assertThat(xml).contains("<FacturaElectronica");
        assertThat(xml).contains("<ProveedorSistemas>3101123456</ProveedorSistemas>");
        assertThat(xml).contains("<CodigoCABYS>" + CABYS + "</CodigoCABYS>");
        assertThat(xml).contains("<Receptor>");
        validarOficial(xml, true);
    }

    @Test
    @DisplayName("cédula del emisor con guiones se normaliza en Numero y ProveedorSistemas")
    void cedulaEmisorConGuionesSeNormaliza() {
        Empresa e = empresa();
        e.setCedulaJuridica(" 3-101-123456 ");
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), e, pedidoConIva());
        assertThat(xml).contains("<Numero>3101123456</Numero>")
            .contains("<ProveedorSistemas>3101123456</ProveedorSistemas>")
            .doesNotContain("3-101-123456");
        validarOficial(xml, true);
    }

    @Test
    @DisplayName("cédula del emisor con letras o largo inválido no arma XML")
    void cedulaEmisorInvalidaFalla() {
        Empresa e = empresa();
        e.setCedulaJuridica("3-101-ABC456");
        assertThatThrownBy(() -> builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), e, pedidoConIva()))
            .isInstanceOf(HaciendaConfiguracionException.class);
        e.setCedulaJuridica("1-234");
        assertThatThrownBy(() -> builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), e, pedidoConIva()))
            .isInstanceOf(HaciendaConfiguracionException.class);
    }

    @Test
    @DisplayName("tiquete sin cédula no inventa receptor")
    void tiqueteSinReceptor() {
        ComprobanteFiscal cf = comprobante(ComprobanteFiscal.TIPO_TIQUETE);
        cf.setReceptorCedula(null);
        String xml = builder.construir(cf, empresa(), pedidoSinIva());
        assertThat(xml).contains("xmlns=\"https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/tiqueteElectronico\"");
        assertThat(xml).contains("<TiqueteElectronico");
        assertThat(xml).contains("-06:00");
        assertThat(xml).doesNotContain("<Receptor>");
        // Impuesto es obligatorio aunque sea 0 % (antes se omitía y el XSD oficial lo rechaza).
        assertThat(xml).contains("<Monto>0</Monto>");
        validarOficial(xml, false);
    }

    @Test
    @DisplayName("M4 simplificado: factura de una línea de 1000 al 13% suma 130 de IVA")
    void ivaTrecePorCientoPorLinea() {
        Producto producto = producto("Cable", new BigDecimal("13"), "08");
        Pedido pedido = pedidoCon(producto, 1000, 1);
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedido);
        assertThat(xml).contains("<Monto>130</Monto>");
        assertThat(xml).contains("<TotalImpuesto>130</TotalImpuesto>");
        assertThat(xml).contains("<TotalComprobante>1130</TotalComprobante>");
        assertThat(xml).contains("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
        assertThat(xml).contains("<BaseImponible>1000</BaseImponible>");
        assertThat(xml).contains("<TotalVentaNeta>1000</TotalVentaNeta>");
        assertThat(xml).contains("<TotalMedioPago>1130</TotalMedioPago>");
        validarOficial(xml, true);
    }

    @Test
    @DisplayName("factura mixta (gravado + exento) cumple el XSD oficial y separa totales")
    void facturaMixtaCumpleXsdOficial() {
        PedidoItem gravado = item(producto("Cable", new BigDecimal("13"), "08"), 1000, 1);
        PedidoItem exento = item(producto("Libro", BigDecimal.ZERO, "10"), 500, 2);
        Pedido pedido = new Pedido();
        pedido.setItems(List.of(gravado, exento));
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedido);
        assertThat(xml).contains("<TotalGravado>1000</TotalGravado>");
        assertThat(xml).contains("<TotalExento>1000</TotalExento>");
        assertThat(xml).contains("<TotalComprobante>2130</TotalComprobante>");
        validarOficial(xml, true);
    }

    @Test
    @DisplayName("sin ubicación fiscal del emisor no se arma el XML")
    void sinUbicacionFalla() {
        Empresa e = empresa();
        e.setUbicacionDistrito(null);
        assertThatThrownBy(() -> builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), e, pedidoConIva()))
            .isInstanceOf(HaciendaConfiguracionException.class)
            .hasMessageContaining("ubicación");
    }

    @Test
    @DisplayName("XML sin firmar no pasa el XSD oficial (exige ds:Signature)")
    void sinFirmaNoPasa() {
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedidoConIva());
        assertThatThrownBy(() -> VALIDADOR.validar(xml, true))
            .isInstanceOf(ComprobanteInvalidoException.class)
            .hasMessageContaining("Signature");
    }

    @Test
    @DisplayName("M4 simplificado: el tiquete declara el precio cobrado tal cual (IVA desglosado dentro)")
    void tiqueteSimplificadoTotalIgualPrecio() {
        Pedido pedido = pedidoCon(producto("Cable", new BigDecimal("13"), "08"), 1130, 1);
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_TIQUETE), empresa(), pedido);
        assertThat(xml).contains("<TotalComprobante>1130</TotalComprobante>");
        assertThat(xml).contains("<TotalGravado>1000</TotalGravado>");
        assertThat(xml).contains("<TotalImpuesto>130</TotalImpuesto>");
    }

    @Test
    @DisplayName("M4 tradicional: la factura no suma IVA al precio (ya lo incluye)")
    void facturaTradicionalPrecioIncluyeIva() {
        Empresa e = empresa();
        e.setRegimenIva("TRADICIONAL");
        Pedido pedido = pedidoCon(producto("Cable", new BigDecimal("13"), "08"), 1130, 2);
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), e, pedido);
        assertThat(xml).contains("<TotalComprobante>2260</TotalComprobante>");
        assertThat(xml).contains("<TotalImpuesto>260</TotalImpuesto>");
        assertThat(xml).contains("<PrecioUnitario>1000.00000</PrecioUnitario>");
    }

    @Test
    @DisplayName("sin CAByS no se emite el XML")
    void sinCabysFalla() {
        Producto producto = producto("Cable", new BigDecimal("13"), "08");
        producto.setCodigoCabys(null);
        assertThatThrownBy(() -> builder.construir(
            comprobante(ComprobanteFiscal.TIPO_TIQUETE), empresa(), pedidoCon(producto, 1000, 1)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("CAByS");
    }

    @Test
    @DisplayName("XML invalido no pasa el XSD oficial")
    void xmlInvalidoFalla() {
        assertThatThrownBy(() -> VALIDADOR.validar("<FacturaElectronica/>", true))
            .isInstanceOf(ComprobanteInvalidoException.class)
            .hasMessageContaining("4.4");
    }

    private static ComprobanteFiscal comprobante(String tipo) {
        ComprobanteFiscal cf = new ComprobanteFiscal();
        cf.setTipo(tipo);
        cf.setClaveNumerica("50627082600310112345600100001010000000001199999999");
        cf.setNumeroConsecutivo("00100001010000000001");
        cf.setFechaEmision(LocalDateTime.of(2026, 8, 27, 15, 30, 0));
        cf.setReceptorNombre("Cliente CR");
        cf.setReceptorTipo("01");
        cf.setReceptorCedula("101110111");
        cf.setReceptorCorreo("cliente@example.com");
        return cf;
    }

    private static Empresa empresa() {
        Empresa e = new Empresa();
        e.setNombreComercialFe("HOTCLICK");
        e.setActividadEconomica("722003");
        e.setTipoCedula("02");
        e.setCedulaJuridica("3101123456");
        e.setCorreoEmpresa("facturas@example.com");
        e.setUbicacionProvincia("1");
        e.setUbicacionCanton("01");
        e.setUbicacionDistrito("01");
        e.setUbicacionOtrasSenas("Dirección de prueba");
        return e;
    }

    // ---- Medio de pago real (Fase 4A, v4.4) ----

    private String xmlConMetodo(String metodo) {
        Pedido pedido = pedidoCon(producto("Cable", new BigDecimal("13"), "08"), 1000, 1);
        pedido.setMetodoPago(metodo);
        pedido.setTotalPedido(1130);
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedido);
        validarOficial(xml, true);
        return xml;
    }

    private static long cuenta(String xml, String fragmento) {
        return xml.split(java.util.regex.Pattern.quote(fragmento), -1).length - 1;
    }

    @Test
    @DisplayName("medio de pago: efectivo, tarjeta (ONVO), SINPE y transferencia mapean a 01, 02, 06 y 04")
    void medioPagoUnico() {
        assertThat(xmlConMetodo("EFECTIVO")).contains("<TipoMedioPago>01</TipoMedioPago>");
        assertThat(xmlConMetodo("TARJETA")).contains("<TipoMedioPago>02</TipoMedioPago>");
        assertThat(xmlConMetodo("ONVO")).contains("<TipoMedioPago>02</TipoMedioPago>");
        String sinpe = xmlConMetodo("sinpe");
        assertThat(sinpe).contains("<TipoMedioPago>06</TipoMedioPago>").contains("<TotalMedioPago>1130</TotalMedioPago>");
        assertThat(xmlConMetodo("TRANSFERENCIA")).contains("<TipoMedioPago>04</TipoMedioPago>");
    }

    @Test
    @DisplayName("medio de pago desconocido o vacio conserva 01")
    void medioPagoDesconocido() {
        assertThat(xmlConMetodo("TRUEQUE")).contains("<TipoMedioPago>01</TipoMedioPago>");
        assertThat(xmlConMetodo(null)).contains("<TipoMedioPago>01</TipoMedioPago>");
    }

    @Test
    @DisplayName("pago mixto: gift card (99 con descripcion) + SINPE suman el total")
    void medioPagoMixtoGiftCard() {
        Pedido pedido = pedidoCon(producto("Cable", new BigDecimal("13"), "08"), 1000, 1);
        pedido.setMetodoPago("SINPE");
        pedido.setTotalPedido(1130);
        pedido.setGiftCardMonto(300);
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedido);
        assertThat(xml).contains("<TipoMedioPago>06</TipoMedioPago>", "<TotalMedioPago>830</TotalMedioPago>",
            "<TipoMedioPago>99</TipoMedioPago>", "<MedioPagoOtros>Gift card HotClick</MedioPagoOtros>",
            "<TotalMedioPago>300</TotalMedioPago>");
        validarOficial(xml, true);
    }

    @Test
    @DisplayName("compra con 2 paquetes y metodos distintos: dos MedioPago que suman TotalComprobante")
    void medioPagoDosPaquetes() {
        Pedido a = pedidoCon(producto("Cable", new BigDecimal("13"), "08"), 1000, 1);
        a.setMetodoPago("TARJETA");
        a.setTotalPedido(1130);
        Pedido b = pedidoCon(producto("Cable", new BigDecimal("13"), "08"), 1000, 1);
        b.setMetodoPago("SINPE");
        b.setTotalPedido(1130);
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), List.of(a, b));
        assertThat(xml).contains("<TotalComprobante>2260</TotalComprobante>");
        assertThat(cuenta(xml, "<MedioPago>")).isEqualTo(2);
        assertThat(xml).contains("<TipoMedioPago>02</TipoMedioPago>", "<TipoMedioPago>06</TipoMedioPago>");
        assertThat(cuenta(xml, "<TotalMedioPago>1130</TotalMedioPago>")).isEqualTo(2);
        validarOficial(xml, true);
    }

    @Test
    @DisplayName("mas de 4 medios: se conservan 3 y el resto se agrupa en 99 (max 4 MedioPago)")
    void medioPagoMasDeCuatro() {
        String[] metodos = {"EFECTIVO", "TARJETA", "SINPE", "TRANSFERENCIA", "PAYPAL"};
        int[] precios = {5000, 4000, 3000, 2000, 1000};
        List<Pedido> pedidos = new java.util.ArrayList<>();
        for (int i = 0; i < metodos.length; i++) {
            Pedido p = pedidoCon(producto("Cable", BigDecimal.ZERO, "10"), precios[i], 1);
            p.setMetodoPago(metodos[i]);
            p.setTotalPedido(precios[i]);
            pedidos.add(p);
        }
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedidos);
        assertThat(cuenta(xml, "<MedioPago>")).isEqualTo(4);
        assertThat(xml).contains("<TotalComprobante>15000</TotalComprobante>",
            "<TotalMedioPago>5000</TotalMedioPago>", "<TotalMedioPago>4000</TotalMedioPago>",
            "<TotalMedioPago>3000</TotalMedioPago>", "<TotalMedioPago>3000</TotalMedioPago>",
            "<MedioPagoOtros>Otros medios de pago</MedioPagoOtros>");
        validarOficial(xml, true);
    }

    private static Pedido pedidoConIva() {
        return pedidoCon(producto("Cable USB", new BigDecimal("13"), "08"), 1000, 2);
    }

    private static Pedido pedidoSinIva() {
        return pedidoCon(producto("Sticker", BigDecimal.ZERO, "01"), 500, 2);
    }

    private static Producto producto(String nombre, BigDecimal iva, String tarifa) {
        Producto producto = new Producto();
        producto.setNombreProducto(nombre);
        producto.setPorcentajeIva(iva);
        producto.setCodigoTarifaIva(tarifa);
        producto.setCodigoCabys(CABYS);
        return producto;
    }

    private static PedidoItem item(Producto producto, int precio, int cantidad) {
        PedidoItem item = new PedidoItem();
        item.setCantidad(cantidad);
        item.setPrecioUnitarioMomento(precio);
        item.setProducto(producto);
        return item;
    }

    private static Pedido pedidoCon(Producto producto, int precio, int cantidad) {
        Pedido pedido = new Pedido();
        pedido.setItems(List.of(item(producto, precio, cantidad)));
        return pedido;
    }
}
