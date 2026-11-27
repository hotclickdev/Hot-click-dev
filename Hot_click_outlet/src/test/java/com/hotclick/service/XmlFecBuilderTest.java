package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.service.fiscal.fec.FecModelos.LineaCompra;
import com.hotclick.service.fiscal.fec.FecModelos.Vendedor;
import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.service.hacienda.ComprobanteInvalidoException;
import com.hotclick.service.hacienda.FecSchemaValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * El XSD oficial de la FEC no está en el repo. Si alguien lo agrega en hacienda/v4.4, la prueba lo usa; si no,
 * valida contra un esquema DERIVADO del oficial de factura (mismo contenido, otra raíz y otro namespace). Eso
 * comprueba la estructura, no reemplaza al XSD oficial de FEC.
 */
@DisplayName("XmlFecBuilder - FEC tipo 08 v4.4 (firmada y validada contra XSD)")
class XmlFecBuilderTest {

    private static final String CABYS = "4321150100101";
    private static final String CLAVE = "50627112600310112345600100001080000000001199999999";
    private static final String CONSECUTIVO = "00100001080000000001";
    private static final LocalDateTime FECHA = LocalDateTime.of(2026, 11, 16, 4, 30, 0);

    private final XmlFecBuilder builder = new XmlFecBuilder();
    private static final FecSchemaValidator VALIDADOR = validador();

    private static FecSchemaValidator validador() {
        FecSchemaValidator oficial = new FecSchemaValidator();
        if (oficial.disponible()) return oficial;
        try {
            String xsd = new String(new ClassPathResource("hacienda/v4.4/FacturaElectronica_V4.4.xsd")
                .getInputStream().readAllBytes(), StandardCharsets.UTF_8)
                .replace("name=\"FacturaElectronica\"", "name=\"FacturaElectronicaCompra\"")
                .replace("v4.4/facturaElectronica\"", "v4.4/facturaElectronicaCompra\"");
            return new FecSchemaValidator(FecSchemaValidator.desdeTexto(xsd));
        } catch (java.io.IOException e) {
            throw new IllegalStateException(e);
        }
    }

    static Empresa emisor() {
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

    static Vendedor vendedor(String situacion, String cedula) {
        return new Vendedor(7L, situacion, cedula, "Tienda de Ana", "471101", "ana@example.com");
    }

    private String xml(Vendedor v, List<LineaCompra> lineas, String generico) {
        return builder.construir(emisor(), v, CLAVE, CONSECUTIVO, FECHA, lineas, generico);
    }

    @Test
    @DisplayName("FEC de un vendedor en régimen simplificado cumple el XSD y usa cédula física")
    void simplificadoCumpleXsd() {
        String xml = xml(vendedor("REGIMEN_SIMPLIFICADO", "1-0123-0456"),
            List.of(new LineaCompra(CABYS, "Compra de mercancías", 8500), new LineaCompra(null, "Compra de mercancías", 1500)),
            CABYS);
        assertThat(xml).contains("<FacturaElectronicaCompra xmlns=\"" + XmlFecBuilder.NS_FEC + "\">")
            .contains("<NumeroConsecutivo>" + CONSECUTIVO + "</NumeroConsecutivo>")
            .contains("<Tipo>01</Tipo>").contains("<Numero>101230456</Numero>")
            .contains("<CodigoActividadReceptor>471101</CodigoActividadReceptor>")
            .contains("<TotalComprobante>10000</TotalComprobante>");
        VALIDADOR.validar(CertificadoDePrueba.firmar(xml));
    }

    @Test
    @DisplayName("FEC de un no inscrito lleva tipo 06 (No Contribuyente) y también cumple el XSD")
    void noInscritoTipo06() {
        String xml = xml(vendedor("NO_INSCRITO", "101230456"),
            List.of(new LineaCompra(CABYS, "Compra de mercancías", 5000)), CABYS);
        assertThat(xml).contains("<Tipo>06</Tipo>");
        VALIDADOR.validar(CertificadoDePrueba.firmar(xml));
    }

    @Test
    @DisplayName("Un XML alterado no pasa la validación")
    void xmlRotoFalla() {
        String roto = xml(vendedor("REGIMEN_SIMPLIFICADO", "101230456"),
            List.of(new LineaCompra(CABYS, "x", 1000)), CABYS).replace("<CondicionVenta>01</CondicionVenta>", "");
        assertThatThrownBy(() -> VALIDADOR.validar(CertificadoDePrueba.firmar(roto)))
            .isInstanceOf(ComprobanteInvalidoException.class);
    }

    @Test
    @DisplayName("Línea sin CAByS y sin CAByS genérico: no arma XML")
    void sinCabysGenerico() {
        assertThatThrownBy(() -> xml(vendedor("REGIMEN_SIMPLIFICADO", "101230456"),
            List.of(new LineaCompra(null, "x", 1000)), ""))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("SIN_CABYS");
    }

    @Test
    @DisplayName("Solo simplificado o no inscrito; exige nombre y cédula")
    void vendedorInvalido() {
        List<LineaCompra> l = List.of(new LineaCompra(CABYS, "x", 1000));
        assertThatThrownBy(() -> xml(vendedor("INSCRITO", "101230456"), l, CABYS)).hasMessageContaining("SITUACION");
        assertThatThrownBy(() -> xml(vendedor("NO_INSCRITO", null), l, CABYS)).hasMessageContaining("cédula");
        assertThatThrownBy(() -> xml(new Vendedor(1L, "NO_INSCRITO", "101230456", " ", null, null), l, CABYS))
            .hasMessageContaining("nombre");
    }

    @Test
    @DisplayName("Sin el XSD oficial el validador de producción niega el envío")
    void sinXsdOficialNiega() {
        FecSchemaValidator sin = new FecSchemaValidator(null);
        assertThat(sin.disponible()).isFalse();
        assertThatThrownBy(() -> sin.validar("<a/>")).isInstanceOf(ComprobanteInvalidoException.class);
    }
}
