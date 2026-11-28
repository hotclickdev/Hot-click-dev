package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.w3c.dom.Document;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.CED_HOTCLICK;
import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.CED_NEGOCIO;
import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.CLAVE;
import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.firmado;
import static com.hotclick.service.fiscal.facturanegocio.FacturaNegocioXmlValidadorTest.valido;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * QA (PR #679): bordes del XML de la factura del negocio que no cubre {@link FacturaNegocioXmlValidadorTest}.
 * Clave con largo o tipo incorrecto dentro de un XML firmado, línea sin CAByS, receptor equivocado en el XML,
 * tolerancia exacta, respuesta de Hacienda rechazada y variantes de XXE. Cédulas ficticias.
 */
@DisplayName("QA Fase 2: bordes del XML de la factura del negocio")
class FacturaNegocioXmlBordesQaTest {

    private static final String CONSECUTIVO = CLAVE.substring(21, 41);
    private final FacturaNegocioXmlValidador validador = new FacturaNegocioXmlValidador(new XmlFacturaSchemaValidator());

    private FacturaNegocioXmlValidador.Resultado validar(byte[] xml, long monto, long tolerancia) {
        return validador.validar(xml, new FacturaNegocioXmlValidador.Esperado(CED_NEGOCIO, CED_HOTCLICK, monto, tolerancia,
            c -> false));
    }

    private FacturaNegocioXmlValidador.Resultado validar(byte[] xml) { return validar(xml, 1130, 1); }

    private static String unido(FacturaNegocioXmlValidador.Resultado r) { return String.join(" | ", r.errores()); }

    /** Cambia la clave del XML (y el consecutivo, si se da) antes de firmar. */
    private static byte[] conClave(String clave, String consecutivo) {
        return firmado(x -> {
            String y = x.replace("<Clave>" + CLAVE + "</Clave>", "<Clave>" + clave + "</Clave>");
            return consecutivo == null ? y
                : y.replace("<NumeroConsecutivo>" + CONSECUTIVO + "</NumeroConsecutivo>",
                    "<NumeroConsecutivo>" + consecutivo + "</NumeroConsecutivo>");
        });
    }

    // ── tolerancia exacta ───────────────────────────────────────────────────────────────────────────────────

    @ParameterizedTest(name = "total 1130, debe {0}, tolerancia {1} -> válida={2}")
    @CsvSource({
        "1129, 1, true",   // exactamente -1: dentro
        "1131, 1, true",   // exactamente +1: dentro
        "1128, 1, false",  // -2: fuera
        "1132, 1, false",  // +2: fuera
        "1130, 0, true",   // tolerancia 0, monto exacto
        "1131, 0, false",  // tolerancia 0, un colón de diferencia
        "1131, -5, false"  // tolerancia negativa se trata como 0
    })
    @DisplayName("Tolerancia del total: el borde exacto (±tolerancia) se acepta y un colón más se rechaza")
    void toleranciaExacta(long monto, long tolerancia, boolean valida) {
        var r = validar(valido(), monto, tolerancia);
        assertThat(r.valida()).as(unido(r)).isEqualTo(valida);
        if (!valida) assertThat(unido(r)).contains("no coincide con lo que te corresponde facturar");
    }

    // ── clave dentro de un XML firmado ──────────────────────────────────────────────────────────────────────

    @ParameterizedTest(name = "clave inválida: {0}")
    @CsvSource({
        "49 dígitos, 5062708260031011234560010000101000000000119999999",
        "51 dígitos, 506270826003101123456001000010100000000011999999990",
        "con letra,  5062708260031011234560010000101000000000119999999A"
    })
    @DisplayName("Clave con largo distinto de 50 o con letras: se rechaza con mensaje claro")
    void claveLargoOLetras(String caso, String clave) {
        var r = validar(conClave(clave.trim(), null));
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("exactamente 50 dígitos");
    }

    @Test
    @DisplayName("Clave de tiquete (tipo 04 en el consecutivo): se rechaza por no ser factura")
    void claveTipoTiquete() {
        String cons = CONSECUTIVO.substring(0, 8) + "04" + CONSECUTIVO.substring(10);
        String clave = CLAVE.substring(0, 21) + cons + CLAVE.substring(41);
        var r = validar(conClave(clave, cons));
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("tipo 01").doesNotContain("consecutivo no coincide");
    }

    @Test
    @DisplayName("Clave con la cédula de otro emisor: se rechaza")
    void claveCedulaAjena() {
        String clave = CLAVE.substring(0, 9) + "003101999999" + CLAVE.substring(21);
        var r = validar(conClave(clave, null));
        assertThat(unido(r)).contains("cédula dentro de la clave");
    }

    @Test
    @DisplayName("Clave con dígito de situación 4: se rechaza")
    void claveSituacion() {
        String clave = CLAVE.substring(0, 41) + "4" + CLAVE.substring(42);
        assertThat(unido(validar(conClave(clave, null)))).contains("situación");
    }

    // ── líneas y partes ─────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Línea sin el elemento CodigoCABYS: se rechaza pidiendo CAByS")
    void lineaSinCabys() {
        var r = validar(firmado(x -> x.replace("<CodigoCABYS>4321150100101</CodigoCABYS>", "")));
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("CAByS");
    }

    @Test
    @DisplayName("Receptor del XML firmado distinto de HotClick: se rechaza")
    void receptorEquivocadoEnXml() {
        var r = validar(firmado(x -> x.replace("<Numero>" + CED_HOTCLICK + "</Numero>", "<Numero>3101888888</Numero>")));
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("a nombre de HotClick");
    }

    @Test
    @DisplayName("Factura firmada con la cédula del emisor con ceros a la izquierda: se acepta (misma cédula)")
    void emisorConCeros() {
        var r = validador.validar(valido(), new FacturaNegocioXmlValidador.Esperado("00" + CED_NEGOCIO, CED_HOTCLICK,
            1130, 1, c -> false));
        assertThat(r.errores()).isEmpty();
    }

    // ── respuesta de Hacienda ───────────────────────────────────────────────────────────────────────────────

    private static byte[] mensajeHacienda(String clave, String mensaje) {
        return ("<MensajeHacienda xmlns=\"https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda\">"
            + "<Clave>" + clave + "</Clave><NombreEmisor>NEGOCIO PRUEBA</NombreEmisor>"
            + "<Mensaje>" + mensaje + "</Mensaje><DetalleMensaje>QA</DetalleMensaje></MensajeHacienda>")
            .getBytes(StandardCharsets.UTF_8);
    }

    @Test
    @DisplayName("Respuesta de Hacienda RECHAZADO (Mensaje 3): error y estado RECHAZADO")
    void respuestaRechazada() {
        List<String> errores = new ArrayList<>();
        List<String> avisos = new ArrayList<>();
        String estado = FacturaNegocioService.revisarRespuesta(mensajeHacienda(CLAVE, "3"), CLAVE, errores, avisos);
        assertThat(estado).isEqualTo("RECHAZADO");
        assertThat(errores).singleElement().asString().contains("Hacienda no aceptó");
        assertThat(avisos).isEmpty();
    }

    @Test
    @DisplayName("Respuesta de Hacienda con prefijo de namespace y Mensaje 1: aceptada")
    void respuestaConPrefijo() {
        byte[] xml = ("<mh:MensajeHacienda xmlns:mh=\"urn:x\"><mh:Clave>" + CLAVE + "</mh:Clave><mh:Mensaje>1</mh:Mensaje>"
            + "</mh:MensajeHacienda>").getBytes(StandardCharsets.UTF_8);
        assertThat(MensajeHaciendaValidador.validar(xml, CLAVE).aceptado()).isTrue();
    }

    @Test
    @DisplayName("Respuesta de Hacienda sin Mensaje, con otra clave o sin clave de factura: no se acepta")
    void respuestaIncompleta() {
        assertThat(MensajeHaciendaValidador.validar(mensajeHacienda(CLAVE, ""), CLAVE).aceptado()).isFalse();
        assertThat(MensajeHaciendaValidador.validar(mensajeHacienda(CLAVE.replace('9', '8'), "1"), CLAVE).error())
            .contains("otra factura");
        // La factura no trajo clave legible: la respuesta no se puede emparejar.
        assertThat(MensajeHaciendaValidador.validar(mensajeHacienda(CLAVE, "1"), null).aceptado()).isFalse();
    }

    @Test
    @DisplayName("Respuesta de Hacienda con DOCTYPE (XXE): se rechaza sin expandir")
    void respuestaXxe() {
        byte[] xml = ("<?xml version=\"1.0\"?><!DOCTYPE m [<!ENTITY x SYSTEM \"file:///etc/hostname\">]>"
            + "<MensajeHacienda><Clave>&x;</Clave><Mensaje>1</Mensaje></MensajeHacienda>").getBytes(StandardCharsets.UTF_8);
        var r = MensajeHaciendaValidador.validar(xml, CLAVE);
        assertThat(r.aceptado()).isFalse();
        assertThat(r.error()).startsWith("Respuesta de Hacienda:").contains("DOCTYPE");
    }

    // ── XXE: variantes ──────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("XXE por entidad de parámetro externa: DOCTYPE rechazado")
    void xxeParametro() {
        String xml = "<?xml version=\"1.0\"?><!DOCTYPE f [<!ENTITY % p SYSTEM \"http://127.0.0.1:1/x.dtd\"> %p;]>"
            + "<FacturaElectronica/>";
        assertThat(unido(validar(xml.getBytes(StandardCharsets.UTF_8)))).contains("DOCTYPE");
    }

    @Test
    @DisplayName("XXE con DOCTYPE en UTF-16: también se rechaza")
    void xxeUtf16() {
        String xml = "<?xml version=\"1.0\" encoding=\"UTF-16\"?><!DOCTYPE f [<!ENTITY x SYSTEM \"file:///etc/passwd\">]>"
            + "<FacturaElectronica>&x;</FacturaElectronica>";
        var r = validar(xml.getBytes(StandardCharsets.UTF_16));
        assertThat(r.valida()).isFalse();
        assertThat(unido(r)).contains("DOCTYPE");
    }

    @Test
    @DisplayName("XInclude: no se procesa (el archivo referido nunca entra al documento)")
    void xinclude() {
        String xml = "<FacturaElectronica xmlns:xi=\"http://www.w3.org/2001/XInclude\">"
            + "<xi:include href=\"file:///etc/passwd\" parse=\"text\"/></FacturaElectronica>";
        Document doc = XmlSeguro.parsear(xml.getBytes(StandardCharsets.UTF_8));
        assertThat(doc.getDocumentElement().getTextContent()).isEmpty();
        assertThat(doc.getElementsByTagNameNS("http://www.w3.org/2001/XInclude", "include").getLength()).isEqualTo(1);
    }

    @Test
    @DisplayName("DOCTYPE interno sin entidades: igual se rechaza (no se permite ningún DOCTYPE)")
    void doctypeInterno() {
        String xml = "<?xml version=\"1.0\"?><!DOCTYPE FacturaElectronica><FacturaElectronica/>";
        assertThat(unido(validar(xml.getBytes(StandardCharsets.UTF_8)))).contains("DOCTYPE");
    }

    // ── tamaño ──────────────────────────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Exactamente 1 MB: no se rechaza por tamaño (el tope es estricto en más de 1 MB)")
    void tamanoExacto() {
        byte[] xml = new byte[XmlSeguro.MAX_BYTES];
        byte[] inicio = "<FacturaElectronica>".getBytes(StandardCharsets.UTF_8);
        byte[] fin = "</FacturaElectronica>".getBytes(StandardCharsets.UTF_8);
        java.util.Arrays.fill(xml, (byte) ' ');
        System.arraycopy(inicio, 0, xml, 0, inicio.length);
        System.arraycopy(fin, 0, xml, xml.length - fin.length, fin.length);
        assertThat(XmlSeguro.parsear(xml).getDocumentElement().getLocalName()).isEqualTo("FacturaElectronica");
        assertThat(unido(validar(xml))).doesNotContain("1 MB");
    }
}
