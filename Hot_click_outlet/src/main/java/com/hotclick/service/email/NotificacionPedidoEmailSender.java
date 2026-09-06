package com.hotclick.service.email;

import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.ResendEmailService;
import com.hotclick.service.WhatsAppService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Envío de emails transaccionales relacionados con pedidos.
 * Extraído bit-idéntico de NotificacionEmailService — no cambia comportamiento.
 */
@Component
public class NotificacionPedidoEmailSender {

    private static final Logger log = LoggerFactory.getLogger(NotificacionPedidoEmailSender.class);

    @Autowired private ResendEmailService resendEmailService;
    @Autowired private WhatsAppService whatsAppService;
    @Autowired private PedidoEmailBuilder pedidoEmailBuilder;

    public void enviarConfirmacionPedido(Pedido pedido, String adminItEmail, String adminItTelefono) {
        enviarConfirmacionAlCliente(pedido);
        // Vendedor y admin siempre; no dependen de que haya usuarioFinal
        enviarNuevoPedidoAEmprendedor(pedido);
        whatsAppService.enviarNuevoPedidoAEmprendedor(pedido);
        enviarNuevoPedidoAAdminIT(pedido, adminItEmail);
        whatsAppService.enviarNuevoPedidoAAdminIT(pedido, adminItTelefono);
    }

    private void enviarConfirmacionAlCliente(Pedido pedido) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null) return;
        if (cliente.getCorreo() != null && !cliente.getCorreo().isBlank()) {
            try {
                resendEmailService.send(
                    cliente.getCorreo(),
                    "Pedido confirmado — " + pedido.getNumeroPedido(),
                    pedidoEmailBuilder.buildConfirmacionPedido(pedido, cliente)
                );
                log.info("Email confirmación enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
            } catch (Exception e) {
                log.error("No se pudo enviar email de confirmación para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
            }
        }
        whatsAppService.enviarConfirmacionPedido(pedido);
    }

    public void enviarNotificacionGuia(Pedido pedido) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null) return;
        // Email
        if (cliente.getCorreo() != null) {
            try {
                resendEmailService.send(
                    cliente.getCorreo(),
                    "Tu pedido va en camino — " + pedido.getNumeroPedido(),
                    pedidoEmailBuilder.buildNotificacionGuia(pedido, cliente)
                );
                log.info("Email guía enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
            } catch (Exception e) {
                log.error("No se pudo enviar email de guía para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
            }
        }
        // WhatsApp
        whatsAppService.enviarGuiaAsignada(pedido);
    }

    public void enviarSeguimientoEstado(Pedido pedido, String nota) {
        try { enviarSeguimientoEstadoSync(pedido, nota); }
        catch (Exception e) { log.error("No se pudo enviar email de seguimiento para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage()); }
    }

    /** Versión síncrona — lanza excepción si SendGrid falla (usar desde el endpoint /notificar). */
    public void enviarSeguimientoEstadoSync(Pedido pedido, String nota) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null || cliente.getCorreo() == null)
            throw new IllegalStateException("El pedido no tiene correo de cliente registrado");
        resendEmailService.send(
            cliente.getCorreo(),
            "Actualización de tu pedido — " + pedido.getNumeroPedido(),
            pedidoEmailBuilder.buildSeguimientoEstado(pedido, cliente, nota)
        );
        log.info("Email seguimiento enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
    }

    public void enviarRecuperacionCarrito(
            String email, String tokenRecuperacion,
            List<CarritoAbandonadoRequestDTO.CartItemDTO> items,
            String appUrl) {
        try {
            resendEmailService.send(
                email,
                "Tu carrito te espera — HotClick",
                pedidoEmailBuilder.buildRecuperacionCarrito(tokenRecuperacion, items, appUrl)
            );
            log.info("Email recuperación carrito enviado a {}", email);
        } catch (Exception e) {
            log.error("No se pudo enviar email de recuperación de carrito: {}", e.getMessage());
        }
    }

    public void enviarPagoFallido(Pedido pedido, String motivo) {
        Usuario cliente = pedido.getUsuarioFinal();
        if (cliente == null || cliente.getCorreo() == null) return;
        try {
            resendEmailService.send(
                cliente.getCorreo(),
                "Problema con tu pago — " + pedido.getNumeroPedido(),
                pedidoEmailBuilder.buildPagoFallido(pedido, cliente, motivo)
            );
            log.info("Email pago fallido enviado a {} para pedido {}", cliente.getCorreo(), pedido.getNumeroPedido());
        } catch (Exception e) {
            log.error("No se pudo enviar email de pago fallido para pedido {}: {}", pedido.getNumeroPedido(), e.getMessage());
        }
    }

    public void enviarNuevoPedidoAEmprendedor(Pedido pedido) {
        if (pedido.getEmpresa() == null) return;
        String correo = pedido.getEmpresa().getCorreoEmpresa();
        if (correo == null || correo.isBlank()) return;
        try {
            resendEmailService.send(
                correo,
                "Nueva venta — " + pedido.getNumeroPedido(),
                pedidoEmailBuilder.buildNuevoPedidoEmprendedor(pedido)
            );
            log.info("Email nueva venta enviado a emprendedor {} para pedido {}",
                correo, pedido.getNumeroPedido());
        } catch (Exception e) {
            log.error("No se pudo enviar email nueva venta a emprendedor para pedido {}: {}",
                pedido.getNumeroPedido(), e.getMessage());
        }
    }

    public void enviarNuevoPedidoAAdminIT(Pedido pedido, String correoAdminIT) {
        if (correoAdminIT == null || correoAdminIT.isBlank()) return;
        try {
            resendEmailService.send(
                correoAdminIT,
                "[ADMIN] Nuevo pedido — " + pedido.getNumeroPedido(),
                pedidoEmailBuilder.buildNuevoPedidoAdminIT(pedido)
            );
            log.info("Email nueva venta enviado a admin IT para pedido {}", pedido.getNumeroPedido());
        } catch (Exception e) {
            log.error("No se pudo enviar email nueva venta a admin IT para pedido {}: {}",
                pedido.getNumeroPedido(), e.getMessage());
        }
    }
}
