package com.hotclick.service.telegram;

import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.MiembroEmpresaRepository;
import com.hotclick.service.TelegramClienteBotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class TelegramMenuBuilder {

    @Autowired private TelegramClienteBotService     bot;
    @Autowired private MiembroEmpresaRepository      miembroEmpresaRepository;
    @Autowired private TelegramEmpresaContextService empresaContext;
    @Autowired private TelegramDatosQueryService     datosQuery;

    public void mostrarMenu(TelegramVinculacion v) {
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return;

        String nombre = datosQuery.nombreEmpresa(empresaId);
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        teclado.add(List.of(
            TelegramClienteBotService.boton("📦 Inventario", "inv"),
            TelegramClienteBotService.boton("💰 Ventas de hoy", "ventas")));
        teclado.add(List.of(TelegramClienteBotService.boton("📊 Finanzas del mes", "fin")));
        teclado.add(List.of(
            TelegramClienteBotService.boton("🛒 Nueva venta", "vta:new"),
            TelegramClienteBotService.boton("➕ Nuevo producto", "prd:new")));
        teclado.add(List.of(TelegramClienteBotService.boton("👥 Clientes", "cli:pg:0")));
        if (miembroEmpresaRepository.countEmpresasByUsuarioId(v.getUsuario().getId()) > 1) {
            teclado.add(List.of(TelegramClienteBotService.boton("🔄 Cambiar negocio", "selector")));
        }
        bot.enviarMensaje(v.getChatId(),
            "*" + datosQuery.esc(nombre) + "*\n¿Qué querés ver? También podés escribirme una pregunta libre "
            + "(ej: _¿cuál producto se vende más?_) y te respondo con los datos reales del negocio.",
            teclado);
    }

    /** Botones rápidos tras cada respuesta libre de la IA — cubren los seguimientos
     *  más comunes sin obligar a escribir de nuevo. Mismos códigos que el menú
     *  principal, para no duplicar rutas de callback. */
    public List<List<Map<String, Object>>> tecladoRespuestaIa() {
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        teclado.add(List.of(
            TelegramClienteBotService.boton("📦 Inventario", "inv"),
            TelegramClienteBotService.boton("💰 Ventas de hoy", "ventas")));
        teclado.add(List.of(
            TelegramClienteBotService.boton("🛒 Nueva venta", "vta:new"),
            TelegramClienteBotService.boton("➕ Nuevo producto", "prd:new")));
        return teclado;
    }
}
