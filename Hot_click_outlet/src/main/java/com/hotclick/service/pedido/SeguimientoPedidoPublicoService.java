package com.hotclick.service.pedido;

import com.hotclick.dto.SeguimientoPedidoPublicoDTO;
import com.hotclick.model.Bodega;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.model.Producto;
import com.hotclick.model.Usuario;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.payment.PedidoGrupoService;
import com.hotclick.utils.Constants;
import com.hotclick.utils.TokenSeguimientoPedido;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Seguimiento de pedido sin cuenta: el comprador llega desde el enlace con token de sus correos.
 * Un token de cualquier subpedido abre todo el checkout (todos los paquetes del mismo pago).
 */
@Service
public class SeguimientoPedidoPublicoService {

    public static final String COURIER_CORREOS = "CORREOS_CR";
    public static final String COURIER_DIRECTO = "ENTREGA_DIRECTA";
    static final String URL_RASTREO_CORREOS = "https://rastreo.correos.go.cr/?codigo=";
    private static final String PREFIJO_INVITADO = "GUEST-";

    private final PedidoRepository pedidoRepository;
    private final PedidoGrupoService pedidoGrupoService;

    public SeguimientoPedidoPublicoService(PedidoRepository pedidoRepository, PedidoGrupoService pedidoGrupoService) {
        this.pedidoRepository = pedidoRepository;
        this.pedidoGrupoService = pedidoGrupoService;
    }

    /** Vacío si el token no tiene formato válido, no existe o el pedido fue eliminado: el caller no distingue. */
    @Transactional(readOnly = true)
    public Optional<SeguimientoPedidoPublicoDTO> porToken(String token) {
        if (!TokenSeguimientoPedido.formatoValido(token)) return Optional.empty();
        return pedidoRepository.findByTokenSeguimiento(token)
            .filter(SeguimientoPedidoPublicoService::visible)
            .map(this::armar);
    }

    private SeguimientoPedidoPublicoDTO armar(Pedido pedido) {
        List<Pedido> paquetes = pedidoGrupoService.delGrupo(pedido).stream()
            .filter(SeguimientoPedidoPublicoService::visible)
            .sorted(Comparator.comparing(Pedido::getId, Comparator.nullsLast(Comparator.naturalOrder())))
            .toList();
        if (paquetes.isEmpty()) paquetes = List.of(pedido);
        Pedido principal = paquetes.get(0);
        int total = paquetes.stream().map(Pedido::getTotalPedido).filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
        return new SeguimientoPedidoPublicoDTO(
            principal.getNumeroPedido(),
            principal.getFechaPedido(),
            total,
            esInvitado(principal.getUsuarioFinal()),
            paquetes.stream().map(SeguimientoPedidoPublicoService::paquete).toList());
    }

    private static boolean visible(Pedido p) {
        return p.getEstado() == null || p.getEstado() != Constants.ESTADO_ELIMINADO;
    }

    private static boolean esInvitado(Usuario u) {
        return u != null && u.getIdentificacion() != null && u.getIdentificacion().startsWith(PREFIJO_INVITADO);
    }

    private static SeguimientoPedidoPublicoDTO.Paquete paquete(Pedido p) {
        Bodega b = p.getBodega();
        String tienda = p.getEmpresa() != null && p.getEmpresa().getNombreEmpresa() != null
            ? p.getEmpresa().getNombreEmpresa() : (b != null ? b.getNombreBodega() : "HotClick");
        String origen = b != null && b.getProvincia() != null && !b.getProvincia().isBlank() ? b.getProvincia() : null;
        String guia = p.getNumeroGuia() != null && !p.getNumeroGuia().isBlank() ? p.getNumeroGuia().trim() : null;
        boolean correos = p.getUrlTracking() == null || p.getUrlTracking().contains("correos.go.cr");
        return new SeguimientoPedidoPublicoDTO.Paquete(
            tienda,
            origen,
            p.getEstadoPedido(),
            Constants.ENVIO_RETIRO.equals(p.getMetodoEnvio()),
            p.getFechaEntregaReal(),
            guia,
            guia == null ? null : (correos ? COURIER_CORREOS : COURIER_DIRECTO),
            guia == null ? null : urlRastreo(p.getUrlTracking(), guia),
            productos(p));
    }

    /** Solo enlaces https: un urlTracking cargado a mano nunca llega como javascript: o http plano. */
    static String urlRastreo(String urlTracking, String guia) {
        if (urlTracking != null && urlTracking.trim().toLowerCase().startsWith("https://")) return urlTracking.trim();
        if (urlTracking == null || urlTracking.isBlank()) {
            return URL_RASTREO_CORREOS + URLEncoder.encode(guia, StandardCharsets.UTF_8);
        }
        return null;
    }

    private static List<SeguimientoPedidoPublicoDTO.Producto> productos(Pedido p) {
        if (p.getItems() == null) return List.of();
        return p.getItems().stream()
            .filter(i -> i.getEstado() == null || i.getEstado() != Constants.ESTADO_ELIMINADO)
            .map(SeguimientoPedidoPublicoService::producto)
            .toList();
    }

    private static SeguimientoPedidoPublicoDTO.Producto producto(PedidoItem item) {
        Producto prod = item.getProducto();
        String nombre = prod != null ? prod.getNombreProducto() : null;
        String imagen = prod != null ? prod.getImagenPrincipalUrl() : null;
        return new SeguimientoPedidoPublicoDTO.Producto(nombre, imagen, item.getCantidad());
    }
}
