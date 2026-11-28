package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("paraCobro: solo un grupo de un único negocio puede cobrarse a nombre de su cuenta conectada")
class CheckoutGrupoParaCobroTest {

    private static Pedido pedido(long id, Long empresaId) {
        Pedido p = new Pedido();
        p.setId(id);
        if (empresaId != null) {
            Empresa e = new Empresa();
            e.setId(empresaId);
            p.setEmpresa(e);
        }
        return p;
    }

    @Test
    @DisplayName("Un negocio: la copia lleva los ids de todos los pedidos del grupo")
    void unNegocio() {
        Pedido a = pedido(1, 7L), b = pedido(2, 7L);
        Pedido cobro = CheckoutGrupoFactory.paraCobro(a, 50_000, List.of(a, b));
        assertThat(cobro.getIdsGrupoMismoNegocio()).containsExactly(1L, 2L);
        assertThat(cobro.getTotalPedido()).isEqualTo(50_000);
    }

    @Test
    @DisplayName("Dos negocios (o uno sin empresa): lista vacía, nunca onBehalfOf")
    void variosNegocios() {
        Pedido a = pedido(1, 7L), b = pedido(2, 8L), sinEmpresa = pedido(3, null);
        assertThat(CheckoutGrupoFactory.paraCobro(a, 50_000, List.of(a, b)).getIdsGrupoMismoNegocio()).isEmpty();
        assertThat(CheckoutGrupoFactory.paraCobro(sinEmpresa, 1_000, List.of(sinEmpresa)).getIdsGrupoMismoNegocio()).isEmpty();
    }

    @Test
    @DisplayName("La variante de dos argumentos sigue siendo un pedido suelto")
    void pedidoSuelto() {
        Pedido a = pedido(1, 7L);
        assertThat(CheckoutGrupoFactory.paraCobro(a, 9_000).getIdsGrupoMismoNegocio()).containsExactly(1L);
    }
}
