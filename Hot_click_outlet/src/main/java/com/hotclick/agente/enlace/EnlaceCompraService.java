package com.hotclick.agente.enlace;

import com.hotclick.model.Producto;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.service.payment.GuestCheckoutGuard;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
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
                               List<Linea> lineas, String resumenChat) {
        /** El código y la URL son la credencial del enlace: nunca van a un log por accidente (AG-14 H-07). */
        @Override
        public String toString() {
            return "EnlaceCreado[total=" + total + ", lineas=" + lineas.size() + "]";
        }
    }

    private final EnlaceCompraRepository repo;
    private final ProductoRepository productoRepository;
    private final GuestCheckoutGuard guard;
    private final EnlaceCompraTope tope;
    private final String appUrl;
    private final int vigenciaHoras;
    /** Reloj sustituible en pruebas. */
    Supplier<LocalDateTime> reloj = () -> LocalDateTime.now(Constants.ZONA_CR);

    public EnlaceCompraService(EnlaceCompraRepository repo, ProductoRepository productoRepository,
                               GuestCheckoutGuard guard, EnlaceCompraTope tope,
                               @Value("${app.url:http://localhost:3000}") String appUrl,
                               @Value("${hotclick.agente.enlace.vigencia-horas:24}") int vigenciaHoras) {
        this.repo = repo;
        this.productoRepository = productoRepository;
        this.guard = guard;
        this.tope = tope;
        this.appUrl = appUrl.endsWith("/") ? appUrl.substring(0, appUrl.length() - 1) : appUrl;
        this.vigenciaHoras = vigenciaHoras;
    }

    /**
     * @param empresaId  tienda dueña de todos los productos; {@code null} = marketplace (cualquier tienda aprobada)
     * @param sesionId   conversación del bot (UUID, opcional)
     * @param contacto   id del contacto en el canal (en WhatsApp, su número); no se expone a terceros
     * @param nombre     nombre del cliente para prellenar el checkout (opcional)
     * @param canal      WHATSAPP, INSTAGRAM o MESSENGER
     * @throws EnlaceCompraException si algún producto no es comprable o la cantidad excede los topes (mensaje apto para el chat)
     */
    @Transactional
    public EnlaceCreado crear(Long empresaId, UUID sesionId, String contacto, String nombre, String canal,
                              List<ItemSolicitado> items) {
        String canalNorm = canal == null ? "" : canal.trim().toUpperCase(Locale.ROOT);
        if (!CANALES.contains(canalNorm)) throw new EnlaceCompraException("Canal no soportado");
        Map<Long, Integer> pedido = EnlaceCompraArmado.agrupar(items, guard);

        // Una sola consulta para todos los productos del pedido.
        Map<Long, Producto> productos = EnlaceItems.porId(productoRepository.findAllById(pedido.keySet()));

        EnlaceCompra enlace = new EnlaceCompra();
        EnlaceCompraArmado.Armado armado = EnlaceCompraArmado.armar(pedido, productos, empresaId, enlace);

        LocalDateTime ahora = reloj.get();
        // H-04: tope de enlaces vigentes por conversación y contacto; el más viejo sin pagar vence antes de crear.
        tope.hacerEspacio(empresaId, sesionId, canalNorm, recortar(contacto, 100), ahora);
        String codigo = CodigoEnlace.generar();
        enlace.setCodigo(codigo);
        enlace.setEmpresaId(empresaId);
        enlace.setChatSesionId(sesionId);
        enlace.setContactoExterno(recortar(contacto, 100));
        enlace.setNombreCliente(recortar(nombre, 120));
        enlace.setCanal(canalNorm);
        enlace.setEstado(EnlaceCompraEstado.CREADO);
        enlace.setPrecioTotalCreado(armado.total());
        enlace.setCreado(ahora);
        enlace.setVence(ahora.plusHours(vigenciaHoras));
        repo.save(enlace);

        return new EnlaceCreado(codigo, appUrl + "/c/" + codigo, enlace.getVence(), armado.total(), armado.lineas(),
            EnlaceCompraArmado.resumen(armado.lineas(), armado.total()));
    }

    private static String recortar(String s, int max) {
        if (s == null) return null;
        String t = s.trim();
        if (t.isEmpty()) return null;
        return t.length() > max ? t.substring(0, max) : t;
    }
}
