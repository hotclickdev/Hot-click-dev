package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("VentaAvisoService — email + Telegram admin")
class VentaAvisoServiceTest {

    @Mock NotificacionEmailService notificacionEmailService;
    @Mock ModeracionAdminAvisoService moderacionAdminAvisoService;
    @InjectMocks VentaAvisoService service;

    @Test
    void avisaEmailYTelegram() {
        Pedido pedido = pedido();

        service.avisarVentaConfirmada(pedido);

        verify(notificacionEmailService).enviarConfirmacionPedido(pedido);
        verify(moderacionAdminAvisoService).avisarNuevaVenta(pedido);
    }

    @Test
    void nullNoHaceNada() {
        service.avisarVentaConfirmada(null);

        verify(notificacionEmailService, never()).enviarConfirmacionPedido(any());
        verify(moderacionAdminAvisoService, never()).avisarNuevaVenta(any());
    }

    @Test
    void emailFalla_igualAvisaTelegram() {
        Pedido pedido = pedido();
        doThrow(new RuntimeException("resend down"))
            .when(notificacionEmailService).enviarConfirmacionPedido(pedido);

        service.avisarVentaConfirmada(pedido);

        verify(moderacionAdminAvisoService).avisarNuevaVenta(pedido);
    }

    private static Pedido pedido() {
        Empresa empresa = new Empresa();
        empresa.setId(7L);
        empresa.setCorreoEmpresa("vendedor@test.cr");
        empresa.setNombreComercial("Tienda Test");
        Usuario cliente = new Usuario();
        cliente.setCorreo("cliente@test.cr");
        cliente.setNombre("Ana");
        Pedido p = new Pedido();
        p.setNumeroPedido("ORD-1");
        p.setTotalPedido(5000);
        p.setMetodoPago("EFECTIVO");
        p.setOrigen("POS");
        p.setEmpresa(empresa);
        p.setUsuarioFinal(cliente);
        return p;
    }
}
