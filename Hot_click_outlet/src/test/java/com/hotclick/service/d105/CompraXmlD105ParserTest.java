package com.hotclick.service.d105;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Parser de compras XML para el D-105")
class CompraXmlD105ParserTest {

    private final CompraXmlD105Parser parser = new CompraXmlD105Parser();

    @Test
    @DisplayName("factura de febrero queda en Q1 con la venta neta")
    void facturaTrimestreUno() throws Exception {
        CompraD105Parseada parsed = parser.parsear(bytes("/hacienda/d105/factura-compra.xml"));

        assertThat(parsed.tipoDocumento()).isEqualTo("01");
        assertThat(parsed.trimestre()).isEqualTo("Q1");
        assertThat(parsed.anio()).isEqualTo(2026);
        assertThat(parsed.fechaEmision()).hasMonthValue(2).hasDayOfMonth(15);
        assertThat(parsed.emisorCedula()).isEqualTo("3101999888");
        assertThat(parsed.emisorNombre()).isEqualTo("Proveedor SA");
        assertThat(parsed.subtotalNeto()).isEqualTo(10_000);
        assertThat(parsed.totalImpuesto()).isEqualTo(1_300);
        assertThat(parsed.totalComprobante()).isEqualTo(11_300);
    }

    @Test
    @DisplayName("nota de crédito del mismo trimestre resta")
    void notaCreditoResta() throws Exception {
        CompraD105Parseada factura = parser.parsear(bytes("/hacienda/d105/factura-compra.xml"));
        CompraD105Parseada nota = parser.parsear(bytes("/hacienda/d105/nota-credito.xml"));

        assertThat(nota.tipoDocumento()).isEqualTo("03");
        assertThat(nota.trimestre()).isEqualTo("Q1");
        assertThat(nota.subtotalNeto()).isEqualTo(-2_000);
        assertThat(factura.subtotalNeto() + nota.subtotalNeto()).isEqualTo(8_000);
    }

    @Test
    @DisplayName("abril es Q2 y el redondeo es por monto")
    void abrilYRedondeo() {
        String xml = """
            <FacturaElectronica>
              <Clave>50601042600310112345600100001010000000003123456789</Clave>
              <FechaEmision>2026-04-01T00:30:00-06:00</FechaEmision>
              <Emisor>
                <Nombre>Otro</Nombre>
                <Identificacion><Numero>3101000001</Numero></Identificacion>
              </Emisor>
              <ResumenFactura>
                <TotalVentaNeta>1000.50</TotalVentaNeta>
                <TotalImpuesto>130.49</TotalImpuesto>
                <TotalComprobante>1130.50</TotalComprobante>
              </ResumenFactura>
            </FacturaElectronica>
            """;

        CompraD105Parseada parsed = parser.parsear(xml.getBytes(StandardCharsets.UTF_8));

        assertThat(parsed.trimestre()).isEqualTo("Q2");
        assertThat(parsed.subtotalNeto()).isEqualTo(1001);
        assertThat(parsed.totalImpuesto()).isEqualTo(130);
        assertThat(parsed.totalComprobante()).isEqualTo(1131);
    }

    @Test
    @DisplayName("un tiquete no entra al D-105")
    void rechazaTiquete() {
        String xml = """
            <TiqueteElectronico>
              <Clave>50615022600310112345600100001040000000015123456789</Clave>
              <FechaEmision>2026-02-15T10:00:00-06:00</FechaEmision>
            </TiqueteElectronico>
            """;
        assertThatThrownBy(() -> parser.parsear(xml.getBytes(StandardCharsets.UTF_8)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Nota de Crédito");
    }

    @Test
    @DisplayName("un TotalVentaNeta anidado no pisa el monto del resumen")
    void ignoraMontoAnidado() {
        String xml = """
            <FacturaElectronica>
              <Clave>50615022600310112345600100001010000000015123456789</Clave>
              <FechaEmision>2026-02-15T10:00:00-06:00</FechaEmision>
              <Emisor>
                <Nombre>Proveedor SA</Nombre>
                <Identificacion><Numero>3101999888</Numero></Identificacion>
              </Emisor>
              <ResumenFactura>
                <CodigoTipoMoneda><TotalVentaNeta>1</TotalVentaNeta></CodigoTipoMoneda>
                <TotalVentaNeta>10000</TotalVentaNeta>
                <TotalImpuesto>1300</TotalImpuesto>
                <TotalComprobante>11300</TotalComprobante>
              </ResumenFactura>
            </FacturaElectronica>
            """;

        CompraD105Parseada parsed = parser.parsear(xml.getBytes(StandardCharsets.UTF_8));

        assertThat(parsed.subtotalNeto()).isEqualTo(10_000);
    }

    @Test
    @DisplayName("un DOCTYPE no se procesa")
    void rechazaDoctype() {
        String xml = """
            <?xml version="1.0"?>
            <!DOCTYPE FacturaElectronica [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
            <FacturaElectronica><Clave>&xxe;</Clave></FacturaElectronica>
            """;

        assertThatThrownBy(() -> parser.parsear(xml.getBytes(StandardCharsets.UTF_8)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("No se pudo leer el XML");
    }

    @Test
    @DisplayName("un XML de más de 2 MB no se parsea")
    void rechazaXmlGrande() {
        byte[] xml = new byte[CompraXmlD105Parser.MAX_XML_BYTES + 1];

        assertThatThrownBy(() -> parser.parsear(xml))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("2 MB");
    }

    private static byte[] bytes(String classpath) throws Exception {
        try (var in = CompraXmlD105ParserTest.class.getResourceAsStream(classpath)) {
            assertThat(in).isNotNull();
            return in.readAllBytes();
        }
    }
}
