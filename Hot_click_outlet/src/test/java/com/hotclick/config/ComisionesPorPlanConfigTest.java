package com.hotclick.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.math.BigDecimal;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** Regresión 26-oct: comisiones 9 / 7,5 / 6 % y orden Emprendedor < PYME < Negocio Plus (fuente: application.properties). */
@DisplayName("Comisiones por plan: 9 / 7,5 / 6 % desde una sola fuente")
class ComisionesPorPlanConfigTest {

    @Test
    void comisionesYOrdenDePlanes() throws Exception {
        Properties p = new Properties();
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("application.properties")) {
            p.load(in);
        }
        BigDecimal emp = new BigDecimal(p.getProperty("hotclick.planes.emprendedor.comision-pct"));
        BigDecimal pyme = new BigDecimal(p.getProperty("hotclick.planes.pyme.comision-pct"));
        BigDecimal plus = new BigDecimal(p.getProperty("hotclick.planes.negocio-plus.comision-pct"));
        assertThat(emp).isEqualByComparingTo("9");
        assertThat(pyme).isEqualByComparingTo("7.5");
        assertThat(plus).isEqualByComparingTo("6");
        assertThat(new BigDecimal(p.getProperty("hotclick.comision.fallback.pct"))).isEqualByComparingTo(emp);

        int precioEmp = Integer.parseInt(p.getProperty("hotclick.planes.emprendedor.precio-mensual-crc"));
        int precioPyme = Integer.parseInt(p.getProperty("hotclick.planes.pyme.precio-mensual-crc"));
        int precioPlus = Integer.parseInt(p.getProperty("hotclick.planes.negocio-plus.precio-mensual-crc"));
        assertThat(precioEmp).isLessThan(precioPyme);
        assertThat(precioPyme).isLessThan(precioPlus);
    }
}
