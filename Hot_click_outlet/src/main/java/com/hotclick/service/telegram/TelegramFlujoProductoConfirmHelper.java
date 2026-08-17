package com.hotclick.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Categoria;
import com.hotclick.model.Marca;
import com.hotclick.model.Producto;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.TelegramFlujoService;
import com.hotclick.service.TenantService;
import com.hotclick.service.TextModerationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Fotos y confirmación del flujo de alta de producto en Telegram.
 * Extraído bit-idéntico de TelegramFlujoProductoHandler — no cambia comportamiento.
 */
@Component
class TelegramFlujoProductoConfirmHelper {

    private static final Logger log = LoggerFactory.getLogger(TelegramFlujoProductoConfirmHelper.class);

    @Autowired private TelegramFlujoSupport          support;
    @Autowired @Lazy private TelegramFlujoService    flujo;
    @Autowired private TelegramClienteBotService     bot;
    @Autowired private CategoriaRepository           categoriaRepository;
    @Autowired private MarcaRepository               marcaRepository;
    @Autowired private TenantService                 tenantService;
    @Autowired private TextModerationService         textModerationService;
    @Autowired private ObjectMapper                  objectMapper;
    @Autowired private TelegramFlujoProductoUiHelper ui;
    @Autowired private TelegramFlujoProductoFotoHelper fotoHelper;

    /**
     * Foto entrante — como foto comprimida (`photo`) o como archivo/documento de
     * imagen (`document` con mime_type image/*, común al mandar desde Telegram
     * Desktop sin comprimir). @return true si se consumió (estábamos en el paso
     * FOTOS del alta de producto); false para que el router aplique el rechazo
     * estándar.
     */
    boolean manejarFoto(TelegramVinculacion v, Long empresaId, JsonNode msg) {
        Optional<TelegramFlujoEstado> rapido = TelegramFlujoEstado.deserializar(v.getContexto(), objectMapper);
        if (rapido.isEmpty() || !FLUJO_PRODUCTO.equals(rapido.get().getF())
                || !P_PRD_FOTOS.equals(rapido.get().getP())) {
            return false;
        }

        Optional<TelegramVinculacion> conLock = fotoHelper.obtenerConLock(v.getChatId());
        if (conLock.isEmpty()) return false;
        TelegramVinculacion vl = conLock.get();

        TelegramFlujoEstado e = support.estadoVigente(vl);
        if (e == null || !FLUJO_PRODUCTO.equals(e.getF()) || !P_PRD_FOTOS.equals(e.getP())) return false;

        List<String> fotos = e.getDraftSeguro().getFotos();
        if (fotos.size() >= MAX_FOTOS) {
            bot.enviarMensaje(vl.getChatId(), "Ya tenés " + MAX_FOTOS + " fotos (el máximo). Tocá *Listo* para continuar.",
                ui.tecladoFotos(fotos.size()));
            return true;
        }

        String fileId = fotoHelper.resolverFileId(msg);
        if (fileId == null) {
            bot.enviarMensaje(vl.getChatId(), "Esa foto es demasiado pesada (máx 10 MB). Probá con otra.");
            return true;
        }

        return fotoHelper.subirFotoAlBorrador(vl, e, fileId);
    }

    void mostrarResumenProducto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        e.setP(P_PRD_CONFIRMAR);
        support.guardar(v, e);

        String categoria = d.getCat() != null
            ? categoriaRepository.findById(d.getCat()).map(Categoria::getNombreCategoria).orElse("—") : "—";
        String marca = marcaResumen(d);

        bot.enviarMensaje(v.getChatId(), "📦 *Revisá el producto:*\n\n"
            + "Nombre: *" + esc(d.getNom()) + "*\n"
            + "Descripción: " + (d.getDesc() != null ? esc(d.getDesc()) : "—") + "\n"
            + "Precio venta: *" + colones(d.getPv()) + "*\n"
            + "Costo: " + colones(d.getPc()) + "\n"
            + "Stock: *" + d.getStk() + "*\n"
            + "Categoría: " + esc(categoria) + "\n"
            + "Marca: " + esc(marca) + "\n"
            + "Fotos: " + d.getFotos().size(),
            List.of(List.of(TelegramClienteBotService.boton("✅ Publicar producto", "prd:ok")),
                    List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
    }

    private String marcaResumen(TelegramFlujoEstado.ProductoBorrador d) {
        if (d.getMarca() != null) {
            return marcaRepository.findById(d.getMarca()).map(Marca::getNombreMarca).orElse("—");
        }
        if (d.getMarcaTxt() != null) return d.getMarcaTxt();
        return "Sin marca";
    }

    void confirmarProducto(TelegramVinculacion v, Long empresaId, TelegramFlujoEstado e) {
        if (support.denegarSiNoGestiona(v, empresaId)) return;
        TelegramFlujoEstado.ProductoBorrador d = e.getDraftSeguro();
        if (d.getNom() == null || d.getPv() == null || d.getPc() == null || d.getCat() == null || d.getFotos().isEmpty()) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "Al borrador le faltan datos. Escribí /menu y empezá de nuevo.");
            return;
        }
        if (!textModerationService.moderar(d.getNom(), d.getDesc()).safe()) {
            support.limpiar(v);
            bot.enviarMensaje(v.getChatId(), "El contenido del producto no está permitido en la plataforma.");
            return;
        }

        try {
            tenantService.verificarLimiteProductos(empresaId);
            Producto producto = flujo.crearProductoTx(d, empresaId, v.getUsuario());
            support.limpiar(v);
            String estadoPublicacion = Boolean.TRUE.equals(producto.getVisibleCatalogo())
                ? "Ya está *publicado* en el catálogo."
                : "Se publicará en el catálogo cuando tu negocio sea *aprobado* por el equipo HotClick.";
            bot.enviarMensaje(v.getChatId(), "✅ Producto *" + esc(producto.getNombreProducto()) + "* creado con "
                + d.getFotos().size() + " foto" + (d.getFotos().size() == 1 ? "" : "s") + ".\n\n"
                + estadoPublicacion,
                List.of(List.of(TelegramClienteBotService.boton("📋 Menú", "menu"))));
        } catch (Exception ex) {
            log.error("[telegram-flujo] fallo creando producto en chat {} — {}", v.getChatId(), ex.getMessage());
            bot.enviarMensaje(v.getChatId(), "No pude crear el producto: " + esc(ex.getMessage())
                + "\nEl borrador sigue guardado — tocá *Publicar* para reintentar o /cancelar.",
                List.of(List.of(TelegramClienteBotService.boton("✅ Publicar producto", "prd:ok"),
                                TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR))));
        }
    }
}
