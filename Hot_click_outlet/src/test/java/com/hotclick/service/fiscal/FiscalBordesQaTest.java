package com.hotclick.service.fiscal;

import com.hotclick.service.HaciendaContribuyenteService.ContribuyenteDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** QA: bordes de cédula, nombres de Hacienda con tildes o sufijos, y comisión por plan con redondeo. Datos ficticios. */
@DisplayName("QA base fiscal: casos borde (cédula, nombre de Hacienda, comisión)")
class FiscalBordesQaTest {

    private static final BigDecimal EXTRA = new BigDecimal("14.00");

    @Test
    @DisplayName("Cédula: límites exactos por tipo y formatos con guiones o espacios")
    void cedulaLimites() {
        // física: 9 dígitos, sin 0 inicial
        assertThat(CedulaFiscal.normalizar("100000000")).isEqualTo("100000000");
        assertThat(CedulaFiscal.normalizar("999999999")).isEqualTo("999999999");
        assertThat(CedulaFiscal.normalizar("000000001")).isNull();
        assertThat(CedulaFiscal.normalizar("1-11111-1111")).isNull(); // 10 dígitos que no empiezan con 3
        assertThat(CedulaFiscal.normalizar("1-1111-1111")).isEqualTo("111111111");
        // jurídica: 10 dígitos que empiezan con 3
        assertThat(CedulaFiscal.normalizar("3-101-123456")).isEqualTo("3101123456");
        assertThat(CedulaFiscal.normalizar("3 101 123456")).isEqualTo("3101123456");
        assertThat(CedulaFiscal.normalizar("4101123456")).isNull();
        assertThat(CedulaFiscal.normalizar("0101123456")).isNull();
        // DIMEX: 11 o 12
        assertThat(CedulaFiscal.normalizar("12345678901")).isEqualTo("12345678901");
        assertThat(CedulaFiscal.normalizar("123456789012")).isEqualTo("123456789012");
        // fuera de rango: 8 y 13 dígitos
        assertThat(CedulaFiscal.normalizar("12345678")).isNull();
        assertThat(CedulaFiscal.normalizar("1234567890123")).isNull();
        // basura
        assertThat(CedulaFiscal.normalizar(null)).isNull();
        assertThat(CedulaFiscal.normalizar("   ")).isNull();
        assertThat(CedulaFiscal.normalizar("31011234AB")).isNull();
        assertThat(CedulaFiscal.normalizar("-3101123456")).isNull();
    }

    private static ContribuyenteDTO hacienda(String nombre) {
        return new ContribuyenteDTO("3101123456", nombre, "02", "Inscrito", "Régimen Tradicional", true,
            List.of("4711 Venta al por menor de ropa"));
    }

    @Test
    @DisplayName("Nombre de Hacienda con tildes, eñes y sufijo societario distinto coincide")
    void nombreTildesYSufijos() {
        assertThat(FiscalVerificacionAuto.nombreParecido("Distribuidora Ñandú S.A.", "DISTRIBUIDORA NANDU SOCIEDAD ANONIMA")).isTrue();
        assertThat(FiscalVerificacionAuto.nombreParecido("Café José Ltda", "CAFE JOSE LIMITADA")).isTrue();
        assertThat(FiscalVerificacionAuto.nombreParecido("Café José S.R.L.", "CAFÉ JOSÉ SOCIEDAD DE RESPONSABILIDAD LIMITADA")).isTrue();
        assertThat(FiscalVerificacionAuto.nombreParecido("María  Pérez-Núñez", "PEREZ NUNEZ MARIA")).isTrue();
        assertThat(FiscalVerificacionAuto.nombreParecido("Tienda Luna S.A.", "TIENDA SOL S.A.")).isFalse();
        // solo ruido societario: no hay palabras comparables, nunca coincide
        assertThat(FiscalVerificacionAuto.nombreParecido("S.A.", "S.A.")).isFalse();
        assertThat(FiscalVerificacionAuto.nombreParecido(null, "ALGO")).isFalse();
        assertThat(FiscalVerificacionAuto.nombreParecido("Algo", null)).isFalse();
    }

    @Test
    @DisplayName("comparar(): nombre con tildes coincide completo; otro nombre da NO_COINCIDE con la diferencia 'nombre'")
    void compararConNombres() {
        var ok = FiscalVerificacionAuto.comparar(hacienda("VENTAS ÁLVAREZ Y HIJOS S.A."),
            SituacionFiscal.INSCRITO, "Ventas Alvarez e Hijos", "4711 ropa");
        assertThat(ok.estado()).isEqualTo(FiscalVerificacionAuto.COINCIDE);
        var mal = FiscalVerificacionAuto.comparar(hacienda("OTRA EMPRESA COMPLETAMENTE S.A."),
            SituacionFiscal.INSCRITO, "Ventas Alvarez", "4711 ropa");
        assertThat(mal.estado()).isEqualTo(FiscalVerificacionAuto.NO_COINCIDE);
        assertThat(mal.detalle()).contains("nombre");
    }

    @Test
    @DisplayName("Comisión por plan (9, 7.5, 6): sin verificar suma 14; verificado paga solo el plan")
    void comisionPorPlan() {
        Object[][] casos = {{"9", "23.00", "9.00"}, {"7.5", "21.50", "7.50"}, {"6", "20.00", "6.00"}};
        for (Object[] c : casos) {
            BigDecimal plan = new BigDecimal((String) c[0]);
            for (SituacionFiscal s : new SituacionFiscal[] {null, SituacionFiscal.NO_INSCRITO}) {
                // nunca se quita el extra a un no inscrito, ni siquiera "verificado"
                assertThat(ComisionEfectiva.calcular(plan, s, true, EXTRA).efectivaPct()).isEqualByComparingTo((String) c[1]);
                assertThat(ComisionEfectiva.calcular(plan, s, false, EXTRA).efectivaPct()).isEqualByComparingTo((String) c[1]);
            }
            for (SituacionFiscal s : new SituacionFiscal[] {SituacionFiscal.INSCRITO, SituacionFiscal.REGIMEN_SIMPLIFICADO}) {
                assertThat(ComisionEfectiva.calcular(plan, s, false, EXTRA).efectivaPct()).isEqualByComparingTo((String) c[1]);
                var v = ComisionEfectiva.calcular(plan, s, true, EXTRA);
                assertThat(v.efectivaPct()).isEqualByComparingTo((String) c[2]);
                assertThat(v.extraPct()).isEqualByComparingTo("0.00");
            }
        }
    }

    @Test
    @DisplayName("Comisión: siempre 2 decimales, redondeo HALF_UP y valores negativos o nulos como 0")
    void comisionRedondeo() {
        var d = ComisionEfectiva.calcular(new BigDecimal("7.505"), SituacionFiscal.NO_INSCRITO, false, new BigDecimal("14.004"));
        assertThat(d.planPct()).isEqualByComparingTo("7.51");
        assertThat(d.extraPct()).isEqualByComparingTo("14.00");
        assertThat(d.efectivaPct().scale()).isEqualTo(2);
        assertThat(d.efectivaPct()).isEqualByComparingTo("21.51");
        var h = ComisionEfectiva.calcular(new BigDecimal("7.5"), SituacionFiscal.NO_INSCRITO, false, new BigDecimal("14.005"));
        assertThat(h.extraPct()).isEqualByComparingTo("14.01");
        assertThat(h.efectivaPct()).isEqualByComparingTo("21.51");
        var n = ComisionEfectiva.calcular(null, null, false, new BigDecimal("-3"));
        assertThat(n.efectivaPct()).isEqualByComparingTo("0.00");
        assertThat(n.efectivaPct().scale()).isEqualTo(2);
        assertThat(ComisionEfectiva.calcular(new BigDecimal("9"), SituacionFiscal.INSCRITO, true, null).efectivaPct()).isEqualByComparingTo("9.00");
    }
}
