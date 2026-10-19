package com.hotclick.service.pos;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SINPE fuera del QR del POS: el número del negocio no se expone")
class PosQrNumeroSinpeTest {

    @Test
    @DisplayName("Con WhatsApp y teléfono cargados, el destino SINPE sigue vacío")
    void vacioAunqueHayaContacto() {
        Empresa e = new Empresa();
        e.setNumeroWhatsapp("WHATSAPP-DE-PRUEBA");
        e.setTelefonoEmpresa("TELEFONO-DE-PRUEBA");
        assertThat(PosQrSessionService.numeroSinpe(e)).isEmpty();
    }

    @Test
    @DisplayName("Sin contacto o sin empresa tampoco inventa un número")
    void vacioSinContacto() {
        assertThat(PosQrSessionService.numeroSinpe(new Empresa())).isEmpty();
        assertThat(PosQrSessionService.numeroSinpe(null)).isEmpty();
    }
}
