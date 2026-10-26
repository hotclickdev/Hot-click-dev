package com.hotclick.utils;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Validación de cédula CR")
class CedulaCrTest {

    @Test
    @DisplayName("Acepta 9 a 12 dígitos y quita guiones")
    void valida() {
        assertThat(CedulaCr.normalizarONulo("1-2345-0678")).isEqualTo("123450678");
        assertThat(CedulaCr.normalizarONulo("3101123456")).isEqualTo("3101123456");
        assertThat(CedulaCr.requireValida("1-1111-1111")).isEqualTo("111111111");
    }

    @Test
    @DisplayName("Rechaza vacío, letras o largo fuera de rango")
    void invalida() {
        assertThat(CedulaCr.normalizarONulo(null)).isNull();
        assertThat(CedulaCr.normalizarONulo("abc")).isNull();
        assertThat(CedulaCr.normalizarONulo("123")).isNull();
        assertThatThrownBy(() -> CedulaCr.requireValida("no-es-cedula"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Cédula inválida");
    }

    @Test
    @DisplayName("#318: realONulo descarta identificaciones internas y conserva cédulas reales")
    void realONulo() {
        assertThat(CedulaCr.realONulo("REG-1234567890abcdef")).isNull();
        assertThat(CedulaCr.realONulo("EMP-123456789012")).isNull();
        assertThat(CedulaCr.realONulo("GUEST-1234567890123")).isNull();
        assertThat(CedulaCr.realONulo("CL2abc123456789012")).isNull();
        assertThat(CedulaCr.realONulo(null)).isNull();
        assertThat(CedulaCr.realONulo("1-1234-0567")).isEqualTo("112340567");
        assertThat(CedulaCr.realONulo(" 3101123456 ")).isEqualTo("3101123456");
    }
}
