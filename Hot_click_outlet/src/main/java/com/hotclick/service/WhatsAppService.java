package com.hotclick.service;

import com.hotclick.model.Pedido;
import com.hotclick.model.Usuario;
import com.hotclick.service.whatsapp.WaPlantilla;
import com.hotclick.service.whatsapp.WhatsAppHelpers;
import com.hotclick.service.whatsapp.WhatsAppMessageSender;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Envía mensajes de WhatsApp via Meta Cloud API.
 * Si WHATSAPP_PHONE_ID o WHATSAPP_TOKEN no están configurados,
 * simula el envío (log en BD con estado SIMULADO) para poder
 * desarrollar y probar sin credenciales reales.
 *
 * Flujo: contexto del cliente → WaPlantilla aleatoria → Gemini personaliza → Meta API envía
 */
@Service
public class WhatsAppService {

    @Autowired private GeminiService geminiService;
    @Autowired private WhatsAppMessageSender messageSender;

    // ── API pública ───────────────────────────────────────────────────────────

    @Async
    public void enviarConfirmacionPedido(Pedido pedido) {
        Usuario u = pedido.getUsuarioFinal();
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",       u.getNombre());
        ctx.put("numeroPedido", pedido.getNumeroPedido());
        ctx.put("total",        WhatsAppHelpers.CRC.format(pedido.getTotalPedido()));
        ctx.put("productos",    WhatsAppHelpers.resumirProductos(pedido.getItems()));
        ctx.put("segmento",     WhatsAppHelpers.segmento(u));

        messageSender.enviar(u, pedido.getEmpresaId(), pedido.getNumeroPedido(),
               WaPlantilla.varianteAleatoria("CONFIRMACION_PEDIDO"), ctx);
    }

    @Async
    public void enviarGuiaAsignada(Pedido pedido) {
        Usuario u = pedido.getUsuarioFinal();
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",       u.getNombre());
        ctx.put("numeroPedido", pedido.getNumeroPedido());
        ctx.put("guia",         pedido.getNumeroGuia() != null ? pedido.getNumeroGuia() : "N/D");
        ctx.put("courier",      pedido.getUrlTracking() != null
                                && pedido.getUrlTracking().contains("correos") ? "Correos CR" : "HOTCLICK");

        messageSender.enviar(u, pedido.getEmpresaId(), pedido.getNumeroPedido(),
               WaPlantilla.varianteAleatoria("GUIA_ASIGNADA"), ctx);
    }

    @Async
    public void enviarSolicitudResena(Pedido pedido) {
        Usuario u = pedido.getUsuarioFinal();
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",    u.getNombre());
        ctx.put("productos", WhatsAppHelpers.resumirProductos(pedido.getItems()));
        ctx.put("puntos",    String.valueOf(u.getPuntosFidelidad()));
        ctx.put("segmento",  WhatsAppHelpers.segmento(u));

        messageSender.enviar(u, pedido.getEmpresaId(), pedido.getNumeroPedido(),
               WaPlantilla.varianteAleatoria("POST_ENTREGA_RESENA"), ctx);
    }

    @Async
    public void enviarCarritoAbandonado(Usuario u, Long empresaId, String productos) {
        if (u == null || u.getTelefono() == null) return;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",    u.getNombre());
        ctx.put("productos", productos);

        messageSender.enviar(u, empresaId, null,
               WaPlantilla.varianteAleatoria("CARRITO_ABANDONADO"), ctx);
    }

    @Async
    public void enviarReactivacion(Usuario u, Long empresaId, String ultimoProducto) {
        if (u == null || u.getTelefono() == null) return;

        long dias = u.getFechaUltimoAcceso() != null
            ? ChronoUnit.DAYS.between(u.getFechaUltimoAcceso(), LocalDateTime.now(Constants.ZONA_CR))
            : 60;

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",        u.getNombre());
        ctx.put("diasInactivo",  String.valueOf(dias));
        ctx.put("productos",     ultimoProducto != null ? ultimoProducto : "productos variados");
        ctx.put("puntos",        String.valueOf(u.getPuntosFidelidad()));
        ctx.put("segmento",      WhatsAppHelpers.segmento(u));

        messageSender.enviar(u, empresaId, null,
               WaPlantilla.varianteAleatoria("REACTIVACION"), ctx);
    }

    @Async
    public void enviarNuevoPedidoAEmprendedor(Pedido pedido) {
        if (pedido.getEmpresa() == null) return;
        String tel = pedido.getEmpresa().getNumeroWhatsapp() != null
            ? pedido.getEmpresa().getNumeroWhatsapp()
            : pedido.getEmpresa().getTelefonoEmpresa();
        if (tel == null || tel.isBlank()) return;

        Map<String, String> ctx = WhatsAppHelpers.contextoEmprendedor(pedido);
        messageSender.enviarANumero(tel, pedido.getEmpresaId(), pedido.getNumeroPedido(),
            WaPlantilla.varianteAleatoria("NUEVO_PEDIDO_EMPRENDEDOR"), ctx);
    }

    @Async
    public void enviarNuevoPedidoAAdminIT(Pedido pedido, String telefonoAdminIT) {
        if (telefonoAdminIT == null || telefonoAdminIT.isBlank()) return;

        Map<String, String> ctx = WhatsAppHelpers.contextoEmprendedor(pedido);
        if (pedido.getUsuarioFinal() != null)
            ctx.put("nombreCliente", pedido.getUsuarioFinal().getNombre() != null
                ? pedido.getUsuarioFinal().getNombre() : "Invitado");
        else
            ctx.put("nombreCliente", "Invitado");

        messageSender.enviarANumero(telefonoAdminIT, pedido.getEmpresaId(), pedido.getNumeroPedido(),
            WaPlantilla.varianteAleatoria("NUEVO_PEDIDO_ADMIN"), ctx);
    }

    /**
     * Envío manual desde el CRM — admite cualquier escenario y contexto adicional.
     * Devuelve el texto enviado para mostrarlo en el timeline del CRM.
     */
    public String enviarDesdecrm(Usuario u, Long empresaId, String escenario,
                                  Map<String, String> ctxExtra) {
        if (u.getTelefono() == null) throw new IllegalStateException("El cliente no tiene teléfono registrado");

        Map<String, String> ctx = new LinkedHashMap<>();
        ctx.put("nombre",   u.getNombre());
        ctx.put("segmento", WhatsAppHelpers.segmento(u));
        ctx.put("puntos",   String.valueOf(u.getPuntosFidelidad()));
        if (ctxExtra != null) ctx.putAll(ctxExtra);

        WaPlantilla plantilla = WaPlantilla.varianteAleatoria(escenario);
        return messageSender.enviar(u, empresaId, null, plantilla, ctx);
    }
}
