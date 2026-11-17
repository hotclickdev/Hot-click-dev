package com.hotclick.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class WhatsappNegocioTest {
    @Test
    void rechazaTextoYNormalizaPrefijo() {
        assertThatThrownBy(() -> EmpresaPerfilService.normalizarWhatsapp("QA-TEST abc"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> EmpresaPerfilService.normalizarWhatsapp("8888"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThat(EmpresaPerfilService.normalizarWhatsapp("+506 0000-0002")).isEqualTo("50600000002");
        assertThat(EmpresaPerfilService.normalizarWhatsapp("00000002")).isEqualTo("00000002");
        assertThat(EmpresaPerfilService.normalizarWhatsapp("+1 305 555 1234")).isEqualTo("+13055551234");
        assertThat(EmpresaPerfilService.normalizarWhatsapp(" ")).isNull();
    }
}
