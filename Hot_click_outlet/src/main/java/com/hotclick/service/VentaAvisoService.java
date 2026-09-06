package com.hotclick.service;

import com.hotclick.model.Pedido;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Aviso unificado de venta confirmada:
 * email cliente (si hay correo) + email vendedor + email admin + Telegram admin.
 * Fail-safe: errores de un canal no bloquean el resto.
 */
@Service
public class VentaAvisoService {

    private static final Logger log = LoggerFactory.getLogger(VentaAvisoService.class);

    private final NotificacionEmailService notificacionEmailService;
    private final ModeracionAdminAvisoService moderacionAdminAvisoService;

    public VentaAvisoService(
            NotificacionEmailService notificacionEmailService,
            ModeracionAdminAvisoService moderacionAdminAvisoService) {
        this.notificacionEmailService = notificacionEmailService;
        this.moderacionAdminAvisoService = moderacionAdminAvisoService;
    }

    public void avisarVentaConfirmada(Pedido pedido) {
        if (pedido == null) return;
        tocarProxiesLazy(pedido);
        try {
            notificacionEmailService.enviarConfirmacionPedido(pedido);
        } catch (Exception e) {
            log.error("[venta-aviso] email falló para {}: {}", pedido.getNumeroPedido(), e.getMessage());
        }
        try {
            moderacionAdminAvisoService.avisarNuevaVenta(pedido);
        } catch (Exception e) {
            log.error("[venta-aviso] Telegram admin falló para {}: {}", pedido.getNumeroPedido(), e.getMessage());
        }
    }

    /** Evita LazyInitializationException en el hilo @Async del email. */
    private static void tocarProxiesLazy(Pedido pedido) {
        if (pedido.getUsuarioFinal() != null) {
            pedido.getUsuarioFinal().getCorreo();
            pedido.getUsuarioFinal().getNombre();
        }
        if (pedido.getEmpresa() != null) {
            pedido.getEmpresa().getCorreoEmpresa();
            pedido.getEmpresa().getNombreComercial();
            pedido.getEmpresa().getNombreEmpresa();
        }
    }
}
