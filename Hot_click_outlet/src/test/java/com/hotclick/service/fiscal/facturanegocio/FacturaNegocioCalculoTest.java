package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.VentaProducto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Fase 2: reglas puras de la factura del negocio")
class FacturaNegocioCalculoTest {

    @Test
    @DisplayName("Quincena cerrada: el 1 es la del 16 al fin del mes anterior; el 16 es la del 1 al 15")
    void quincenaCerrada() {
        var a = FacturaNegocioCalculo.quincenaCerrada(LocalDate.of(2026, 3, 1));
        assertThat(a.desde()).isEqualTo(LocalDate.of(2026, 2, 16));
        assertThat(a.hasta()).isEqualTo(LocalDate.of(2026, 2, 28));
        var b = FacturaNegocioCalculo.quincenaCerrada(LocalDate.of(2026, 3, 16));
        assertThat(b.desde()).isEqualTo(LocalDate.of(2026, 3, 1));
        assertThat(b.hasta()).isEqualTo(LocalDate.of(2026, 3, 15));
        var c = FacturaNegocioCalculo.quincenaCerrada(LocalDate.of(2026, 1, 10));
        assertThat(c.desde()).isEqualTo(LocalDate.of(2025, 12, 16));
        assertThat(c.hasta()).isEqualTo(LocalDate.of(2025, 12, 31));
    }

    @Test
    @DisplayName("Fecha límite: fin de quincena + 7 días; días restantes nunca negativos")
    void plazo() {
        assertThat(FacturaNegocioCalculo.fechaLimite(LocalDate.of(2026, 3, 15), 7)).isEqualTo(LocalDate.of(2026, 3, 22));
        assertThat(FacturaNegocioCalculo.diasRestantes(LocalDate.of(2026, 3, 20), LocalDate.of(2026, 3, 22))).isEqualTo(2);
        assertThat(FacturaNegocioCalculo.diasRestantes(LocalDate.of(2026, 3, 25), LocalDate.of(2026, 3, 22))).isZero();
    }

    @Test
    @DisplayName("Le corresponde facturar solo al INSCRITO verificado; los demás quedan NO_APLICA")
    void situaciones() {
        assertThat(FacturaNegocioCalculo.leCorrespondeFacturar("INSCRITO", true)).isTrue();
        assertThat(FacturaNegocioCalculo.leCorrespondeFacturar("INSCRITO", false)).isFalse();
        assertThat(FacturaNegocioCalculo.leCorrespondeFacturar(null, true)).isFalse();
        assertThat(FacturaNegocioCalculo.leCorrespondeFacturar("NO_INSCRITO", true)).isFalse();
        assertThat(FacturaNegocioCalculo.leCorrespondeFacturar("REGIMEN_SIMPLIFICADO", true)).isFalse();
        assertThat(FacturaNegocioCalculo.leCorrespondeFacturar("REGIMEN_SIMPLIFICADO", false)).isFalse();
        assertThat(FacturaNegocioCalculo.leCorrespondeFacturar("raro", true)).isFalse();
    }

    @Test
    @DisplayName("NETO = productos - comisión; BRUTO = productos; nunca negativo")
    void montos() {
        assertThat(FacturaNegocioCalculo.monto("NETO", 10_000, 900)).isEqualTo(9_100);
        assertThat(FacturaNegocioCalculo.monto("BRUTO", 10_000, 900)).isEqualTo(10_000);
        assertThat(FacturaNegocioCalculo.monto("NETO", 100, 900)).isZero();
    }

    @Test
    @DisplayName("Desglose por producto: suma exactamente el monto y marca el CAByS válido")
    void reparto() {
        var lineas = FacturaNegocioCalculo.repartir(List.of(
            new VentaProducto(1L, "A", "4321150100101", 1, 3333),
            new VentaProducto(2L, "B", null, 2, 3333),
            new VentaProducto(3L, "C", "123", 1, 3334)), 9_101);
        assertThat(lineas.stream().mapToLong(FacturaNegocioCalculo.LineaDesglose::monto).sum()).isEqualTo(9_101);
        assertThat(lineas.get(0).cabysValido()).isTrue();
        assertThat(lineas.get(1).cabysValido()).isFalse();
        assertThat(lineas.get(2).cabysValido()).isFalse();
        assertThat(FacturaNegocioCalculo.repartir(List.of(), 100)).isEmpty();
    }

    @Test
    @DisplayName("Plazo del mensaje receptor: 8 días hábiles desde el primer día hábil del mes siguiente")
    void plazoMensajeReceptor() {
        // Marzo 2026: el 1 es domingo → primer hábil lunes 2; el 8.º hábil es miércoles 11.
        assertThat(FacturaNegocioCalculo.plazoMensajeReceptor(LocalDate.of(2026, 2, 28))).isEqualTo(LocalDate.of(2026, 3, 11));
        // Abril 2026: el 1 es miércoles → 1,2,3,6,7,8,9,10 → viernes 10.
        assertThat(FacturaNegocioCalculo.plazoMensajeReceptor(LocalDate.of(2026, 3, 15))).isEqualTo(LocalDate.of(2026, 4, 10));
    }

    @Test
    @DisplayName("Respuesta de Hacienda: ACEPTADO con la misma clave; rechazada, otra clave u otro documento fallan")
    void respuestaHacienda() {
        String clave = FacturaNegocioXmlValidadorTest.CLAVE;
        assertThat(MensajeHaciendaValidador.validar(mh(clave, "1"), clave).aceptado()).isTrue();
        var rechazada = MensajeHaciendaValidador.validar(mh(clave, "3"), clave);
        assertThat(rechazada.aceptado()).isFalse();
        assertThat(rechazada.estado()).isEqualTo("RECHAZADO");
        assertThat(MensajeHaciendaValidador.validar(mh(clave, "1"), clave.replace('9', '8')).error()).contains("otra factura");
        assertThat(MensajeHaciendaValidador.validar("<Otro/>".getBytes(StandardCharsets.UTF_8), clave).error())
            .contains("MensajeHacienda");
        String xxe = "<!DOCTYPE m [<!ENTITY x SYSTEM \"file:///etc/hosts\">]><MensajeHacienda>&x;</MensajeHacienda>";
        assertThat(MensajeHaciendaValidador.validar(xxe.getBytes(StandardCharsets.UTF_8), clave).error()).contains("DOCTYPE");
    }

    static byte[] mh(String clave, String mensaje) {
        return ("<MensajeHacienda xmlns=\"https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/mensajeHacienda\">"
            + "<Clave>" + clave + "</Clave><NombreEmisor>Negocio</NombreEmisor><Mensaje>" + mensaje + "</Mensaje>"
            + "<DetalleMensaje>Prueba</DetalleMensaje></MensajeHacienda>").getBytes(StandardCharsets.UTF_8);
    }
}
