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
        if (support.denegarSiNoGestiona(v, empresaId)) return true;
        if (bodegaRepository.findByEmpresaIdAndEstadoOrderByFechaCreacionAsc(empresaId, Constants.ESTADO_ACTIVO).isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "Tu negocio no tiene bodegas activas. Creá una desde el panel antes de publicar productos.");
            return true;
        }
        try {
            tenantService.verificarLimiteProductos(empresaId);
        } catch (RuntimeException ex) {
            bot.enviarMensaje(v.getChatId(), esc(ex.getMessage()));
            return true;
        }
        support.guardar(v, TelegramFlujoEstado.nuevoProducto(support.ahora()));
        bot.enviarMensaje(v.getChatId(), "➕ *Nuevo producto*\n\n¿Cómo se llama? (3 a 200 caracteres)\n\nEscribí /cancelar en cualquier momento para salir.");
        return true;
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
            bot.enviarMensaje(v.getChatId(), "Escribí el nombre de la marca:");
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
                bot.enviarMensaje(v.getChatId(), "Mandá al menos una foto del producto para continuar.");
                return;
            }
            confirm.mostrarResumenProducto(v, empresaId, e);
        } else if ("ok".equals(sub)) {
            confirm.confirmarProducto(v, empresaId, e);
        }
    }
}
