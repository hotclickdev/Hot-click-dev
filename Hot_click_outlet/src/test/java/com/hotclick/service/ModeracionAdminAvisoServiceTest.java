package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ModeracionAdminAvisoService — push ops fail-safe")
class ModeracionAdminAvisoServiceTest {

    @Mock TelegramService telegramService;
    @InjectMocks ModeracionAdminAvisoService service;

    @Test
    void avisarEmpresa_enviaTelegram() {
        service.avisarEmpresaPendiente(7L, "Tienda Test");
        verify(telegramService).enviar(contains("Negocio pendiente"));
    }

    @Test
    void avisarNuevaVenta_enviaTelegram() {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-99");
        pedido.setTotalPedido(3500);
        pedido.setMetodoPago("TARJETA");
        pedido.setOrigen("WEB");
        Empresa empresa = new Empresa();
        empresa.setNombreComercial("Cafe CR");
        pedido.setEmpresa(empresa);

        service.avisarNuevaVenta(pedido);

        verify(telegramService).enviar(contains("NUEVA VENTA"));
        verify(telegramService).enviar(contains("ORD-99"));
    }

    @Test
    @DisplayName("M9: el aviso de venta no lleva datos del cliente (nombre, correo, teléfono) ni la etiqueta «Cliente»")
    void avisarNuevaVenta_sinDatosDelCliente() {
        Pedido pedido = new Pedido();
        pedido.setNumeroPedido("ORD-77");
        pedido.setTotalPedido(9900);
        pedido.setMetodoPago("SINPE");
        pedido.setOrigen("WEB");
        pedido.setClienteNombre("Canaria Cliente Prueba");
        pedido.setClienteTel("00000002");
        com.hotclick.model.Usuario comprador = new com.hotclick.model.Usuario();
        comprador.setNombre("Canario Comprador");
        comprador.setCorreo("canario.venta@example.invalid");
        pedido.setUsuarioFinal(comprador);
        Empresa empresa = new Empresa();
        empresa.setNombreComercial("Cafe CR");
        pedido.setEmpresa(empresa);

        service.avisarNuevaVenta(pedido);

        org.mockito.ArgumentCaptor<String> c = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(telegramService).enviar(c.capture());
        org.assertj.core.api.Assertions.assertThat(c.getValue())
            .contains("ORD-77")
            .doesNotContain("Canaria").doesNotContain("Canario").doesNotContain("Cliente")
            .doesNotContain("canario.venta").doesNotContain("example.invalid").doesNotContain("@")
            .doesNotContain("00000002")
            .doesNotContainPattern("[\\w.+-]+@[\\w-]+(\\.[\\w-]+)+");
    }

    @Test
    void telegramFalla_noPropaga() {
        doThrow(new RuntimeException("down")).when(telegramService).enviar(anyString());
        service.avisarPayout(1L, 2L, 5000L);
        verify(telegramService).enviar(contains("Retiro solicitado"));
    }
}
