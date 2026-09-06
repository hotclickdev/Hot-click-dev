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
    void telegramFalla_noPropaga() {
        doThrow(new RuntimeException("down")).when(telegramService).enviar(anyString());
        service.avisarPayout(1L, 2L, 5000L);
        verify(telegramService).enviar(contains("Retiro solicitado"));
    }
}
