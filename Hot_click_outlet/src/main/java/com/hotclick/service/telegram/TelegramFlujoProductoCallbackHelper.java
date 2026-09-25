package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Categoria;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.BodegaRepository;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TenantService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Callbacks del flujo de alta de producto — extraído bit-idéntico de {@link TelegramFlujoProductoHandler}.
 */
@Component
class TelegramFlujoProductoCallbackHelper {

    @Autowired private TelegramFlujoSupport              support;
    @Autowired private TelegramClienteBotService          bot;
    @Autowired private BodegaRepository                   bodegaRepository;
    @Autowired private CategoriaRepository                  categoriaRepository;
    @Autowired private MarcaRepository                      marcaRepository;
    @Autowired private TenantService                        tenantService;
    @Autowired private TelegramFlujoProductoUiHelper       ui;
    @Autowired private TelegramFlujoProductoConfirmHelper  confirm;

    /** @return true si el callback fue consumido. */
    boolean manejarNuevo(TelegramVinculacion v, Long empresaId) {
        return iniciarAlta(v, empresaId, false);
    }

    boolean manejarPersonalizado(TelegramVinculacion v, Long empresaId) {
        return iniciarAlta(v, empresaId, true);
    }

    private boolean iniciarAlta(TelegramVinculacion v, Long empresaId, boolean personalizado) {
        if (support.denegarSiNoGestiona(v, empresaId)) return true;
        if (bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO).isEmpty()) {
            bot.enviarMensaje(v.getChatId(),
                "Tu negocio no tiene bodegas activas. Creá una desde el panel antes de publicar productos.",
                TelegramTeclado.soloMenu());
            return true;
        }
        try {
            tenantService.verificarLimiteProductos(empresaId);
        } catch (RuntimeException ex) {
            bot.enviarMensaje(v.getChatId(), esc(ex.getMessage()), TelegramTeclado.soloMenu());
            return true;
        }
        support.guardar(v, TelegramFlujoEstado.nuevoProducto(support.ahora(), personalizado));
        String titulo = personalizado ? "🎨 *Producto personalizado*" : "➕ *Nuevo producto*";
        bot.enviarMensaje(v.getChatId(),
            titulo + "\n\n¿Cómo se llama? (3 a 200 caracteres)\n\nEscribí /cancelar en cualquier momento para salir.",
            TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
        return true;
    }

    void manejarModo(TelegramVinculacion v, TelegramFlujoEstado e, String sub) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        String modo = switch (sub) {
            case "modofijo" -> "FIJO";
            case "modorango" -> "RANGO";
            case "modocot" -> "COTIZACION";
            default -> null;
        };
        if (modo == null) {
            ui.mostrarModosPrecio(v);
            return;
        }
        d.setModo(modo);
        if ("COTIZACION".equals(modo)) {
            d.setPv(1);
            d.setPc(0);
            e.setP(P_PRD_INSTR);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(),
                "Instrucciones para el cliente (cómo personalizar). Máx 3000 caracteres, o tocá *Omitir*.",
                List.of(
                    List.of(TelegramClienteBotService.boton("⏭ Omitir", "prd:skipinstr")),
                    List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR), TelegramTeclado.botonMenu())));
            return;
        }
        if ("RANGO".equals(modo)) {
            e.setP(P_PRD_PRECIO_MIN);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(),
                "¿Precio mínimo del rango? (colones, solo el número)",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
            return;
        }
        e.setP(P_PRD_PRECIO_VENTA);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(),
            "¿Precio de venta al cliente? (en colones, solo el número — ej: 8500)",
            TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
    }

    void manejarCategoria(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String sub) {
        if (sub.startsWith("catpg:")) {
            Integer pg = parseEntero(sub.substring(6), 0, 10_000);
            ui.mostrarCategorias(v, empresaId, pg != null ? pg : 0);
            return;
        }
        Long catId = parseLong(sub.substring(4));
        Categoria cat = catId != null ? categoriaRepository.findById(catId).orElse(null) : null;
        boolean valida = cat != null && cat.getEstado() != null && cat.getEstado() == Constants.ESTADO_ACTIVO
            && (cat.getEmpresaId() == null || empresaId.equals(cat.getEmpresaId()));
        if (!valida) {
            bot.enviarMensaje(v.getChatId(), "Esa categoría no está disponible.");
            ui.mostrarCategorias(v, empresaId, 0);
            return;
        }
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        d.setCat(catId);
        e.setP(P_PRD_MARCA);
        support.guardar(v, e);
        ui.mostrarMarcas(v, empresaId);
    }

    void manejarMarca(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String sub) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        if (sub.startsWith("mar:")) {
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
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre de la marca:",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
        } else if ("marno".equals(sub)) {
            d.setMarca(null);
            d.setMarcaTxt(null);
            ui.irAPasoFotos(v, e);
        }
    }

    void manejarConfirmacion(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e, String sub) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        if ("fok".equals(sub)) {
            if (d.getFotos().isEmpty()) {
                bot.enviarMensaje(v.getChatId(), "Mandá al menos una foto del producto para continuar.",
                    TelegramTeclado.conMenu(ui.tecladoFotos(0)));
                return;
            }
            confirm.mostrarResumenProducto(v, empresaId, e);
        } else if ("ok".equals(sub)) {
            confirm.confirmarProducto(v, empresaId, e);
        } else if ("skipinstr".equals(sub)) {
            d.setInstr(null);
            e.setP(P_PRD_STOCK);
            support.guardar(v, e);
            bot.enviarMensaje(v.getChatId(), "¿Cuántas unidades tenés en stock? (para personalizado puede ser 0)",
                TelegramTeclado.cancelarYMenu(BTN_CANCELAR));
        }
    }
}
