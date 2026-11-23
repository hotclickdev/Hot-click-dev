package com.hotclick.service.telegram;

import com.hotclick.model.Empresa;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Telegram del comprador: un negocio en borrador no se ofrece ni vende")
class TelegramCompradorAltaFasesTest {

    static Empresa tienda(boolean ventaOnline, boolean porFases) {
        Empresa e = new Empresa();
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        e.setAltaPorFases(porFases);
        e.setVentaOnlineHabilitada(ventaOnline);
        return e;
    }

    @Test
    void borradorNoEsTiendaPublica() {
        assertThat(TelegramCompradorService.tiendaPublica(tienda(false, true))).isFalse();
        assertThat(TelegramCompradorService.tiendaPublica(tienda(true, true))).isTrue();
        assertThat(TelegramCompradorService.tiendaPublica(tienda(true, false))).isTrue();
    }

    @Test
    void cuentaPerdidaTampocoEsTiendaPublica() {
        Empresa e = tienda(true, true);
        e.setVentaOnlineHabilitada(false); // el poller la baja cuando la cuenta deja de estar ACTIVA
        assertThat(TelegramCompradorService.tiendaPublica(e)).isFalse();
    }
}
