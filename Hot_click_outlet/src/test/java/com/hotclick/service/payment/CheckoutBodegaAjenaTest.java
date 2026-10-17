package com.hotclick.service.payment;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Producto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("CMP-4 | bodega de otro negocio en el checkout")
class CheckoutBodegaAjenaTest {

    private static Empresa empresa(long id) { Empresa e = new Empresa(); e.setId(id); return e; }
    private static Bodega bodega(long empresaId) { Bodega b = new Bodega(); b.setEmpresa(empresa(empresaId)); return b; }
    private static Producto producto(long empresaId) { Producto p = new Producto(); p.setEmpresa(empresa(empresaId)); return p; }
    private static PaymentCheckoutRequest req(Long bodegaId) { PaymentCheckoutRequest r = new PaymentCheckoutRequest(); r.setBodegaId(bodegaId); return r; }

    @Test
    void bodegaDeOtroNegocioDa400() {
        assertThatThrownBy(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(54L), Map.of(578L, producto(53)), bodega(52)))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void bodegaPropiaOSinBodegaPasa() {
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(54L), Map.of(577L, producto(52)), bodega(52))).doesNotThrowAnyException();
        assertThatCode(() -> CheckoutGrupoFactory.exigirBodegaDeLaTienda(req(null), Map.of(578L, producto(53)), bodega(1))).doesNotThrowAnyException();
    }
}
