package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Número SINPE del negocio en POS")
class PosQrNumeroSinpeTest {

    @Test
    @DisplayName("Usa WhatsApp del negocio, no el de HotClick")
    void usaWhatsappDelNegocio() {
        Empresa e = new Empresa();
        e.setNumeroWhatsapp("50688881111");
        e.setTelefonoEmpresa("2222-3333");
        assertThat(PosQrSessionService.numeroSinpe(e)).isEqualTo("50688881111");
    }

    @Test
    @DisplayName("Si no hay WhatsApp, usa el teléfono del negocio")
    void usaTelefonoSiNoHayWhatsapp() {
        Empresa e = new Empresa();
        e.setTelefonoEmpresa("2222-3333");
        assertThat(PosQrSessionService.numeroSinpe(e)).isEqualTo("2222-3333");
    }

    @Test
    @DisplayName("Sin contacto no inventa el número de HotClick")
    void vacioSinFallbackHotclick() {
        assertThat(PosQrSessionService.numeroSinpe(new Empresa())).isEmpty();
        assertThat(PosQrSessionService.numeroSinpe(null)).isEmpty();
    }
}
