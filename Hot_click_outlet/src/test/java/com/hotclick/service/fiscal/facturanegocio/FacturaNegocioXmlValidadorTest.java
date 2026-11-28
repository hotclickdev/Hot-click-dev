package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.service.XmlFacturaBuilder;
import com.hotclick.service.hacienda.CertificadoDePrueba;
import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.List;
import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Factura del negocio a HotClick: cada validación, válida e inválida. El XML se arma con el mismo constructor 4.4 del
 * repo y se firma con un certificado desechable de prueba. Cédulas ficticias.
 */
@DisplayName("Fase 2: validación del XML de la factura del negocio")
class FacturaNegocioXmlValidadorTest {

    static final String CED_NEGOCIO = "3101123456";
    static final String CED_HOTCLICK = "3101000999";
    static final String CLAVE = "50627082600310112345600100001010000000001199999999";
    static final long MONTO = 1130;

    private static final XmlFacturaSchemaValidator XSD = new XmlFacturaSchemaValidator();
    private final FacturaNegocioXmlValidador validador = new FacturaNegocioXmlValidador(XSD);

    // ── fixtures ────────────────────────────────────────────────────────────────────────────────────────────

    /** XML 4.4 sin firmar: el negocio (emisor) le factura a HotClick (receptor) un producto de 1000 + 13 % IVA. */
    static String xmlBase() {
        ComprobanteFiscal cf = new ComprobanteFiscal();
        cf.setTipo(ComprobanteFiscal.TIPO_FACTURA);
        cf.setClaveNumerica(CLAVE);
        cf.setNumeroConsecutivo(CLAVE.substring(21, 41));
        cf.setFechaEmision(LocalDateTime.of(2026, 8, 27, 15, 30, 0));
        cf.setReceptorNombre("HotClick Prueba");
        cf.setReceptorTipo("02");
        cf.setReceptorCedula(CED_HOTCLICK);
        cf.setReceptorCorreo("facturas@example.com");
        Empresa e = new Empresa();
        e.setNombreComercialFe("NEGOCIO PRUEBA");
        e.setActividadEconomica("722003");
        e.setTipoCedula("02");
        e.setCedulaJuridica(CED_NEGOCIO);
        e.setCorreoEmpresa("negocio@example.com");
        e.setUbicacionProvincia("1");
        e.setUbicacionCanton("01");
        e.setUbicacionDistrito("01");
        e.setUbicacionOtrasSenas("Dirección de prueba");
        Producto p = new Producto();
        p.setNombreProducto("Camisa");
        p.setPorcentajeIva(new BigDecimal("13"));
        p.setCodigoTarifaIva("08");
        p.setCodigoCabys("4321150100101");
        PedidoItem i = new PedidoItem();
        i.setCantidad(1);
        i.setPrecioUnitarioMomento(1000);
        i.setProducto(p);
        Pedido pedido = new Pedido();
        pedido.setItems(List.of(i));
        return new XmlFacturaBuilder().construir(cf, e, pedido);
    }

    static byte[] firmado(UnaryOperator<String> cambio) {
        return CertificadoDePrueba.firmar(cambio.apply(xmlBase())).getBytes(StandardCharsets.UTF_8);
    }

    static byte[] valido() { return firmado(UnaryOperator.identity()); }

    private static FacturaNegocioXmlValidador.Esperado esperado() {
        return new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, CED_HOTCLICK, MONTO, 1, c -> false);
    }

    private FacturaNegocioXmlValidador.Resultado validar(byte[] xml) { return validador.validar(xml, esperado()); }

    private static String unido(FacturaNegocioXmlValidador.Resultado r) { return String.join(" | ", r.errores()); }

    // ── válida ──────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Factura correcta, firmada y a nombre de HotClick: válida, con clave, emisor y totales")
    void valida() {
        var r = validar(valido());
        assertThat(r.errores()).isEmpty();
        assertThat(r.valida()).isTrue();
        assertThat(r.clave()).isEqualTo(CLAVE);
        assertThat(r.cedulaEmisor()).isEqualTo(CED_NEGOCIO);
        assertThat(r.totalComprobanteCrc()).isEqualTo(1130L);
        assertThat(r.totalImpuestoCrc()).isEqualTo(130L);
    }

    // ── raíz, XSD y firma ───────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Raíz distinta de FacturaElectronica (tiquete) se rechaza con mensaje claro")
    void raizNoFactura() {
        byte[] xml = "<TiqueteElectronico xmlns=\"x\"><Clave>1</Clave></TiqueteElectronico>".getBytes(StandardCharsets.UTF_8);
        var r = validar(xml);
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("FacturaElectronica");
    }

    @Test
    @DisplayName("Sin firma: no cumple el XSD oficial y la firma no es válida")
    void sinFirma() {
        var r = validar(xmlBase().getBytes(StandardCharsets.UTF_8));
        assertThat(unido(r)).contains("formato oficial 4.4").contains("firma digital");
    }

    @Test
    @DisplayName("XML modificado después de firmar: la firma XAdES no es válida")
    void alteradoTrasFirmar() {
        String xml = new String(valido(), StandardCharsets.UTF_8).replace("<Detalle>Camisa</Detalle>", "<Detalle>Pantalon</Detalle>");
        var r = validar(xml.getBytes(StandardCharsets.UTF_8));
        assertThat(unido(r)).contains("firma digital");
    }

    @Test
    @DisplayName("XML que no es XML válido")
    void basura() {
        assertThat(unido(validar("esto no es xml".getBytes(StandardCharsets.UTF_8)))).contains("no es un XML válido");
    }

    // ── seguridad del parseo ────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("XXE: un DOCTYPE con entidad externa se rechaza sin leer el archivo")
    void xxe() {
        String xml = "<?xml version=\"1.0\"?><!DOCTYPE f [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
            + "<FacturaElectronica>&x;</FacturaElectronica>";
        var r = validar(xml.getBytes(StandardCharsets.UTF_8));
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("DOCTYPE").doesNotContain("root:");
    }

    @Test
    @DisplayName("Billion laughs: el DOCTYPE con entidades anidadas se corta antes de expandir")
    void billionLaughs() {
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\"?><!DOCTYPE lolz [<!ENTITY lol \"lol\">");
        for (int i = 1; i <= 9; i++) {
            sb.append("<!ENTITY lol").append(i).append(" \"");
            for (int j = 0; j < 10; j++) sb.append("&lol").append(i == 1 ? "" : String.valueOf(i - 1)).append(';');
            sb.append("\">");
        }
        sb.append("]><FacturaElectronica>&lol9;</FacturaElectronica>");
        long t0 = System.nanoTime();
        var r = validar(sb.toString().getBytes(StandardCharsets.UTF_8));
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("DOCTYPE");
        assertThat((System.nanoTime() - t0) / 1_000_000).isLessThan(5_000);
    }

    @Test
    @DisplayName("Más de 1 MB: se rechaza por tamaño")
    void tamano() {
        byte[] grande = new byte[XmlSeguro.MAX_BYTES + 1];
        java.util.Arrays.fill(grande, (byte) ' ');
        assertThat(unido(validar(grande))).contains("1 MB");
    }

    // ── clave ───────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Clave con largo distinto de 50 dígitos")
    void claveLargo() {
        var e = new java.util.ArrayList<String>();
        FacturaNegocioXmlValidador.revisarClave("506123", CED_NEGOCIO, null, e);
        assertThat(e).anyMatch(m -> m.contains("50 dígitos"));
    }

    @Test
    @DisplayName("Clave válida: sin errores de estructura")
    void claveEstructuraValida() {
        var e = new java.util.ArrayList<String>();
        FacturaNegocioXmlValidador.revisarClave(CLAVE, CED_NEGOCIO, CLAVE.substring(21, 41), e);
        assertThat(e).isEmpty();
    }

    @Test
    @DisplayName("Clave: país, fecha, cédula del emisor, tipo 01, consecutivo y situación")
    void claveEstructuraInvalida() {
        var e = new java.util.ArrayList<String>();
        // 507 + 32/13/26 + otra cédula + consecutivo tipo 04 (tiquete) + situación 9
        String mala = "507321326" + "003101999999" + "00100001040000000001" + "9" + "99999999";
        FacturaNegocioXmlValidador.revisarClave(mala, CED_NEGOCIO, "00100001010000000001", e);
        assertThat(String.join("|", e)).contains("506").contains("fecha").contains("cédula dentro de la clave")
            .contains("tipo 01").contains("consecutivo no coincide").contains("situación");
    }

    @Test
    @DisplayName("Clave ya usada antes: se rechaza")
    void claveRepetida() {
        var r = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, CED_HOTCLICK, MONTO, 1,
            CLAVE::equals));
        assertThat(unido(r)).contains("ya se subió antes");
    }

    // ── emisor y receptor ───────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Emisor distinto de la cédula fiscal verificada del negocio")
    void emisorDistinto() {
        var r = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado("3101777777", CED_HOTCLICK, MONTO, 1, c -> false));
        assertThat(unido(r)).contains("emisor no coincide");
    }

    @Test
    @DisplayName("Receptor distinto de HotClick")
    void receptorDistinto() {
        var r = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, "3101888888", MONTO, 1, c -> false));
        assertThat(unido(r)).contains("a nombre de HotClick");
    }

    @Test
    @DisplayName("Sin cédula de HotClick configurada: se avisa y no se acepta")
    void receptorSinConfigurar() {
        var r = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, null, MONTO, 1, c -> false));
        assertThat(unido(r)).contains("todavía no tiene su cédula");
    }

    // ── monto y tolerancia ──────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Total dentro de la tolerancia (±1) se acepta; fuera se rechaza")
    void tolerancia() {
        var dentro = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, CED_HOTCLICK, 1131, 1, c -> false));
        assertThat(dentro.valida()).isTrue();
        var fuera = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, CED_HOTCLICK, 1200, 1, c -> false));
        assertThat(unido(fuera)).contains("no coincide con lo que te corresponde facturar");
        var ampliada = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, CED_HOTCLICK, 1200, 100, c -> false));
        assertThat(ampliada.valida()).isTrue();
    }

    // ── líneas, IVA y CAByS ─────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Línea: cantidad por precio no da el monto total")
    void lineaAritmetica() {
        var r = validar(firmado(x -> x.replace("<MontoTotal>1000", "<MontoTotal>1500")));
        assertThat(unido(r)).contains("cantidad por precio unitario");
    }

    @Test
    @DisplayName("IVA de la línea no corresponde a la tarifa")
    void ivaLinea() {
        var r = validar(firmado(x -> x.replaceFirst("<Monto>130</Monto>", "<Monto>50</Monto>")));
        assertThat(unido(r)).contains("el IVA no corresponde a la tarifa");
    }

    @Test
    @DisplayName("IVA total distinto de la suma de las líneas")
    void ivaTotal() {
        var r = validar(firmado(x -> x.replace("<TotalImpuesto>130</TotalImpuesto>", "<TotalImpuesto>10</TotalImpuesto>")));
        assertThat(unido(r)).contains("IVA total no es la suma");
    }

    @Test
    @DisplayName("Total del comprobante distinto de venta neta + IVA")
    void totalComprobante() {
        var r = validar(firmado(x -> x.replace("<TotalComprobante>1130</TotalComprobante>", "<TotalComprobante>1300</TotalComprobante>")));
        assertThat(unido(r)).contains("total del comprobante no es la venta neta");
    }

    @Test
    @DisplayName("Línea sin CAByS válido")
    void sinCabys() {
        var r = validar(firmado(x -> x.replace("<CodigoCABYS>4321150100101</CodigoCABYS>", "<CodigoCABYS>123</CodigoCABYS>")));
        assertThat(unido(r)).contains("CAByS");
    }

    @Test
    @DisplayName("Cédulas: se comparan sin ceros de relleno")
    void cedulas() {
        assertThat(FacturaNegocioXmlValidador.mismaCedula("003101123456", "3101123456")).isTrue();
        assertThat(FacturaNegocioXmlValidador.mismaCedula("3101123456", "3101123457")).isFalse();
        assertThat(FacturaNegocioXmlValidador.mismaCedula(null, "1")).isFalse();
    }
}
