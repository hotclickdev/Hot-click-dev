package com.hotclick.service.pedido;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PedidoDetailMapperClienteTest {

    @Test
    void invitadoDeTiendaMuestraLoQueEscribio() {
        Usuario proxy = new Usuario();
        proxy.setNombre("Invitado");
        Pedido p = new Pedido();
        p.setUsuarioFinal(proxy);
        p.setClienteNombre("Ana Mora");
        p.setClienteTel("00000004");
        assertThat(PedidoDetailMapper.nombreCliente(p)).isEqualTo("Ana Mora");
        assertThat(PedidoDetailMapper.telefonoCliente(p)).isEqualTo("00000004");
    }

    @Test
    void sinDatosDeInvitadoUsaLaCuenta() {
        Usuario u = new Usuario();
        u.setNombre("Luis");
        u.setTelefono("00000008");
        Pedido p = new Pedido();
        p.setUsuarioFinal(u);
        assertThat(PedidoDetailMapper.nombreCliente(p)).isEqualTo("Luis");
        assertThat(PedidoDetailMapper.telefonoCliente(p)).isEqualTo("00000008");
    }
}
