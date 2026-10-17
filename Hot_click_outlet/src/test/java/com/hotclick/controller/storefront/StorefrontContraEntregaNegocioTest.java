package com.hotclick.controller.storefront;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StorefrontContraEntregaNegocioTest {

    private static Empresa empresa(boolean acepta, Integer minimo) {
        Empresa e = new Empresa();
        e.setAceptaContraEntrega(acepta);
        e.setContraEntregaMinimoCrc(minimo);
        return e;
    }

    private static Bodega bodega(boolean aceptaEfectivo) {
        Bodega b = new Bodega();
        b.setAceptaEfectivo(aceptaEfectivo);
        return b;
    }

    @Test
    void negocioNoAcepta_400() {
        assertThatThrownBy(() -> StorefrontGuestOrderService.exigirContraEntregaNegocio(
                "EFECTIVO", bodega(false), "DOMICILIO", empresa(false, null), 10000))
            .isInstanceOf(IllegalArgumentException.class)
            .extracting("codigo").isEqualTo("CONTRA_ENTREGA_NO_ACEPTADA");
    }

    @Test
    void bajoMinimo_400_yEnMinimoPasa() {
        assertThatThrownBy(() -> StorefrontGuestOrderService.exigirContraEntregaNegocio(
                "EFECTIVO", bodega(false), "DOMICILIO", empresa(true, 3000), 2999))
            .isInstanceOf(IllegalArgumentException.class)
            .extracting("codigo").isEqualTo("CONTRA_ENTREGA_MINIMO");
        assertThatCode(() -> StorefrontGuestOrderService.exigirContraEntregaNegocio(
                "EFECTIVO", bodega(false), "DOMICILIO", empresa(true, 3000), 3000)).doesNotThrowAnyException();
    }

    @Test
    void bodegaAceptaEfectivo_retiroYOtrosMetodos_noAplican() {
        assertThatCode(() -> StorefrontGuestOrderService.exigirContraEntregaNegocio(
                "EFECTIVO", bodega(true), "DOMICILIO", empresa(false, null), 1)).doesNotThrowAnyException();
        assertThatCode(() -> StorefrontGuestOrderService.exigirContraEntregaNegocio(
                "EFECTIVO", bodega(false), "RETIRO", empresa(false, null), 1)).doesNotThrowAnyException();
        assertThatCode(() -> StorefrontGuestOrderService.exigirContraEntregaNegocio(
                "SINPE", bodega(false), "DOMICILIO", empresa(false, null), 1)).doesNotThrowAnyException();
    }

    @Test
    void handlerGlobal_400ConCodigoEstable() {
        var r = new com.hotclick.config.GlobalExceptionHandler().handleContraEntrega(
            new com.hotclick.exception.ContraEntregaNoDisponibleException("CONTRA_ENTREGA_MINIMO"));
        org.assertj.core.api.Assertions.assertThat(r.getStatusCode().value()).isEqualTo(400);
        @SuppressWarnings("unchecked")
        java.util.Map<String, Object> body = (java.util.Map<String, Object>) r.getBody();
        org.assertj.core.api.Assertions.assertThat(body).containsEntry("code", "CONTRA_ENTREGA_MINIMO")
            .containsEntry("data", java.util.Map.of("codigo", "CONTRA_ENTREGA_MINIMO"));
    }
}
