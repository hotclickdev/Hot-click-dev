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
    @DisplayName("línea de 1000 colones al 13% suma 130 de IVA")
    void ivaTrecePorCientoPorLinea() {
        Producto producto = producto("Cable", new BigDecimal("13"), "08");
        Pedido pedido = pedidoCon(producto, 1000, 1);
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_TIQUETE), empresa(), pedido);
        assertThat(xml).contains("<Monto>130</Monto>");
        assertThat(xml).contains("<TotalImpuesto>130</TotalImpuesto>");
        assertThat(xml).contains("<TotalComprobante>1130</TotalComprobante>");
        assertThat(xml).contains("<CodigoTarifaIVA>08</CodigoTarifaIVA>");
        assertThat(xml).contains("<BaseImponible>1000</BaseImponible>");
        assertThat(xml).contains("<TotalVentaNeta>1000</TotalVentaNeta>");
        assertThat(xml).contains("<TotalMedioPago>1130</TotalMedioPago>");
        validarOficial(xml, false);
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
