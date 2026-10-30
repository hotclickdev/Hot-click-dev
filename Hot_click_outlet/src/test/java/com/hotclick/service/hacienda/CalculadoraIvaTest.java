package com.hotclick.service.hacienda;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CalculadoraIva — M4: régimen simplificado vs tradicional")
class CalculadoraIvaTest {

    private static final BigDecimal TRECE = new BigDecimal("13.00");

    private static Empresa empresa(String regimen) {
        Empresa e = new Empresa();
        if (regimen != null) e.setRegimenIva(regimen);
        return e;
    }

    @Test
    @DisplayName("una tienda nueva es SIMPLIFICADO por defecto")
    void defaultSimplificado() {
        assertThat(new Empresa().getRegimenIva()).isEqualTo("SIMPLIFICADO");
        Empresa e = new Empresa();
        e.setRegimenIva(null);
        assertThat(CalculadoraIva.regimen(e)).isEqualTo(CalculadoraIva.SIMPLIFICADO);
    }

    @Test
    @DisplayName("simplificado + tiquete: se cobra el precio tal cual")
    void simplificadoTiquete() {
        var lineas = List.of(new CalculadoraIva.Linea(1000, 3, TRECE));
        assertThat(CalculadoraIva.ivaACobrar(empresa(null), false, lineas)).isZero();
        assertThat(CalculadoraIva.totalComprobante(empresa(null), false, lineas)).isEqualTo(3000);
    }

    @Test
    @DisplayName("simplificado + factura: precio + 13 % = total del XML")
    void simplificadoFactura() {
        var lineas = List.of(new CalculadoraIva.Linea(1000, 1, TRECE), new CalculadoraIva.Linea(2500, 2, TRECE));
        long iva = CalculadoraIva.ivaACobrar(empresa("SIMPLIFICADO"), true, lineas);
        assertThat(iva).isEqualTo(780);
        assertThat(CalculadoraIva.totalComprobante(empresa("SIMPLIFICADO"), true, lineas)).isEqualTo(6000 + iva);
    }

    @Test
    @DisplayName("HALF_UP: 1005 × 13 % = 130,65 → 131; 1001 → 130")
    void redondeoHalfUp() {
        assertThat(CalculadoraIva.linea(empresa(null), true, new CalculadoraIva.Linea(1005, 1, TRECE)).impuesto()).isEqualTo(131);
        assertThat(CalculadoraIva.linea(empresa(null), true, new CalculadoraIva.Linea(1001, 1, TRECE)).impuesto()).isEqualTo(130);
    }

    @Test
    @DisplayName("tradicional: no suma IVA al cobro; el XML lo desglosa dentro del precio")
    void tradicional() {
        var l = new CalculadoraIva.Linea(1130, 1, TRECE);
        assertThat(CalculadoraIva.ivaACobrar(empresa("TRADICIONAL"), true, List.of(l))).isZero();
        var m = CalculadoraIva.linea(empresa("TRADICIONAL"), true, l);
        assertThat(m.base()).isEqualTo(1000);
        assertThat(m.impuesto()).isEqualTo(130);
    }

    @Test
    @DisplayName("exento no suma IVA ni en factura")
    void exento() {
        assertThat(CalculadoraIva.ivaACobrar(empresa(null), true,
            List.of(new CalculadoraIva.Linea(1000, 1, BigDecimal.ZERO)))).isZero();
    }
}
