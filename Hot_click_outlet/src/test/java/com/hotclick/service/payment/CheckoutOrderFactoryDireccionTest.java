package com.hotclick.service.payment;

import com.hotclick.model.Pedido;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("B17: dirección de entrega guardada en el pedido")
class CheckoutOrderFactoryDireccionTest {

    @Mock PedidoRepository pedidoRepository;
    @InjectMocks CheckoutOrderFactory factory;

    @Test
    @DisplayName("Normaliza espacios y saltos, y corta a 500 caracteres")
    void normaliza() {
        assertThat(CheckoutOrderFactory.direccionDeEntrega("  Casa azul\n\tEscazú,  San José ", "ENVIO_NORMAL_GAM"))
            .isEqualTo("Casa azul Escazú, San José");
        assertThat(CheckoutOrderFactory.direccionDeEntrega("x".repeat(600), "ENVIO_RAPIDO")).hasSize(500);
        assertThat(CheckoutOrderFactory.direccionDeEntrega("   ", "ENVIO_RAPIDO")).isNull();
    }

    @Test
    @DisplayName("Retiro en tienda no guarda dirección")
    void retiroSinDireccion() {
        Pedido pedido = new Pedido();
        pedido.setMetodoEnvio(Constants.ENVIO_RETIRO);
        factory.aplicarDireccion(pedido, "Casa azul, Escazú");
        assertThat(pedido.getDireccionEntrega()).isNull();
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    @DisplayName("Paquete con envío guarda la dirección")
    void envioGuarda() {
        Pedido pedido = new Pedido();
        pedido.setMetodoEnvio("ENVIO_NORMAL_FUERA_GAM");
        factory.aplicarDireccion(pedido, "Del parque 100 m sur, Liberia, Guanacaste");
        assertThat(pedido.getDireccionEntrega()).isEqualTo("Del parque 100 m sur, Liberia, Guanacaste");
        verify(pedidoRepository).save(pedido);
    }
}
