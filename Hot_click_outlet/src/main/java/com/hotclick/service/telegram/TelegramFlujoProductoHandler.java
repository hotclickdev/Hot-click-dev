package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Categoria;
import com.hotclick.model.Marca;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TenantService;
import com.hotclick.service.TextModerationService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Flujo de alta de producto (con fotos) del bot de Telegram.
 * Extraído bit-idéntico de TelegramFlujoService — las TX van por el proxy {@code flujo}.
 */
@Service
public class TelegramFlujoProductoHandler {

    @Autowired private TelegramFlujoSupport               support;
    @Autowired private TelegramClienteBotService          bot;
    @Autowired private BodegaRepository                   bodegaRepository;
    @Autowired private CategoriaRepository                  categoriaRepository;
    @Autowired private MarcaRepository                      marcaRepository;
    @Autowired private TenantService                        tenantService;
    @Autowired private TextModerationService                textModerationService;
    @Autowired private TelegramFlujoProductoUiHelper       ui;
    @Autowired private TelegramFlujoProductoConfirmHelper  confirm;

    public void callback(TelegramVinculacion v, Long empresaId, String sub) {
        if ("new".equals(sub)) {
            if (support.denegarSiNoGestiona(v, empresaId)) return;
            if (bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO).isEmpty()) {
                bot.enviarMensaje(v.getChatId(), "Tu negocio no tiene bodegas activas. Creá una desde el panel antes de publicar productos.");
                return;
            }
            try {
                tenantService.verificarLimiteProductos(empresaId);
            } catch (RuntimeException ex) {
                bot.enviarMensaje(v.getChatId(), esc(ex.getMessage()));
                return;
            }
            support.guardar(v, TelegramFlujoEstado.nuevoProducto(support.ahora()));
            bot.enviarMensaje(v.getChatId(), "➕ *Nuevo producto*\n\n¿Cómo se llama? (3 a 200 caracteres)\n\nEscribí /cancelar en cualquier momento para salir.");
            return;
        }

        TelegramFlujoEstado e = support.estadoVigente(v);
        if (e == null || !FLUJO_PRODUCTO.equals(e.getF())) {
            bot.enviarMensaje(v.getChatId(), "Ese botón ya no está vigente. Escribí /menu para empezar de nuevo.");
            return;
        }
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();

        if ("skip".equals(sub) && P_PRD_DESCRIPCION.equals(e.getP())) {
            e.setP(P_PRD_PRECIO_VENTA);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)");
        } else if (sub.startsWith("catpg:")) {
            Integer pg = parseEntero(sub.substring(6), 0, 10_000);
            ui.mostrarCategorias(v, empresaId, pg != null ? pg : 0);
        } else if (sub.startsWith("cat:")) {
            Long catId = parseLong(sub.substring(4));
            Categoria cat = catId != null ? categoriaRepository.findById(catId).orElse(null) : null;
            boolean valida = cat != null && cat.getEstado() != null && cat.getEstado() == Constants.ESTADO_ACTIVO
                && (cat.getEmpresaId() == null || empresaId.equals(cat.getEmpresaId()));
            if (!valida) {
                bot.enviarMensaje(v.getChatId(), "Esa categoría no está disponible.");
                ui.mostrarCategorias(v, empresaId, 0);
                return;
            }
            d.setCat(catId);
            e.setP(P_PRD_MARCA);
            support.guardar(v, e);
            ui.mostrarMarcas(v, empresaId);
        } else if (sub.startsWith("mar:")) {
            Long marcaId = parseLong(sub.substring(4));
            boolean valida = marcaId != null && marcaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO)
                .stream().anyMatch(m -> marcaId.equals(m.getId()));
            if (!valida) {
                bot.enviarMensaje(v.getChatId(), "Esa marca no está disponible.");
                ui.mostrarMarcas(v, empresaId);
                return;
            }
            d.setMarca(marcaId);
            ui.irAPasoFotos(v, e);
        } else if ("martxt".equals(sub)) {
            e.setP(P_PRD_MARCA_TEXTO);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre de la marca:");
        } else if ("marno".equals(sub)) {
            d.setMarca(null);
            d.setMarcaTxt(null);
            ui.irAPasoFotos(v, e);
        } else if ("fok".equals(sub)) {
            if (d.getFotos().isEmpty()) {
                bot.enviarMensaje(v.getChatId(), "Mandá al menos una foto del producto para continuar.");
                return;
            }
            confirm.mostrarResumenProducto(v, empresaId, e);
        } else if ("ok".equals(sub)) {
            confirm.confirmarProducto(v, empresaId, e);
        }
    }

    public void texto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String texto) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        switch (e.getP()) {
            case P_PRD_NOMBRE -> {
                if (texto.length() < 3 || texto.length() > 200) {
                    bot.enviarMensaje(v.getChatId(), "El nombre debe tener entre 3 y 200 caracteres. Escribilo de nuevo:");
                    return;
                }
                if (!textModerationService.moderar(texto).safe()) {
                    bot.enviarMensaje(v.getChatId(), "Ese nombre no está permitido en la plataforma. Escribí otro:");
                    return;
                }
                d.setNom(texto);
                e.setP(P_PRD_DESCRIPCION);
                support.guardar(v, e);
                bot.enviarMensaje(v.getChatId(), "Descripción corta (máx 255 caracteres):", List.of(
                    List.of(TelegramClienteBotService.boton("⏭️ Omitir", "prd:skip"),
                            TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
            }
            case P_PRD_DESCRIPCION -> {
                String desc = texto.length() > 255 ? texto.substring(0, 255) : texto;
                if (!textModerationService.moderar(desc).safe()) {
                    bot.enviarMensaje(v.getChatId(), "Esa descripción no está permitida en la plataforma. Escribí otra u *Omitir*:");
                    return;
                }
                d.setDesc(desc);
                e.setP(P_PRD_PRECIO_VENTA);
                support.guardar(v, e);
                bot.enviarMensaje(v.getChatId(), "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)");
            }
            case P_PRD_PRECIO_VENTA -> {
                Integer pv = parseEntero(texto, 1, 100_000_000);
                if (pv == null) {
                    bot.enviarMensaje(v.getChatId(), "Esperaba un precio en colones (ej: 8500). Escribilo de nuevo:");
                    return;
                }
                d.setPv(pv);
                e.setP(P_PRD_PRECIO_COMPRA);
                support.guardar(v, e);
                bot.enviarMensaje(v.getChatId(), "¿Cuánto te costó a vos? (precio de compra en colones — sirve para calcular tu ganancia)");
            }
            case P_PRD_PRECIO_COMPRA -> {
                Integer pc = parseEntero(texto, 0, 100_000_000);
                if (pc == null) {
                    bot.enviarMensaje(v.getChatId(), "Esperaba un número en colones (ej: 5000). Escribilo de nuevo:");
                    return;
                }
                d.setPc(pc);
                e.setP(P_PRD_STOCK);
                support.guardar(v, e);
                String aviso = avisoCostoMayorVenta(pc, d.getPv());
                bot.enviarMensaje(v.getChatId(), aviso + "¿Cuántas unidades tenés en stock?");
            }
            case P_PRD_STOCK -> {
                Integer stk = parseEntero(texto, 0, 1_000_000);
                if (stk == null) {
                    bot.enviarMensaje(v.getChatId(), "Esperaba un número (ej: 10). Escribilo de nuevo:");
                    return;
                }
                d.setStk(stk);
                e.setP(P_PRD_CATEGORIA);
                support.guardar(v, e);
                ui.mostrarCategorias(v, empresaId, 0);
            }
            case P_PRD_MARCA_TEXTO -> {
                d.setMarcaTxt(texto.length() > 100 ? texto.substring(0, 100) : texto);
                ui.irAPasoFotos(v, e);
            }
            default -> bot.enviarMensaje(v.getChatId(),
                "Usá los botones del mensaje anterior para continuar, o /cancelar para salir.");
        }
    }

    public boolean manejarFoto(TelegramVinculacion v, Long empresaId, JsonNode msg) {
        return confirm.manejarFoto(v, empresaId, msg);
    }

    private static String avisoCostoMayorVenta(Integer pc, Integer precioVenta) {
        int pv = precioVenta != null ? precioVenta : 0;
        if (pc > pv) {
            return "⚠️ Ojo: el costo es mayor que el precio de venta — venderías con pérdida.\n\n";
        }
        return "";
    }
}
