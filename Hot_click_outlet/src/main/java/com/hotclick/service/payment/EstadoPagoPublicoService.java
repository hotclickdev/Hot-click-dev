package com.hotclick.service.payment;

import com.hotclick.controller.crm.CrmClienteMapper;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.model.PedidoItem;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * S4-22 (Frontend #179): estado del pago para la página de gracias / SINPE pendiente, sin sesión.
 * El SINPE es el de ONVO (sin número de destino propio). ONVO no documenta un plazo para SINPE, así que
 * el plazo es configurable ({@code hotclick.sinpe.plazo-minutos}) y por defecto no hay: sin plazo nunca
 * se marca VENCIDO por tiempo y {@code reservadoHasta} es null.
 */
@Service
public class EstadoPagoPublicoService {

    public static final String PENDIENTE = "PENDIENTE";
    public static final String CONFIRMADO = "CONFIRMADO";
    public static final String VENCIDO = "VENCIDO";

    private final PedidoRepository pedidoRepository;
    private final PedidoGrupoService pedidoGrupoService;
    private final EstadoPagoTokenService tokenService;
    private final Integer plazoMinutos;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public EstadoPagoPublicoService(PedidoRepository pedidoRepository, PedidoGrupoService pedidoGrupoService,
                                    EstadoPagoTokenService tokenService,
                                    @Value("${hotclick.sinpe.plazo-minutos:#{null}}") Integer plazoMinutos) {
        this(pedidoRepository, pedidoGrupoService, tokenService, plazoMinutos, Clock.system(Constants.ZONA_CR));
    }

    EstadoPagoPublicoService(PedidoRepository pedidoRepository, PedidoGrupoService pedidoGrupoService,
                             EstadoPagoTokenService tokenService, Integer plazoMinutos, Clock clock) {
        this.pedidoRepository = pedidoRepository;
        this.pedidoGrupoService = pedidoGrupoService;
        this.tokenService = tokenService;
        this.plazoMinutos = plazoMinutos != null && plazoMinutos > 0 ? plazoMinutos : null;
        this.clock = clock;
    }

    /** Vacío si el token no corresponde al número o el pedido no existe/está eliminado: el caller responde 404. */
    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> consultar(String numero, String token) {
        if (!tokenService.esValido(numero, token)) return Optional.empty();
        Optional<Pedido> pedido = pedidoRepository.findByNumeroPedido(numero)
            .filter(p -> p.getEstado() == null || p.getEstado() != Constants.ESTADO_ELIMINADO);
        if (pedido.isEmpty()) return Optional.empty();
        return Optional.of(armar(pedido.get()));
    }

    private Map<String, Object> armar(Pedido pedido) {
        Collection<Pedido> paquetes = pedidoGrupoService.delGrupo(pedido);
        Pedido principal = paquetes.iterator().next();
        Pago pago = pedidoGrupoService.pagoDelGrupo(pedido).orElse(null);

        int subtotal = 0;
        int envio = 0;
        int totalPedidos = 0;
        int cantidad = 0;
        Set<String> tiendas = new LinkedHashSet<>();
        Set<String> metodosEnvio = new LinkedHashSet<>();
        for (Pedido p : paquetes) {
            subtotal += valor(p.getSubtotal());
            envio += valor(p.getCostoEnvio());
            totalPedidos += valor(p.getTotalPedido());
            cantidad += cantidadProductos(p);
            if (p.getEmpresa() != null && p.getEmpresa().getNombreEmpresa() != null) {
                tiendas.add(nombreTienda(p));
            }
            if (p.getMetodoEnvio() != null) metodosEnvio.add(p.getMetodoEnvio());
        }

        LocalDateTime reservadoHasta = reservadoHasta(pago);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("estado", estado(pago, reservadoHasta));
        m.put("numero", principal.getNumeroPedido());
        m.put("tienda", tiendas.isEmpty() ? "HotClick" : String.join(", ", tiendas));
        m.put("correo", principal.getUsuarioFinal() != null
            ? CrmClienteMapper.enmascararCorreo(principal.getUsuarioFinal().getCorreo()) : null);
        m.put("cantidadProductos", cantidad);
        m.put("subtotal", subtotal);
        m.put("envioEtiqueta", etiquetaEnvio(metodosEnvio));
        m.put("envio", envio);
        m.put("total", pago != null && pago.getMonto() != null ? pago.getMonto() : totalPedidos);
        m.put("reservadoHasta", reservadoHasta != null
            ? reservadoHasta.atZone(Constants.ZONA_CR).toOffsetDateTime().toString() : null);
        return m;
    }

    String estado(Pago pago, LocalDateTime reservadoHasta) {
        if (pago == null) return PENDIENTE;
        String e = pago.getEstadoPago();
        if (Constants.PAGO_CAPTURADO.equals(e) || Constants.PAGO_REEMBOLSADO.equals(e)) return CONFIRMADO;
        if (Constants.PAGO_FALLIDO.equals(e) || Constants.PAGO_CANCELADO.equals(e)) return VENCIDO;
        if (reservadoHasta != null && LocalDateTime.now(clock).isAfter(reservadoHasta)) return VENCIDO;
        return PENDIENTE;
    }

    private LocalDateTime reservadoHasta(Pago pago) {
        if (pago == null || !Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())) return null;
        if (pago.getFechaExpiracion() != null) return pago.getFechaExpiracion();
        if (plazoMinutos == null || pago.getFechaCreacion() == null) return null;
        return pago.getFechaCreacion().plusMinutes(plazoMinutos);
    }

    private static String nombreTienda(Pedido p) {
        String comercial = p.getEmpresa().getNombreComercial();
        return comercial != null && !comercial.isBlank() ? comercial : p.getEmpresa().getNombreEmpresa();
    }

    private static int cantidadProductos(Pedido p) {
        if (p.getItems() == null) return 0;
        int c = 0;
        for (PedidoItem i : p.getItems()) {
            if ((i.getEstado() == null || i.getEstado() != Constants.ESTADO_ELIMINADO) && i.getCantidad() != null) {
                c += i.getCantidad();
            }
        }
        return c;
    }

    static String etiquetaEnvio(Set<String> metodos) {
        if (metodos.size() != 1) return metodos.isEmpty() ? null : "Envío";
        String m = metodos.iterator().next();
        if (Constants.ENVIO_RETIRO.equals(m)) return "Retiro en tienda";
        if (Constants.ENVIO_ENCOMIENDA.equals(m)) return "Encomienda (se paga al retirar)";
        if (Constants.ENVIO_DOMICILIO.equals(m)) return "Envío a domicilio";
        return "Envío";
    }

    private static int valor(Integer v) {
        return Objects.requireNonNullElse(v, 0);
    }
}
