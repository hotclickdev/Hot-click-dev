package com.hotclick.service.hacienda;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class XmlFacturaSchemaValidatorSanitizaTest {

    @Test
    void errorDelXsdNoEchaDigitosLargosDelXml() {
        XmlFacturaSchemaValidator v = new XmlFacturaSchemaValidator();
        assertThatThrownBy(() -> v.validar("<c3101000000/>", true))
            .isInstanceOf(ComprobanteInvalidoException.class)
            .satisfies(e -> assertThat(e.getMessage())
                .startsWith("El comprobante no cumple el formato oficial 4.4 de Hacienda: ")
                .doesNotContain("3101000000"));
    }
}
