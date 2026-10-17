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
        p.setClienteTel("88887777");
        assertThat(PedidoDetailMapper.nombreCliente(p)).isEqualTo("Ana Mora");
        assertThat(PedidoDetailMapper.telefonoCliente(p)).isEqualTo("88887777");
    }

    @Test
    void sinDatosDeInvitadoUsaLaCuenta() {
        Usuario u = new Usuario();
        u.setNombre("Luis");
        u.setTelefono("61234567");
        Pedido p = new Pedido();
        p.setUsuarioFinal(u);
        assertThat(PedidoDetailMapper.nombreCliente(p)).isEqualTo("Luis");
        assertThat(PedidoDetailMapper.telefonoCliente(p)).isEqualTo("61234567");
    }
}
