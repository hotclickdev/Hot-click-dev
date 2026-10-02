package com.hotclick.service.pos;

import com.hotclick.model.Bodega;
import com.hotclick.model.Empresa;
import com.hotclick.model.PosQrSesion;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("QR de caja: el cliente elige entre los métodos habilitados")
class PosQrMetodosTest {

    @Test
    @DisplayName("Normaliza la lista, deja el principal y rechaza métodos desconocidos")
    void normaliza() {
        assertThat(PosQrMetodos.normalizar(List.of("sinpe", "TARJETA", "SINPE"), "TARJETA"))
            .containsExactly("SINPE", "TARJETA");
        assertThat(PosQrMetodos.normalizar(null, "SINPE")).containsExactly("SINPE");
        assertThat(PosQrMetodos.normalizar("TARJETA", "SINPE")).containsExactly("SINPE", "TARJETA");
        assertThatThrownBy(() -> PosQrMetodos.normalizar(List.of("EFECTIVO"), "SINPE"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Sesión anterior a V147 (sin CSV) solo habilita su metodoPago")
    void sesionVieja() {
        PosQrSesion s = sesion("TARJETA", null);
        assertThat(PosQrMetodos.deSesion(s)).containsExactly("TARJETA");
        assertThat(PosQrMetodos.habilitado(s, "SINPE")).isFalse();
    }

    @Test
    @DisplayName("El cliente cambia a un método habilitado; uno no habilitado no cambia nada")
    void eligeMetodo() {
        PosQrSesion s = sesion("TARJETA", "TARJETA,SINPE");
        PosQrVentaService.elegirMetodo(s, "SINPE");
        assertThat(s.getMetodoPago()).isEqualTo("SINPE");

        PosQrSesion soloTarjeta = sesion("TARJETA", "TARJETA");
        PosQrVentaService.elegirMetodo(soloTarjeta, "SINPE");
        assertThat(soloTarjeta.getMetodoPago()).isEqualTo("TARJETA");
    }

    @Test
    @DisplayName("Número de cobro P-<id>")
    void numeroCobro() {
        PosQrSesion s = sesion("SINPE", null);
        s.setId(3391L);
        assertThat(PosQrMetodos.numeroCobro(s)).isEqualTo("P-3391");
        assertThat(PosQrMetodos.numeroCobro(new PosQrSesion())).isNull();
    }

    static Bodega bodega(Empresa empresa, String nombre) {
        Bodega b = new Bodega();
        b.setEmpresa(empresa);
        b.setNombreBodega(nombre);
        return b;
    }

    static PosQrSesion sesion(String metodo, String habilitados) {
        Empresa empresa = new Empresa();
        empresa.setId(9L);
        empresa.setNombreComercial("Café Luna");
        PosQrSesion s = new PosQrSesion();
        s.setToken("tokqrcaja0000001");
        s.setMetodoPago(metodo);
        s.setMetodosHabilitados(habilitados);
        s.setEstado("PENDIENTE");
        s.setTotal(5000);
        s.setEmpresa(empresa);
        s.setItemsJson("[{\"nombre\":\"Mouse\",\"cantidad\":1}]");
        s.setFechaExpiracion(LocalDateTime.now(Constants.ZONA_CR).plusMinutes(10));
        return s;
    }
}
