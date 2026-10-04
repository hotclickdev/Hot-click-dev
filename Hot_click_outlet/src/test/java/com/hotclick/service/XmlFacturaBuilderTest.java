package com.hotclick.service;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("XmlFacturaBuilder — subset 4.4 y zona -06:00")
class XmlFacturaBuilderTest {

    private static final String CABYS = "4321150100101";

    private XmlFacturaBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new XmlFacturaBuilder(new XmlFacturaSchemaValidator());
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
    @DisplayName("XML invalido no pasa el subset")
    void xmlInvalidoFalla() {
        XmlFacturaSchemaValidator validator = new XmlFacturaSchemaValidator();
        assertThatThrownBy(() -> validator.validar("<FacturaElectronica/>", true))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("v4.4");
    }

    @Test
    @DisplayName("muestra estatica de factura pasa el subset")
    void muestraEstaticaPasaSubset() throws Exception {
        String xml = Files.readString(Path.of("src/test/resources/hacienda/factura-muestra.xml"));
        new XmlFacturaSchemaValidator().validar(xml, true);
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
        e.setCorreoEmpresa("facturas@hotclick.lat");
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

    private static Pedido pedidoCon(Producto producto, int precio, int cantidad) {
        PedidoItem item = new PedidoItem();
        item.setCantidad(cantidad);
        item.setPrecioUnitarioMomento(precio);
        item.setProducto(producto);
        Pedido pedido = new Pedido();
        pedido.setItems(List.of(item));
        return pedido;
    }
}
