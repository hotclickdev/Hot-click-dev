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
        assertThat(EmpresaPerfilService.normalizarWhatsapp("+506 8888-1234")).isEqualTo("50688881234");
        assertThat(EmpresaPerfilService.normalizarWhatsapp("88881234")).isEqualTo("88881234");
        assertThat(EmpresaPerfilService.normalizarWhatsapp("+1 305 555 1234")).isEqualTo("+13055551234");
        assertThat(EmpresaPerfilService.normalizarWhatsapp(" ")).isNull();
    }
}
