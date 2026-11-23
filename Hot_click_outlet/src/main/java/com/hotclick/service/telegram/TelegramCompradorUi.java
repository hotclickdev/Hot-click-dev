package com.hotclick.service.telegram;

import com.hotclick.model.Producto;
import com.hotclick.service.TelegramClienteBotService;
import com.hotclick.service.payment.OrderPricingService;
import com.hotclick.utils.FormatoColones;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/** Textos (español de Costa Rica, voseo) y teclados del flujo del comprador. Sin lógica de negocio. */
final class TelegramCompradorUi {

    static final List<String> PROVINCIAS = List.of("San José", "Alajuela", "Cartago", "Heredia", "Guanacaste", "Puntarenas", "Limón");

    private TelegramCompradorUi() {}

    static Map<String, Object> btn(String texto, String cb) {
        return TelegramClienteBotService.boton(texto, cb);
    }

    static String esc(String s) {
        return TelegramTexto.escaparMarkdown(s == null ? "" : s);
    }

    static String bienvenida(String tienda, boolean modoPrueba) {
        return "👋 ¡Hola! Bienvenido a *" + esc(tienda) + "*.\n\nAcá podés armar tu pedido y pagarlo en línea antes de retirarlo o recibirlo."
            + (modoPrueba ? "\n\n⚠️ *Pagos en modo de prueba:* no se cobra dinero real." : "")
            + "\n\nNunca te voy a pedir datos de tarjeta por este chat. Escribí /cancelar cuando quieras salir.";
    }

    static String catalogo(List<Producto> productos, int pagina, boolean hayMas, int unidadesCarrito) {
        if (productos.isEmpty()) {
            return pagina == 0 ? "Por ahora esta tienda no tiene productos con existencias. Volvé a intentar más tarde."
                : "No hay más productos.";
        }
        StringBuilder sb = new StringBuilder("🛍️ *Productos disponibles* (página ").append(pagina + 1).append(")\n\nTocá un producto para agregarlo.");
        if (unidadesCarrito > 0) sb.append("\n\n🛒 En tu carrito: ").append(unidadesCarrito).append(unidadesCarrito == 1 ? " unidad" : " unidades");
        return sb.toString();
    }

    static List<List<Map<String, Object>>> tecladoCatalogo(List<Producto> productos, int pagina, boolean hayMas, int unidadesCarrito) {
        List<List<Map<String, Object>>> k = new ArrayList<>();
        for (Producto p : productos) {
            String etiqueta = TelegramFlujoSupport.recortar(p.getNombreProducto(), 34) + " — " + FormatoColones.colones(OrderPricingService.precioEfectivo(p));
            k.add(List.of(btn(etiqueta, "c:a:" + p.getId())));
        }
        List<Map<String, Object>> nav = new ArrayList<>();
        if (pagina > 0) nav.add(btn("◀️ Anterior", "c:p:" + (pagina - 1)));
        if (hayMas) nav.add(btn("Siguiente ▶️", "c:p:" + (pagina + 1)));
        if (!nav.isEmpty()) k.add(nav);
        if (unidadesCarrito > 0) k.add(List.of(btn("🛒 Ver carrito (" + unidadesCarrito + ")", "c:car")));
        return k;
    }

    static String cantidad(Producto p, int max) {
        return "*" + esc(p.getNombreProducto()) + "*\n" + FormatoColones.colones(OrderPricingService.precioEfectivo(p))
            + " c/u\n\n¿Cuántas unidades querés? (máximo " + max + " por producto)";
    }

    static List<List<Map<String, Object>>> tecladoCantidad(Long productoId, int max, int disponibles) {
        List<Map<String, Object>> fila = new ArrayList<>();
        for (int n = 1; n <= Math.min(max, Math.max(disponibles, 0)); n++) fila.add(btn(String.valueOf(n), "c:q:" + productoId + ":" + n));
        return List.of(fila, List.of(btn("⬅️ Volver", "c:p:0")));
    }

    record Linea(Long productoId, String nombre, int cantidad, int precio) {
        int subtotal() { return cantidad * precio; }
    }

    static int subtotal(List<Linea> lineas) {
        return lineas.stream().mapToInt(Linea::subtotal).sum();
    }

    static String carrito(List<Linea> lineas) {
        if (lineas.isEmpty()) return "🛒 Tu carrito está vacío.";
        StringBuilder sb = new StringBuilder("🛒 *Tu carrito*\n\n");
        for (Linea l : lineas) {
            sb.append(l.cantidad()).append(" × ").append(esc(l.nombre())).append(" — ").append(FormatoColones.colones(l.subtotal())).append('\n');
        }
        return sb.append("\nSubtotal: *").append(FormatoColones.colones(subtotal(lineas))).append('*').toString();
    }

    static List<List<Map<String, Object>>> tecladoCarrito(List<Linea> lineas) {
        List<List<Map<String, Object>>> k = new ArrayList<>();
        for (Linea l : lineas) k.add(List.of(btn("🗑️ Quitar " + TelegramFlujoSupport.recortar(l.nombre(), 28), "c:r:" + l.productoId())));
        k.add(List.of(btn("➕ Agregar otro", "c:p:0")));
        if (!lineas.isEmpty()) k.add(List.of(btn("✅ Continuar con el pedido", "c:go")));
        k.add(List.of(btn("❌ Cancelar", "c:x")));
        return k;
    }

    static String preguntaEntrega() {
        return "¿Cómo querés recibir tu pedido?";
    }

    static List<List<Map<String, Object>>> tecladoEntrega(boolean retiro) {
        List<List<Map<String, Object>>> k = new ArrayList<>();
        if (retiro) k.add(List.of(btn("🏪 En persona (retiro en tienda)", "c:e:R")));
        k.add(List.of(btn("🛵 A domicilio", "c:e:D")));
        k.add(List.of(btn("❌ Cancelar", "c:x")));
        return k;
    }

    static List<List<Map<String, Object>>> tecladoProvincias() {
        List<List<Map<String, Object>>> k = new ArrayList<>();
        for (int i = 0; i < PROVINCIAS.size(); i += 2) {
            List<Map<String, Object>> fila = new ArrayList<>();
            fila.add(btn(PROVINCIAS.get(i), "c:pv:" + i));
            if (i + 1 < PROVINCIAS.size()) fila.add(btn(PROVINCIAS.get(i + 1), "c:pv:" + (i + 1)));
            k.add(fila);
        }
        k.add(List.of(btn("❌ Cancelar", "c:x")));
        return k;
    }

    static String pedirUbicacion() {
        return "📍 Ahora necesito saber dónde entregarte. Usamos tu ubicación *solo para la entrega*.\n\n"
            + "Mandame *una* de estas opciones:\n"
            + "• Tus señas escritas (distrito, calle, color de casa, referencias)\n"
            + "• Un enlace de Google Maps o Waze\n"
            + "• Tu ubicación de Telegram (📎 → Ubicación)\n\n"
            + "Si no querés compartir el pin, escribí las señas.";
    }

    static String confirmarUbicacion(TelegramCompradorCtx c) {
        String donde;
        if (c.direccionTexto != null && !c.direccionTexto.isBlank()) donde = "«" + esc(c.direccionTexto) + "»";
        else if ("TELEGRAM".equals(c.fuente)) donde = "la ubicación que compartiste en Telegram";
        else if ("WAZE".equals(c.fuente)) donde = "el punto del enlace de Waze";
        else donde = "el punto del enlace de Maps";
        String lugar = c.provincia != null && c.canton != null ? " (" + esc(c.canton) + ", " + esc(c.provincia) + ")" : "";
        return "Te ubico en " + donde + lugar + ". ¿Está bien?";
    }

    static List<List<Map<String, Object>>> tecladoConfirmarUbicacion() {
        return List.of(List.of(btn("✅ Sí, está bien", "c:u:s"), btn("✏️ Cambiar", "c:u:n")),
            List.of(btn("❌ Cancelar", "c:x")));
    }

    static String resumen(List<Linea> lineas, TelegramCompradorCtx c, int costoEnvio, boolean modoPrueba) {
        StringBuilder sb = new StringBuilder("🧾 *Resumen de tu pedido*\n\n");
        for (Linea l : lineas) sb.append(l.cantidad()).append(" × ").append(esc(l.nombre())).append('\n');
        int sub = subtotal(lineas);
        sb.append("\nProductos: ").append(FormatoColones.colones(sub));
        if (c.esDomicilio()) {
            sb.append("\nEnvío: ").append(FormatoColones.colones(costoEnvio));
        }
        sb.append("\n*Total estimado: ").append(FormatoColones.colones(sub + (c.esDomicilio() ? costoEnvio : 0))).append("*");
        sb.append("\n\nEntrega: ").append(c.esDomicilio() ? "a domicilio" : "retiro en tienda (en persona)");
        sb.append("\nA nombre de: ").append(esc(c.nombre));
        sb.append("\n\nPagás en línea antes; se reserva tu stock mientras pagás.");
        if (modoPrueba) sb.append("\n⚠️ Modo de prueba: no se cobra dinero real.");
        return sb.toString();
    }

    static List<List<Map<String, Object>>> tecladoResumen() {
        return List.of(List.of(btn("💳 Pagar en línea", "c:pay")), List.of(btn("❌ Cancelar", "c:x")));
    }

    static String ayuda() {
        return "ℹ️ *Ayuda*\n\nPodés armar tu pedido con los botones. Escribí /cancelar para salir en cualquier momento. "
            + "Si tenés un problema con un pedido pagado, comunicate con la tienda.";
    }
}
