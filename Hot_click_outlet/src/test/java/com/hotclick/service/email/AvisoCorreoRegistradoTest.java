package com.hotclick.service.email;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.ArrayList;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("S4-19 — aviso de iniciar sesión solo dentro del correo de confirmación")
class AvisoCorreoRegistradoTest {

    private static final String AVISO = "Este correo ya tiene cuenta en HotClick";

    private final ConfirmacionPedidoEmailBuilder builder = new ConfirmacionPedidoEmailBuilder();

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(builder, "layout", new EmailLayoutHelper());
    }

    private static Pedido pedido(Usuario cliente) {
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-S419");
        p.setSubtotal(1000);
        p.setCostoEnvio(0);
        p.setTotalPedido(1000);
        p.setMetodoEnvio(Constants.ENVIO_RETIRO);
        p.setItems(new ArrayList<>());
        p.setUsuarioFinal(cliente);
        return p;
    }

    private static Usuario usuario(String identificacion) {
        Usuario u = new Usuario();
        u.setNombre("Ana");
        u.setIdentificacion(identificacion);
        return u;
    }

    @Test
    void cuentaRegistrada_incluyeAvisoConEnlaceALogin() {
        Usuario u = usuario("114560789");
        String html = builder.buildConfirmacionPedido(pedido(u), u);
        assertThat(html).contains(AVISO).contains("/login?redirect=%2Fmis-pedidos");
    }

    @Test
    void invitado_sinAviso() {
        Usuario u = usuario("GUEST-abc123def4567");
        assertThat(builder.buildConfirmacionPedido(pedido(u), u)).doesNotContain(AVISO);
    }

    @Test
    void sinIdentificacion_sinAviso() {
        Usuario u = usuario(null);
        assertThat(builder.buildConfirmacionPedido(pedido(u), u)).doesNotContain(AVISO);
        assertThat(ConfirmacionPedidoEmailBuilder.esCuentaRegistrada(null)).isFalse();
    }
}
