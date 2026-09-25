package com.hotclick.service.telegram;

import com.hotclick.service.TelegramClienteBotService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Botones del menú según rol y plan. Sin acceso a Spring para poder testearlo. */
final class TelegramMenuOpciones {

    private TelegramMenuOpciones() {}

    static String texto(String nombreEmpresa, boolean preguntasLibres) {
        String base = "*" + nombreEmpresa + "*\n¿Qué querés ver?";
        if (!preguntasLibres) return base;
        return base + " También podés escribirme una pregunta libre "
            + "(ej: _¿cuál producto se vende más?_) y te respondo con los datos reales del negocio.";
    }

    static List<List<Map<String, Object>>> teclado(boolean gestiona, boolean crm, boolean variasEmpresas) {
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        teclado.add(List.of(
            TelegramClienteBotService.boton("📦 Inventario", "inv"),
            TelegramClienteBotService.boton("💰 Ventas de hoy", "ventas")));
        teclado.add(List.of(TelegramClienteBotService.boton("📊 Finanzas del mes", "fin")));
        if (gestiona) {
            teclado.add(List.of(TelegramClienteBotService.boton("🛒 Nueva venta", "vta:new")));
            teclado.add(List.of(
                TelegramClienteBotService.boton("➕ Producto", "prd:new"),
                TelegramClienteBotService.boton("🎨 Personalizado", "prd:pers")));
        }
        if (crm) {
            teclado.add(List.of(TelegramClienteBotService.boton("👥 Clientes", "cli:pg:0")));
        }
        if (variasEmpresas) {
            teclado.add(List.of(TelegramClienteBotService.boton("🔄 Cambiar negocio", "selector")));
        }
        return teclado;
    }
}
