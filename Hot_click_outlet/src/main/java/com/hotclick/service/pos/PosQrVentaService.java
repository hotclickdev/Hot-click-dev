package com.hotclick.service.pos;

import com.hotclick.model.Pedido;
import com.hotclick.model.PosQrSesion;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.service.TurnoCajaService;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;

@Service
public class PosQrVentaService {

    private static final Logger log = LoggerFactory.getLogger(PosQrVentaService.class);

    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PosQrSessionService   sessionService;
    @Autowired private PosQrVentaCompletionService completionService;
    @Autowired private TurnoCajaService       turnoCajaService;



    /**
     * El cliente eligió un método entre los que habilitó la caja: queda en la sesión
     * (lo usan el pedido POS y los totales del turno). Sin cambio si no está habilitado.
     */
    static void elegirMetodo(PosQrSesion sesion, String metodo) {
        if (!"PENDIENTE".equals(sesion.getEstado())) return;
        if (PosQrMetodos.habilitado(sesion, metodo) && !metodo.equals(sesion.getMetodoPago())) {
            sesion.setMetodoPago(metodo);
        }
    }

    /**
     * Inicio del cobro con pasarela (tarjeta o SINPE Móvil) desde el QR. No hay pasarela conectada
     * (ONVO marketplace pendiente): se rechaza con un mensaje claro. El webhook de la
     * pasarela que se conecte completa la venta con {@link #completarSiPagoPasarela(String)}.
     */
    public Map<String, Object> iniciarPagoPasarela(String token, String metodo) {
        PosQrSesion sesion = sessionService.findSesionActiva(token);
        exigirMetodoPasarela(sesion);
        throw new IllegalStateException(MENSAJE_SIN_PASARELA);
    }

    static final String MENSAJE_SIN_PASARELA =
        "El pago en línea no está disponible por ahora. Pagale al cajero con otro método.";

    @Transactional
    public boolean completarSiPagoPasarela(String pasarelaSessionId) {
        if (pasarelaSessionId == null || pasarelaSessionId.isBlank()) return false;
        PosQrSesion sesion = posQrRepo.findByStripeSessionId(pasarelaSessionId).orElse(null);
        if (sesion == null) return false;
        if ("PAGADO".equals(sesion.getEstado())) return true;
        if (!"PENDIENTE".equals(sesion.getEstado())) {
            log.warn("[POS-QR] Checkout {} en estado {}, no se completa", pasarelaSessionId, sesion.getEstado());
            return true;
        }
        if (!reclamar(sesion)) return true;
        // Ya vinculado a un pedido de tienda: no crear segundo pedido POS.
        if (sesion.getPedidoId() != null) {
            marcarPagadoSinPedidoPos(sesion);
            return true;
        }
        completionService.completarVentaTarjeta(sesion);
        return true;
    }

    /**
     * Al iniciar checkout de la tienda con el token del QR, guarda el pedido
     * sin marcar PAGADO todavía (eso ocurre al confirmar el pago).
     * El token lo ve cualquiera que escanee el QR: solo se vincula una compra de un paquete,
     * del mismo negocio y por los mismos productos que la sesión, y nunca se pisa un vínculo previo.
     */
    @Transactional
    public void vincularPedidoTienda(String posQrToken, Long pedidoId) {
        if (posQrToken == null || posQrToken.isBlank() || pedidoId == null) return;
        Pedido pedido = pedidoRepository.findById(pedidoId).orElse(null);
        if (pedido == null) return;
        PosQrSesion sesion = posQrRepo.findByToken(posQrToken).orElse(null);
        if (sesion == null) {
            log.warn("[POS-QR] Token {} no encontrado al vincular pedido {}", posQrToken, pedidoId);
            return;
        }
        String rechazo = esCompraDeVariosPaquetes(pedido)
            ? "la compra trae paquetes de varios negocios"
            : motivoRechazoVinculo(sesion, pedido);
        if (rechazo != null) {
            log.warn("[POS-QR] Sesión {} no se vincula a pedido {}: {}", posQrToken, pedidoId, rechazo);
            return;
        }
        sesion.setPedidoId(pedidoId);
        posQrRepo.save(sesion);
        log.info("[POS-QR] Sesión {} vinculada a pedido tienda {}", posQrToken, pedidoId);
    }

    /** Un QR de mesa es de un solo negocio: una compra con varios paquetes (grupo_pago) no se vincula. */
    private boolean esCompraDeVariosPaquetes(Pedido pedido) {
        String grupo = pedido.getGrupoPago();
        return grupo != null && !grupo.isBlank() && pedidoRepository.findByGrupoPagoOrderByIdAsc(grupo).size() > 1;
    }

    static String motivoRechazoVinculo(PosQrSesion sesion, Pedido pedido) {
        if (!"PENDIENTE".equals(sesion.getEstado())) return "estado " + sesion.getEstado();
        if (sesion.getPedidoId() != null) return "ya vinculada al pedido " + sesion.getPedidoId();
        Long empresaPedido = pedido.getEmpresa() != null ? pedido.getEmpresa().getId() : null;
        if (sesion.getEmpresa() == null || !sesion.getEmpresa().getId().equals(empresaPedido)) {
            return "el pedido es de otro negocio";
        }
        if (!Objects.equals(pedido.getSubtotal(), sesion.getTotal())) {
            return "subtotal " + pedido.getSubtotal() + " distinto del QR " + sesion.getTotal();
        }
        return null;
    }

    /**
     * Cuando el pago de la tienda confirma el pedido, avisa al cajero.
     * No crea un segundo pedido POS (el ORD-… ya descontó stock).
     */
    @Transactional
    public void marcarPagadoPorPedidoTienda(Long pedidoId) {
        if (pedidoId == null) return;
        PosQrSesion sesion = posQrRepo.findByPedidoId(pedidoId).orElse(null);
        if (sesion == null) return;
        if ("PAGADO".equals(sesion.getEstado())) return;
        if (!"PENDIENTE".equals(sesion.getEstado())) return;
        if (!reclamar(sesion)) return;
        marcarPagadoSinPedidoPos(sesion);
    }

    /** Solo la primera transacción que reclama la sesión cierra la venta; evita dos pedidos y dos sumas al turno. */
    private boolean reclamar(PosQrSesion sesion) {
        if (posQrRepo.reclamarParaCompletar(sesion.getId()) == 1) return true;
        log.info("[POS-QR] Sesión {} ya la está cerrando otra transacción", sesion.getToken());
        return false;
    }

    private void marcarPagadoSinPedidoPos(PosQrSesion sesion) {
        sesion.setEstado("PAGADO");
        sesion.setFechaPago(LocalDateTime.now(Constants.ZONA_CR));
        posQrRepo.save(sesion);
        if (sesion.getTurno() != null) {
            try {
                turnoCajaService.actualizarTotales(
                    sesion.getTurno().getId(), sesion.getMetodoPago(), sesion.getTotal());
            } catch (Exception e) {
                log.warn("[POS-QR] No se pudo actualizar turno al marcar PAGADO: {}", e.getMessage());
            }
        }
        log.info("[POS-QR] Sesión {} marcada PAGADO vía pedido tienda {}", sesion.getToken(), sesion.getPedidoId());
    }

    @Transactional
    public String verificarEstado(String token) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if ("PAGADO".equals(sesion.getEstado()) || "CANCELADO".equals(sesion.getEstado())) {
            return sesion.getEstado();
        }

        if (LocalDateTime.now(Constants.ZONA_CR).isAfter(sesion.getFechaExpiracion())) {
            sesion.setEstado("EXPIRADO");
            posQrRepo.save(sesion);
            return "EXPIRADO";
        }

        if (pagoPasarelaConfirmado(sesion)) {
            if (reclamar(sesion)) completionService.completarVentaTarjeta(sesion);
            return "PAGADO";
        }

        return sesion.getEstado();
    }

    @Transactional
    public Map<String, Object> consultarEstado(String token) {
        String estado = verificarEstado(token);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("estado", estado);
        posQrRepo.findByToken(token).ifPresent(s -> {
            if (s.getPedidoId() != null) body.put("pedidoId", s.getPedidoId());
            // Método con el que pagó el cliente (puede elegir entre los habilitados).
            if (s.getMetodoPago() != null) body.put("metodoPago", s.getMetodoPago());
        });
        return body;
    }

    /** Sin pasarela conectada no hay consulta activa: la venta solo la completa el webhook de la pasarela. */
    private boolean pagoPasarelaConfirmado(PosQrSesion sesion) {
        return false;
    }

    @Transactional
    public PosQrSesion confirmarSinpe(String token, Long usuarioId, Long empresaId, String notas) {
        PosQrSesion sesion = posQrRepo.findByToken(token)
            .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));

        if (!"PENDIENTE".equals(sesion.getEstado())) {
            throw new IllegalStateException("La sesión no está pendiente (estado: " + sesion.getEstado() + ")");
        }
        if (!empresaIdDe(sesion).equals(empresaId)) {
            throw new SecurityException("No autorizado");
        }
        if (!reclamar(sesion)) {
            throw new IllegalStateException("La sesión ya se está confirmando");
        }

        completionService.completarVentaSinpe(sesion, usuarioId, notas);
        return sesion;
    }

    @Transactional
    protected void completarVentaTarjeta(PosQrSesion sesion) {
        completionService.completarVentaTarjeta(sesion);
    }

    @Transactional
    protected void completarVentaSinpe(PosQrSesion sesion, Long usuarioId, String notas) {
        completionService.completarVentaSinpe(sesion, usuarioId, notas);
    }

    static boolean esMetodoPasarela(PosQrSesion sesion) {
        String metodo = sesion == null ? null : sesion.getMetodoPago();
        return "TARJETA".equals(metodo) || "SINPE".equals(metodo);
    }

    static void exigirMetodoPasarela(PosQrSesion sesion) {
        if (sesion == null || !esMetodoPasarela(sesion)) {
            throw new IllegalStateException("Esta sesión no es de pago con pasarela");
        }
    }

    static Long empresaIdDe(PosQrSesion sesion) {
        if (sesion == null) {
            throw new IllegalStateException("La sesión POS no tiene empresa");
        }
        var empresa = sesion.getEmpresa();
        if (empresa == null || empresa.getId() == null) {
            throw new IllegalStateException("La sesión POS no tiene empresa");
        }
        return empresa.getId();
    }

    static String correoCheckout(PosQrSesion sesion) {
        if (sesion.getEmpresa() == null) return null;
        String correo = sesion.getEmpresa().getCorreoEmpresa();
        return correo == null || correo.isBlank() ? null : correo;
    }

    static String descripcionCheckout(List<Map<String, Object>> items) {
        String texto = items.stream()
            .map(i -> i.getOrDefault("nombre", "Producto") + " x" + i.getOrDefault("cantidad", 1))
            .reduce((a, b) -> a + ", " + b)
            .orElse("Compra POS");
        return texto.length() <= 100 ? texto : texto.substring(0, 100);
    }
}
