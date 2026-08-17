package com.hotclick.service.telegram;

import com.hotclick.dto.TelegramFlujoEstado;
import com.hotclick.model.Categoria;
import com.hotclick.model.Marca;
import com.hotclick.model.TelegramVinculacion;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static com.hotclick.dto.TelegramFlujoEstado.*;
import static com.hotclick.service.telegram.TelegramFlujoSupport.*;

/**
 * Teclados y mensajes UI del flujo de alta de producto en Telegram.
 * Extraído bit-idéntico de TelegramFlujoProductoHandler — no cambia comportamiento.
 */
@Component
class TelegramFlujoProductoUiHelper {

    @Autowired private TelegramFlujoSupport      support;
    @Autowired private TelegramClienteBotService bot;
    @Autowired private CategoriaRepository       categoriaRepository;
    @Autowired private MarcaRepository           marcaRepository;

    void mostrarCategorias(TelegramVinculacion v, Long empresaId, int pagina) {
        List<Categoria> todas = categoriaRepository.findByEmpresaIdOrNoEmpresaAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        if (todas.isEmpty()) {
            bot.enviarMensaje(v.getChatId(), "No hay categorías disponibles. Creá una desde el panel primero.");
            return;
        }
        int desde = Math.min(pagina * PAGINA, Math.max(0, todas.size() - 1));
        List<Categoria> visibles = todas.subList(desde, Math.min(desde + PAGINA, todas.size()));

        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        for (int i = 0; i + 1 < visibles.size(); i += 2) {
            teclado.add(List.of(
                TelegramClienteBotService.boton(recortar(visibles.get(i).getNombreCategoria(), 24), "prd:cat:" + visibles.get(i).getId()),
                TelegramClienteBotService.boton(recortar(visibles.get(i + 1).getNombreCategoria(), 24), "prd:cat:" + visibles.get(i + 1).getId())));
        }
        if (visibles.size() % 2 == 1) {
            Categoria ult = visibles.get(visibles.size() - 1);
            teclado.add(List.of(TelegramClienteBotService.boton(recortar(ult.getNombreCategoria(), 24), "prd:cat:" + ult.getId())));
        }
        List<Map<String, Object>> nav = new ArrayList<>();
        if (pagina > 0)                                  nav.add(TelegramClienteBotService.boton("⬅️ Anterior", "prd:catpg:" + (pagina - 1)));
        if (desde + PAGINA < todas.size())               nav.add(TelegramClienteBotService.boton("Siguiente ➡️", "prd:catpg:" + (pagina + 1)));
        if (!nav.isEmpty()) teclado.add(nav);
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));
        bot.enviarMensaje(v.getChatId(), "¿En qué categoría va?", teclado);
    }

    void mostrarMarcas(TelegramVinculacion v, Long empresaId) {
        List<Marca> marcas = marcaRepository.findByEmpresaIdAndEstado(empresaId, Constants.ESTADO_ACTIVO);
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        marcas.stream().limit(PAGINA).forEach(m -> teclado.add(List.of(
            TelegramClienteBotService.boton(recortar(m.getNombreMarca(), 40), "prd:mar:" + m.getId()))));
        teclado.add(List.of(TelegramClienteBotService.boton("✏️ Escribir marca", "prd:martxt"),
                            TelegramClienteBotService.boton("🚫 Sin marca", "prd:marno")));
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));
        bot.enviarMensaje(v.getChatId(), "¿De qué marca es?", teclado);
    }

    void irAPasoFotos(TelegramVinculacion v, TelegramFlujoEstado e) {
        e.setP(P_PRD_FOTOS);
        support.guardar(v, e);
        bot.enviarMensaje(v.getChatId(),
            "📷 Mandame de 1 a " + MAX_FOTOS + " fotos del producto, una por mensaje.\n"
            + "La primera será la imagen principal. Cuando termines tocá *Listo*.",
            tecladoFotos(0));
    }

    List<List<Map<String, Object>>> tecladoFotos(int cuantas) {
        List<List<Map<String, Object>>> teclado = new ArrayList<>();
        if (cuantas > 0) teclado.add(List.of(TelegramClienteBotService.boton("✅ Listo (" + cuantas + " foto" + (cuantas == 1 ? "" : "s") + ")", "prd:fok")));
        teclado.add(List.of(TelegramClienteBotService.boton("❌ Cancelar", BTN_CANCELAR)));
        return teclado;
    }
}
