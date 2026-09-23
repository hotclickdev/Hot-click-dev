package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TextModerationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

@Component
class TelegramFlujoProductoTextoHelper {

    @Autowired private TelegramFlujoSupport          support;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private TextModerationService         textModerationService;
    @Autowired private TelegramFlujoProductoUiHelper ui;
    @Autowired private TelegramFlujoProductoConfirmHelper confirm;

    void manejarPaso(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        switch (e.getP()) {
            case P_PRD_NOMBRE -> manejarNombre(v, e, d, texto);
            case P_PRD_DESCRIPCION -> manejarDescripcion(v, e, d, texto);
            case P_PRD_PRECIO_MIN -> manejarPrecioMin(v, e, d, texto);
            case P_PRD_PRECIO_MAX -> manejarPrecioMax(v, e, d, texto);
            case P_PRD_PRECIO_VENTA -> manejarPrecioVenta(v, e, d, texto);
            case P_PRD_PRECIO_COMPRA -> manejarPrecioCompra(v, e, d, texto);
            case P_PRD_INSTR -> manejarInstrucciones(v, e, d, texto);
            case P_PRD_STOCK -> manejarStock(v, empresaId, e, d, texto);
            case P_PRD_MARCA_TEXTO -> {
                d.setMarcaTxt(texto.length() > 100 ? texto.substring(0, 100) : texto);
                ui.irAPasoFotos(v, e);
            }
            case P_PRD_FOTOS -> manejarListo(v, empresaId, e, d, texto);
            default -> bot.enviarMensaje(v.getChatId(),
                "Usá los botones del mensaje anterior para continuar, o /cancelar para salir.",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
        }
    }

    void despuesDeDescripcion(TelegramVinculacion v, TelegramFlujoEstado e) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        if (d.esPersonalizado()) {
            e.setP(P_PRD_MODO);
            support.guardar(v, e);
            ui.mostrarModosPrecio(v);
            return;
        }
        e.setP(P_PRD_PRECIO_VENTA);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(),
            "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)",
            TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
    }

    private void manejarListo(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        if (!esListo(texto)) {
            bot.enviarMensaje(v.getChatId(),
                "Usá los botones del mensaje anterior para continuar, o /cancelar para salir.",
                TelegramTeclado.conMenu(ui.tecladoFotos(d.getFotos().size())));
            return;
        }
        if (d.getFotos().isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "Mandá al menos una foto del producto para continuar.",
                TelegramTeclado.conMenu(ui.tecladoFotos(0)));
            return;
        }
        confirm.mostrarResumenProducto(v, empresaId, e);
    }

    static boolean esListo(String texto) {
        return texto != null && "listo".equalsIgnoreCase(texto.trim());
    }

    private void manejarNombre(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        if (texto.length() < 3 || texto.length() > 200) {
            bot.enviarMensaje(v.getChatId(), "El nombre debe tener entre 3 y 200 caracteres. Escribilo de nuevo:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        if (!textModerationService.moderar(texto).safe()) {
            bot.enviarMensaje(v.getChatId(), "Ese nombre no está permitido en la plataforma. Escribí otro:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setNom(texto);
        e.setP(P_PRD_DESCRIPCION);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "Descripción corta (máx 255 caracteres):", List.of(
            List.of(TelegramClienteBotService.boton("⏭ Omitir", "prd:skip"),
                    TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)),
            List.of(TelegramTeclado.botonMenu())));
    }

    private void manejarDescripcion(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        String desc = texto.length() > 255 ? texto.substring(0, 255) : texto;
        if (!textModerationService.moderar(desc).safe()) {
            bot.enviarMensaje(v.getChatId(),
                "Esa descripción no está permitida en la plataforma. Escribí otra u *Omitir*:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setDesc(desc);
        despuesDeDescripcion(v, e);
    }

    private void manejarPrecioMin(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer min = parseEntero(texto, 1, 100_000_000);
        if (min == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un precio mínimo en colones (ej: 5000). Escribilo de nuevo:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setPmin(min);
        e.setP(P_PRD_PRECIO_MAX);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "¿Precio máximo del rango? (colones)",
            TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
    }

    private void manejarPrecioMax(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer max = parseEntero(texto, 1, 100_000_000);
        if (max == null || d.getPmin() == null || max < d.getPmin()) {
            bot.enviarMensaje(v.getChatId(), "El máximo debe ser un número mayor o igual al mínimo. Escribilo de nuevo:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setPmax(max);
        d.setPv(d.getPmin());
        d.setPc(0);
        e.setP(P_PRD_INSTR);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(),
            "Instrucciones para el cliente (cómo personalizar). Máx 3000 caracteres, o tocá *Omitir*.",
            List.of(
                List.of(TelegramClienteBotService.boton("⏭ Omitir", "prd:skipinstr")),
                List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR), TelegramTeclado.botonMenu())));
    }

    private void manejarPrecioVenta(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer pv = parseEntero(texto, 1, 100_000_000);
        if (pv == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un precio en colones (ej: 8500). Escribilo de nuevo:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setPv(pv);
        e.setP(P_PRD_PRECIO_COMPRA);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(),
            "¿Cuánto te costó a vos? (precio de compra en colones — sirve para calcular tu ganancia)",
            TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
    }

    private void manejarPrecioCompra(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer pc = parseEntero(texto, 0, 100_000_000);
        if (pc == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un número en colones (ej: 5000). Escribilo de nuevo:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setPc(pc);
        if (d.esPersonalizado()) {
            e.setP(P_PRD_INSTR);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(),
                "Instrucciones para el cliente (cómo personalizar). Máx 3000 caracteres, o tocá *Omitir*.",
                List.of(
                    List.of(TelegramClienteBotService.boton("⏭ Omitir", "prd:skipinstr")),
                    List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR), TelegramTeclado.botonMenu())));
            return;
        }
        e.setP(P_PRD_STOCK);
        support.guardar(v, e);
        String aviso = avisoCostoMayorVenta(pc, d.getPv());
        bot.enviarMensaje(v.getChatId(), aviso + "¿Cuántas unidades tenés en stock?",
            TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
    }

    private void manejarInstrucciones(TelegramVinculacion v, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        String instr = texto.length() > 3000 ? texto.substring(0, 3000) : texto;
        if (!textModerationService.moderar(instr).safe()) {
            bot.enviarMensaje(v.getChatId(), "Ese texto no está permitido. Escribí otras instrucciones u *Omitir*.",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setInstr(instr);
        e.setP(P_PRD_STOCK);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(), "¿Cuántas unidades tenés en stock? (para personalizado puede ser 0)",
            TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
    }

    private void manejarStock(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e,
            TelegramFlujoEstado.ProductoBorrador d, String texto) {
        Integer stk = parseEntero(texto, 0, 1_000_000);
        if (stk == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba un número (ej: 10). Escribilo de nuevo:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        d.setStk(stk);
        e.setP(P_PRD_CATEGORIA);
        support.guardar(v, e);
        ui.mostrarCategorias(v, empresaId, 0);
    }

    private static String avisoCostoMayorVenta(Integer pc, Integer precioVenta) {
        int pv = precioVenta != null ? precioVenta : 0;
        if (pc > pv) {
            return "⚠️ Ojo: el costo es mayor que el precio de venta — venderías con pérdida.\n\n";
        }
        return "";
    }
}
