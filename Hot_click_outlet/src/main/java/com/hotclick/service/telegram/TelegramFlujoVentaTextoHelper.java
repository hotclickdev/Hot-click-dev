package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Empresa;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Texto del flujo de venta rápida — extraído bit-idéntico de {@link TelegramFlujoVentaHandler}.
 */
@Component
class TelegramFlujoVentaTextoHelper {

    private static final Logger log = LoggerFactory.getLogger(TelegramFlujoVentaTextoHelper.class);

    @Autowired private TelegramFlujoSupport              support;
    @Autowired @Lazy private TelegramFlujoService        flujo;
    @Autowired private TelegramClienteBotService          bot;
    @Autowired private UsuarioRepository                  usuarioRepository;
    @Autowired private EmpresaRepository                  empresaRepository;
    @Autowired private TelegramFlujoVentaCatalogHelper    catalog;
    @Autowired private TelegramFlujoVentaConfirmHelper  confirm;

    void manejarPaso(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        switch (e.getP()) {
            case P_VTA_CANTIDAD -> manejarCantidad(v, empresaId, e, texto);
            case P_VTA_CLIENTE_BUSCAR -> manejarBuscarCliente(v, empresaId, texto);
            case P_VTA_CLIENTE_NUEVO -> manejarClienteNuevo(v, empresaId, e, texto);
            default -> bot.enviarMensaje(v.getChatId(),
                "Usá los botones del mensaje anterior para continuar, o /cancelar para salir.");
        }
    }

    private void manejarCantidad(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        Integer cant = parseEntero(texto, 1, 1_000_000);
        if (cant == null) {
            bot.enviarMensaje(v.getChatId(), "Esperaba una cantidad (ej: 2). Escribila de nuevo o /cancelar.");
            return;
        }
        Map<String, Object> prod = catalog.productoVendible(e.getPid(), empresaId);
        if (prod == null) {
            e.setPid(null);
            e.setP(P_VTA_PRODUCTO);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "Ese producto ya no está disponible. Elegí otro:");
            catalog.mostrarPaginaProductos(v, empresaId, 0);
            return;
        }
        int disp = ((Number) prod.get("disp")).intValue();
        if (cant > disp) {
            bot.enviarMensaje(v.getChatId(), "Solo hay *" + disp + "* disponibles de *"
                + esc((String) prod.get("nombre_producto")) + "*. Escribí una cantidad menor o /cancelar.");
            return;
        }
        TelegramFlujoEstado.ItemBorrador existente = e.getItemsSeguro().stream()
            .filter(i -> e.getPid().equals(i.getPid())).findFirst().orElse(null);
        if (existente != null) existente.setC(existente.getC() + cant);
        else e.getItemsSeguro().add(new TelegramFlujoEstado.ItemBorrador(e.getPid(), cant));
        e.setPid(null);
        e.setP(P_VTA_PRODUCTO);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(),
            "Agregado: *" + cant + " × " + esc((String) prod.get("nombre_producto")) + "*\n\n" + catalog.resumenItems(e, empresaId),
            List.of(List.of(
                TelegramClienteBotService.boton("➕ Agregar otro", "vta:add"),
                TelegramClienteBotService.boton("✅ Continuar", "vta:cont")),
                List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
    }

    private void manejarBuscarCliente(TelegramVinculacion v, Long empresaId, String texto) {
        if (texto.length() < 2) {
            bot.enviarMensaje(v.getChatId(), "Escribí al menos 2 letras para buscar.");
            return;
        }
        List<Usuario> encontrados = usuarioRepository.buscarClientesByEmpresa(texto, empresaId);
        if (encontrados.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "No encontré clientes con \"" + esc(texto) + "\".", List.of(
                List.of(TelegramClienteBotService.boton("➕ Crearlo como nuevo", "vta:clinew"),
                        TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli"))));
            return;
        }
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        encontrados.stream().limit(6).forEach(c -> teclado.add(List.of(
            TelegramClienteBotService.boton(recortar(support.nombreCompleto(c), 40), "vta:cli:" + c.getId()))));
        teclado.add(List.of(TelegramClienteBotService.boton("➕ Cliente nuevo", "vta:clinew"),
                            TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli")));
        bot.enviarMensaje(v.getChatId(), "¿Cuál de estos es?", teclado);
    }

    private void manejarClienteNuevo(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        String[] nombreTel = separarNombreTelefono(texto);
        if (nombreTel[0].isBlank()) {
            bot.enviarMensaje(v.getChatId(), "Necesito al menos el nombre (ej: _Ana Mora 8888-8888_).");
            return;
        }
        try {
            Empresa empresa = empresaRepository.findById(empresaId).orElse(null);
            Usuario nuevo = flujo.crearClienteTx(nombreTel[0], nombreTel[1], empresa);
            e.setCli(nuevo.getId());
            bot.enviarMensaje(v.getChatId(), "Cliente *" + esc(support.nombreCompleto(nuevo)) + "* registrado ✅");
            confirm.mostrarResumenVenta(v, empresaId, e);
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo creando cliente en chat {} — {}", v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude registrar el cliente. Probá de nuevo o tocá *Sin cliente*.",
                List.of(List.of(TelegramClienteBotService.boton("🚫 Sin cliente", "vta:nocli"))));
        }
    }
}
