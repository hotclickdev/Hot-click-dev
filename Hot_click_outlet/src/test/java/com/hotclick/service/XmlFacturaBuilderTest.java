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

@DisplayName("XmlFacturaBuilder — XSD 4.3 subset y zona -06:00")
class XmlFacturaBuilderTest {

    private XmlFacturaBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new XmlFacturaBuilder(new XmlFacturaSchemaValidator());
    }

    @Test
    @DisplayName("factura valida namespace 4.3 y fecha Costa Rica")
    void facturaCumpleSubsetYTimezone() {
        String xml = builder.construir(comprobante(ComprobanteFiscal.TIPO_FACTURA), empresa(), pedidoConIva());
        assertThat(xml).contains("xmlns=\"https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica\"");
        assertThat(xml).containsPattern("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}-06:00");
        assertThat(xml).contains("<FacturaElectronica");
        assertThat(xml).contains("<Receptor>");
    }

    @Test
    @DisplayName("tiquete valida namespace 4.3 y fecha Costa Rica")
    void tiqueteCumpleSubsetYTimezone() {
        ComprobanteFiscal cf = comprobante(ComprobanteFiscal.TIPO_TIQUETE);
        cf.setReceptorCedula(null);
        String xml = builder.construir(cf, empresa(), pedidoSinIva());
        assertThat(xml).contains("xmlns=\"https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/tiqueteElectronico\"");
        assertThat(xml).contains("<TiqueteElectronico");
        assertThat(xml).contains("-06:00");
        assertThat(xml).doesNotContain("<Receptor>");
    }

    @Test
    @DisplayName("XML invalido no pasa el subset")
    void xmlInvalidoFalla() {
        XmlFacturaSchemaValidator validator = new XmlFacturaSchemaValidator();
        assertThatThrownBy(() -> validator.validar("<FacturaElectronica/>", true))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("XSD 4.3");
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
        Producto producto = new Producto();
        producto.setNombreProducto("Cable USB");
        producto.setPorcentajeIva(new BigDecimal("13"));
        producto.setCodigoTarifaIva("08");
        return pedidoCon(producto, 1000);
    }

    private static Pedido pedidoSinIva() {
        Producto producto = new Producto();
        producto.setNombreProducto("Sticker");
        producto.setPorcentajeIva(BigDecimal.ZERO);
        return pedidoCon(producto, 500);
    }

    private static Pedido pedidoCon(Producto producto, int precio) {
        PedidoItem item = new PedidoItem();
        item.setCantidad(2);
        item.setPrecioUnitarioMomento(precio);
        item.setProducto(producto);
        Pedido pedido = new Pedido();
        pedido.setItems(List.of(item));
        return pedido;
    }
}
