package com.hotclick.service.sinpe;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** S2 · Contra entrega por negocio en el checkout multi-negocio: la valida el backend, no solo la UI. */
class ContraEntregaNegocioCheckoutTest {

    private static Pedido pedido(boolean bodegaAcepta, boolean negocioAcepta, Integer minimo, int subtotal) {
        Bodega bodega = new Bodega();
        bodega.setAceptaEfectivo(bodegaAcepta);
        Empresa e = new Empresa();
        e.setAceptaContraEntrega(negocioAcepta);
        e.setContraEntregaMinimoCrc(minimo);
        Pedido p = new Pedido();
        p.setBodega(bodega);
        p.setEmpresa(e);
        p.setMetodoEnvio("ENVIO_NORMAL_GAM");
        p.setSubtotal(subtotal);
        return p;
    }

    @Test
    void unNegocioNoAcepta_seRechazaTodoElPedido() {
        assertThatThrownBy(() -> SinpeCheckoutService.exigirEfectivoAceptado("EFECTIVO",
                List.of(pedido(false, true, null, 1000), pedido(false, false, null, 1000)), true))
            .isInstanceOf(com.hotclick.exception.ContraEntregaNoDisponibleException.class)
            .extracting("codigo").isEqualTo("CONTRA_ENTREGA_NO_ACEPTADA");
    }

    @Test
    void bajoElMinimo_seRechaza_yEnElMinimoPasa() {
        assertThatThrownBy(() -> SinpeCheckoutService.exigirEfectivoAceptado("EFECTIVO",
                List.of(pedido(false, true, 5000, 4999)), true))
            .isInstanceOf(com.hotclick.exception.ContraEntregaNoDisponibleException.class)
            .extracting("codigo").isEqualTo("CONTRA_ENTREGA_MINIMO");
        assertThatCode(() -> SinpeCheckoutService.exigirEfectivoAceptado("EFECTIVO",
                List.of(pedido(false, true, 5000, 5000)), true)).doesNotThrowAnyException();
    }

    @Test
    void bodegaQueAceptaEfectivo_noDependeDeLaConfigDeContraEntrega() {
        assertThatCode(() -> SinpeCheckoutService.exigirEfectivoAceptado("EFECTIVO",
                List.of(pedido(true, false, null, 10)), true)).doesNotThrowAnyException();
    }

    @Test
    void otrosMetodos_noSeRevisan() {
        assertThatCode(() -> SinpeCheckoutService.exigirEfectivoAceptado("SINPE",
                List.of(pedido(false, false, null, 10)), true)).doesNotThrowAnyException();
    }
}
