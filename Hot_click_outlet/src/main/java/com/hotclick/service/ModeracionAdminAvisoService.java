package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Push al canal ops/admin (TelegramService) cuando entra un ítem a la bandeja.
 * Fail-safe: nunca propaga errores al flujo de creación.
 * No confundir con {@link ModeracionAvisoService} (avisos al vendedor).
 */
@Service
public class ModeracionAdminAvisoService {

    private static final Logger log = LoggerFactory.getLogger(ModeracionAdminAvisoService.class);
    private static final String LINK = "https://hotclick.lat/admin/aprobaciones";
    private static final String LINK_PEDIDOS = "https://hotclick.lat/admin/pedidos";

    private final TelegramService telegramService;

    public ModeracionAdminAvisoService(TelegramService telegramService) {
        this.telegramService = telegramService;
    }

    public void avisarEmpresaPendiente(Long empresaId, String nombre) {
        enviar("🏪 *Negocio pendiente*\n\n"
            + esc(nombre != null ? nombre : "Empresa") + " (id " + empresaId + ")\n"
            + LINK);
    }

    public void avisarReporteProducto(Long reporteId, String productoNombre) {
        enviar("🚩 *Producto reportado*\n\n"
            + esc(productoNombre != null ? productoNombre : "Producto") + " · reporte #" + reporteId + "\n"
            + "https://hotclick.lat/admin/reportes-producto");
    }

    public void avisarPayout(Long payoutId, Long empresaId, long monto) {
        enviar("💸 *Retiro solicitado*\n\n"
            + "₡" + String.format("%,d", monto) + " · empresa " + empresaId + " · payout #" + payoutId + "\n"
            + "https://hotclick.lat/admin/payouts");
    }

    public void avisarRecoleccion(Long solicitudId, String empresaNombre) {
        enviar("🛵 *Recolección pendiente*\n\n"
            + esc(empresaNombre != null ? empresaNombre : "Empresa") + " · #" + solicitudId + "\n"
            + "https://hotclick.lat/admin/recolecciones");
    }

    /** Aviso ops de una venta confirmada (checkout o POS). */
    public void avisarNuevaVenta(Pedido pedido) {
        if (pedido == null) return;
        enviar("🛒 *NUEVA VENTA*\n\n"
            + "*Negocio:* " + esc(nombreEmpresa(pedido.getEmpresa())) + "\n"
            + "*Cliente:* " + esc(nombreCliente(pedido.getUsuarioFinal())) + "\n"
            + "*Pedido:* " + esc(pedido.getNumeroPedido() != null ? pedido.getNumeroPedido() : "—") + "\n"
            + "*Total:* ₡" + String.format("%,d", pedido.getTotalPedido() != null ? pedido.getTotalPedido() : 0) + "\n"
            + "*Pago:* " + esc(pedido.getMetodoPago() != null ? pedido.getMetodoPago() : "—") + "\n"
            + "*Origen:* " + esc(pedido.getOrigen() != null ? pedido.getOrigen() : "—") + "\n"
            + LINK_PEDIDOS);
    }

    private void enviar(String mensaje) {
        try {
            telegramService.enviar(mensaje);
        } catch (Exception e) {
            log.error("[moderacion-admin] fallo aviso Telegram — {}", e.getMessage());
        }
    }

    private static String nombreEmpresa(Empresa empresa) {
        if (empresa == null) return "Sin negocio";
        if (empresa.getNombreComercial() != null && !empresa.getNombreComercial().isBlank()) {
            return empresa.getNombreComercial();
        }
        return empresa.getNombreEmpresa() != null ? empresa.getNombreEmpresa() : "Empresa";
    }

    private static String nombreCliente(Usuario cliente) {
        if (cliente == null) return "Mostrador";
        if (cliente.getNombre() != null && !cliente.getNombre().isBlank()) return cliente.getNombre();
        return cliente.getCorreo() != null ? cliente.getCorreo() : "Cliente";
    }

    private static String esc(String s) {
        return s.replace("*", "").replace("_", "").replace("`", "");
    }
}
