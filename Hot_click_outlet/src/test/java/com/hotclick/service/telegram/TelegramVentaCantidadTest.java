package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class TelegramVentaCantidadTest {

    @Test
    void repetirLaMismaCantidadNoLaSuma() {
        TelegramFlujoEstado e = TelegramFlujoEstado.nuevaVenta(java.time.LocalDateTime.now());
        e.setPid(8L);
        TelegramFlujoVentaTextoHelper.fijarCantidad(e, 2);
        TelegramFlujoVentaTextoHelper.fijarCantidad(e, 2);

        assertThat(e.getItemsSeguro()).hasSize(1);
        assertThat(e.getItemsSeguro().get(0).getC()).isEqualTo(2);
    }

    @Test
    void laCantidadEscritaReemplazaLaAnterior() {
        TelegramFlujoEstado e = TelegramFlujoEstado.nuevaVenta(java.time.LocalDateTime.now());
        e.setPid(8L);
        TelegramFlujoVentaTextoHelper.fijarCantidad(e, 12);
        TelegramFlujoVentaTextoHelper.fijarCantidad(e, 1);

        assertThat(e.getItemsSeguro().get(0).getC()).isEqualTo(1);
    }

    @Test
    void lineasDuplicadasNoSeSumanAlConfirmar() {
        TelegramFlujoEstado.ItemBorrador primera = new TelegramFlujoEstado.ItemBorrador(8L, 2);
        TelegramFlujoEstado.ItemBorrador segunda = new TelegramFlujoEstado.ItemBorrador(8L, 1);
        Map<Long, Integer> lineas = TelegramFlujoVentaTextoHelper.cantidadesIndicadas(List.of(primera, segunda));

        assertThat(lineas).containsEntry(8L, 1);
    }

    @Test
    void listoAceptaElBotonEscrito() {
        assertThat(TelegramFlujoProductoTextoHelper.esListo("Listo")).isTrue();
        assertThat(TelegramFlujoProductoTextoHelper.esListo("✅ Listo (2 fotos)")).isTrue();
        assertThat(TelegramFlujoProductoTextoHelper.esListo("menu")).isFalse();
    }

    @Test
    void menuSinBarraTambienAbreElMenu() {
        assertThat(TelegramMessageRoutingHelper.esMenu("Menu")).isTrue();
        assertThat(TelegramMessageRoutingHelper.esMenu("menú")).isTrue();
        assertThat(TelegramMessageRoutingHelper.esMenu("/menu")).isTrue();
        assertThat(TelegramMessageRoutingHelper.esMenu("inventario")).isFalse();
    }

    @Test
    void skuDistingueProductosConElMismoNombre() {
        assertThat(TelegramFlujoSupport.nombreConSku("Gar naranja", "GAR-8322"))
            .isEqualTo("Gar naranja (GAR-8322)");
        assertThat(TelegramFlujoSupport.nombreConSku("Gar naranja (GAR-8322)", "GAR-8322"))
            .isEqualTo("Gar naranja (GAR-8322)");
        assertThat(TelegramFlujoSupport.etiquetaConSku("Gar naranja hombre - sintético", "GAR-8322", 24))
            .startsWith("GAR-8322");
    }
}
