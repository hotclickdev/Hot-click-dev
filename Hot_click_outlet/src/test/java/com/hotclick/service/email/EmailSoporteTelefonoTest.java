package com.hotclick.service.email;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class EmailSoporteTelefonoTest {

    @Test void sinTelefono_elPieNoMuestraWhatsapp() {
        String pie = new EmailLayoutHelper().footer("¿Dudas?");
        assertThat(pie).doesNotContain("wa.me", "WhatsApp").contains("Respondé este correo");
    }

    @Test void conTelefono_usaElValorConfigurado() {
        EmailLayoutHelper l = new EmailLayoutHelper();
        ReflectionTestUtils.setField(l, "telefonoSoporte", "+000 0000 0000");
        assertThat(l.footer("¿Dudas?")).contains("https://wa.me/00000000000", ">+000 0000 0000</a>");
    }
}
