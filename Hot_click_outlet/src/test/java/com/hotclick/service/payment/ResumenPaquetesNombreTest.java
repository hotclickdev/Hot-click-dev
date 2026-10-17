package com.hotclick.service.payment;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Resumen del checkout: nombre comercial del negocio (misma regla que EmpresaNombre), nunca la bodega. */
class ResumenPaquetesNombreTest {

    @Test
    void usaNombreComercialYNoLaBodega() {
        Empresa e = new Empresa();
        e.setNombreEmpresa("Sol Sociedad Anónima");
        e.setNombreComercial("Café Sol");
        Bodega b = new Bodega();
        b.setNombreBodega("Bodega interna");
        Pedido p = new Pedido();
        p.setEmpresa(e);
        p.setBodega(b);
        assertThat(CheckoutGrupoFactory.resumen(List.of(p)).get(0).tienda()).isEqualTo("Café Sol");

        Pedido sinEmpresa = new Pedido();
        sinEmpresa.setBodega(b);
        assertThat(CheckoutGrupoFactory.resumen(List.of(sinEmpresa)).get(0).tienda()).isEqualTo("HotClick");
    }
}
