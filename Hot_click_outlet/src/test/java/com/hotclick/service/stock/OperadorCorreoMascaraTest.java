package com.hotclick.service.stock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SEC-02 — máscara del correo del operador de stock")
class OperadorCorreoMascaraTest {

    @Test
    void dejaInicialYDominio() {
        assertThat(OperadorCorreoMascara.enmascarar("vendedor@hotclick.test")).isEqualTo("v***@hotclick.test");
        assertThat(OperadorCorreoMascara.enmascarar("  ana.perez@correo.cr ")).isEqualTo("a***@correo.cr");
    }

    @Test
    void casosBorde() {
        assertThat(OperadorCorreoMascara.enmascarar(null)).isNull();
        assertThat(OperadorCorreoMascara.enmascarar("")).isEmpty();
        assertThat(OperadorCorreoMascara.enmascarar("telegram-bot")).isEqualTo("***");
        assertThat(OperadorCorreoMascara.enmascarar("@dominio.cr")).isEqualTo("***@dominio.cr");
        assertThat(OperadorCorreoMascara.enmascarar("x@y.cr")).isEqualTo("x***@y.cr");
    }
}
