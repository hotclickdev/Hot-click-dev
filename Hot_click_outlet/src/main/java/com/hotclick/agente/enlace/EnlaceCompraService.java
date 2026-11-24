package com.hotclick.agente.enlace;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.payment.GuestCheckoutGuard;
import com.hotclick.service.payment.OrderPricingService;
import com.hotclick.service.payment.StockReservationService;
import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

/**
 * AG-07: crea el enlace de compra que el bot manda al cliente. Valida con las mismas reglas que el checkout de
 * invitado (visibilidad del catálogo, topes de {@link GuestCheckoutGuard}) para no crear carritos que luego se
 * rechazan. No reserva stock: la reserva ocurre al abrir el enlace (AG-09, {@link EnlaceCompraAperturaService}).
 */
@Service
public class EnlaceCompraService {

    static final Set<String> CANALES = Set.of("WHATSAPP", "INSTAGRAM", "MESSENGER");

    /** Línea pedida por el bot. */
    public record ItemSolicitado(Long productoId, int cantidad) { }

    /** Una línea ya validada y con precio calculado por el servidor. */
    public record Linea(Long productoId, String nombre, int cantidad, int precioUnitario, int subtotal) { }

    /** Respuesta de {@link #crear}: lo que el bot necesita para contestar en el chat. */
    public record EnlaceCreado(String codigo, String url, LocalDateTime vence, int total,
                               List<Linea> lineas, String resumenChat) { }

    private final EnlaceCompraRepository repo;
    private final ProductoRepository productoRepository;
    private final GuestCheckoutGuard guard;
    private final String appUrl;
    private final int vigenciaHoras;
    /** Reloj sustituible en pruebas. */
    Supplier<LocalDateTime> reloj = () -> LocalDateTime.now(Constants.ZONA_CR);

    public EnlaceCompraService(EnlaceCompraRepository repo, ProductoRepository productoRepository,
                               GuestCheckoutGuard guard,
                               @Value("${app.url:http://localhost:3000}") String appUrl,
                               @Value("${hotclick.agente.enlace.vigencia-horas:24}") int vigenciaHoras) {
        this.repo = repo;
        this.productoRepository = productoRepository;
        this.guard = guard;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
        this.vigenciaHoras = vigenciaHoras;
    }

    /**
     * @param empresaId  tienda dueña de todos los productos; {@code null} = marketplace (cualquier tienda aprobada)
     * @param sesionId   conversación del bot (opcional)
     * @param contacto   id del contacto en el canal (en WhatsApp, su número); no se expone a terceros
     * @param nombre     nombre del cliente para prellenar el checkout (opcional)
     * @param canal      WHATSAPP, INSTAGRAM o MESSENGER
     * @throws EnlaceCompraException si algún producto no es comprable o la cantidad excede los topes (mensaje apto para el chat)
     */
    @Transactional
    public EnlaceCreado crear(Long empresaId, Long sesionId, String contacto, String nombre, String canal,
                              List<ItemSolicitado> items) {
        String canalNorm = canal == null ? "" : canal.trim().toUpperCase(Locale.ROOT);
        if (!CANALES.contains(canalNorm)) throw new EnlaceCompraException("Canal no soportado");
        Map<Long, Integer> pedido = agrupar(items);

        List<Producto> encontrados = productoRepository.findAllById(pedido.keySet());
        Map<Long, Producto> porId = new LinkedHashMap<>();
        for (Producto p : encontrados) porId.put(p.getId(), p);

        int unidades = pedido.values().stream().mapToInt(Integer::intValue).sum();
        if (unidades > guard.getMaxPendientes()) {
            throw new EnlaceCompraException("Por ahora puedo armar compras de hasta " + guard.getMaxPendientes()
                + " unidades. Si necesitás más, escribile a soporte.");
        }

        EnlaceCompra enlace = new EnlaceCompra();
        List<Linea> lineas = new ArrayList<>();
        int total = 0;
        for (Map.Entry<Long, Integer> e : pedido.entrySet()) {
            Producto p = porId.get(e.getKey());
            int cantidad = e.getValue();
            validarProducto(p, empresaId, cantidad);
            int precio = OrderPricingService.precioEfectivo(p);
            int subtotal = precio * cantidad;
            total += subtotal;
            lineas.add(new Linea(p.getId(), p.getNombreProducto(), cantidad, precio, subtotal));
            enlace.agregarItem(new EnlaceCompraItem(p.getId(), cantidad, precio));
        }

        LocalDateTime ahora = reloj.get();
        String codigo = CodigoEnlace.generar();
        enlace.setCodigo(codigo);
        enlace.setEmpresaId(empresaId);
        enlace.setChatSesionId(sesionId);
        enlace.setContactoExterno(recortar(contacto, 100));
        enlace.setNombreCliente(recortar(nombre, 120));
        enlace.setCanal(canalNorm);
        enlace.setEstado(EnlaceCompraEstado.CREADO);
        enlace.setPrecioTotalCreado(total);
        enlace.setCreado(ahora);
        enlace.setVence(ahora.plusHours(vigenciaHoras));
        repo.save(enlace);

        return new EnlaceCreado(codigo, appUrl + "/c/" + codigo, enlace.getVence(), total, lineas,
            resumen(lineas, total));
    }

    /** Suma cantidades del mismo producto y valida cantidad ≥ 1, tope por producto y tope de líneas. */
    private Map<Long, Integer> agrupar(List<ItemSolicitado> items) {
        if (items == null || items.isEmpty()) throw new EnlaceCompraException("Falta al menos un producto");
        Map<Long, Integer> m = new LinkedHashMap<>();
        for (ItemSolicitado i : items) {
            if (i == null || i.productoId() == null) throw new EnlaceCompraException("Producto inválido");
            if (i.cantidad() < 1) throw new EnlaceCompraException("La cantidad debe ser al menos 1");
            m.merge(i.productoId(), i.cantidad(), Integer::sum);
        }
        if (m.size() > PaymentCheckoutRequest.MAX_ITEMS) throw new EnlaceCompraException("Demasiados productos distintos");
        for (int c : m.values()) {
            if (c > guard.getMaxPorProducto()) {
                throw new EnlaceCompraException(String.format(GuestCheckoutGuard.MSG_TOPE_PRODUCTO, guard.getMaxPorProducto()));
            }
        }
        return m;
    }

    private void validarProducto(Producto p, Long empresaId, int cantidad) {
        if (p == null) throw new EnlaceCompraException("Un producto ya no existe");
        // Misma regla que el catálogo público (activo, visible, negocio ACTIVO y público) y no vendido.
        boolean comprable = StockReservationService.esPublicableEnMemoria(p)
            && p.getEmpresa() != null && !Boolean.TRUE.equals(p.getVendido());
        if (!comprable) throw new EnlaceCompraException("«" + p.getNombreProducto() + "» no está disponible");
        if (empresaId != null && !empresaId.equals(p.getEmpresa().getId())) {
            // Mismo mensaje que «no disponible»: el bot de una tienda no debe poder sondear otras tiendas.
            throw new EnlaceCompraException("«" + p.getNombreProducto() + "» no está disponible");
        }
        if (p.esACotizar() || OrderPricingService.precioEfectivo(p) == null) {
            throw new EnlaceCompraException("«" + p.getNombreProducto() + "» es a cotizar: no se puede vender por enlace");
        }
        if (!Boolean.TRUE.equals(p.getEsPersonalizado()) && p.getStockDisponible() < cantidad) {
            throw new EnlaceCompraException("De «" + p.getNombreProducto() + "» solo quedan "
                + Math.max(0, p.getStockDisponible()) + " unidades");
        }
    }

    static String resumen(List<Linea> lineas, int total) {
        StringBuilder sb = new StringBuilder();
        for (Linea l : lineas) {
            sb.append(l.cantidad()).append(" × ").append(l.nombre()).append(" = ").append(colones(l.subtotal())).append('\n');
        }
        sb.append("Total: ").append(colones(total));
        return sb.toString();
    }

    static String colones(int monto) {
        return "₡" + NumberFormat.getIntegerInstance(Locale.forLanguageTag("es-CR")).format(monto);
    }

    private static String recortar(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }
}
