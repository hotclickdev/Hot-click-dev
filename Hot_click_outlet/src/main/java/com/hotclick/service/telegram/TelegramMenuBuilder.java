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
    @Autowired private TelegramFlujoSupport          flujoSupport;
    @Autowired private TelegramPlanConsulta          planConsulta;

    public void mostrarMenu(TelegramVinculacion v) {
        Long empresaId = empresaContext.empresaValidada(v);
        if (empresaId == null) return;

        boolean gestiona = flujoSupport.esPropietarioOAdmin(v.getUsuario(), empresaId);
        boolean varias = miembroEmpresaRepository.countEmpresasByUsuarioId(v.getUsuario().getId()) > 1;
        String nombre = datosQuery.nombreEmpresa(empresaId);
        bot.enviarMensaje(v.getChatId(),
            TelegramMenuOpciones.texto(datosQuery.esc(nombre), planConsulta.tieneIa(empresaId)),
            TelegramMenuOpciones.teclado(gestiona, planConsulta.tieneCrm(empresaId), varias));
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
            TelegramClienteBotService.boton("➕ Producto", "prd:new")));
        return TelegramTeclado.conMenu(teclado);
    }
}
