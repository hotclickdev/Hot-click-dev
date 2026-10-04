package com.hotclick.service.payment;

import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.PagoRepository;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Libera las reservas marcadas por {@link ReservaAntiBotService} cuando vence su
 * {@code fechaExpiracion}. Lo llama el scheduler de expiración de pagos, empresa por empresa.
 *
 * <p>Cada pago se toma con {@code SELECT FOR UPDATE} y se vuelve a mirar el estado: si dos
 * corridas (o una cancelación del usuario y el scheduler) llegan a la vez, solo una libera.
 * El stock se devuelve con {@link StockReservationService#liberarReservas}, que bloquea el
 * producto igual que la reserva.
 */
@Service
public class ReservaSospechosaLiberador {

    private static final Logger log = LoggerFactory.getLogger(ReservaSospechosaLiberador.class);
    /** Margen sobre ventana + demora: un pago marcado siempre es reciente; los SINPE normales (24 h) no entran. */
    static final int MARGEN_HORAS = 6;

    @Autowired private PagoRepository             pagoRepository;
    @Autowired private StockReservationService    stockReservationService;
    @Autowired private PedidoGrupoService         pedidoGrupoService;
    @Autowired private TilopayConfirmacionService tilopayConfirmacionService;
    @Autowired private ReservaAntiBotService      reservaAntiBot;

    /** @return cantidad de pagos cuyas reservas se liberaron. */
    @Transactional
    public int liberarVencidas(Long empresaId, LocalDateTime ahora) {
        LocalDateTime desde = ahora
            .minusMinutes((long) reservaAntiBot.getVentanaMinutos() + reservaAntiBot.getLiberarEnMinutos())
            .minusHours(MARGEN_HORAS);
        List<Long> ids = pagoRepository.findIdsReservaMarcadaVencidaByEmpresa(ahora, desde, empresaId);
        List<Pago> pagosCancelados = new ArrayList<>();
        for (Long id : ids) {
            Pago pago = pagoRepository.findByIdForUpdate(id).orElse(null);
            if (pago == null || !Constants.PAGO_PENDIENTE.equals(pago.getEstadoPago())
                    || pago.getFechaExpiracion() == null || !pago.getFechaExpiracion().isBefore(ahora)) {
                continue;
            }
            List<Pedido> grupo = pedidoGrupoService.delGrupo(pago.getPedido());
            if (grupo.stream().anyMatch(p -> !esPendiente(p.getEstadoPedido()))) {
                continue; // algún pedido ya avanzó (comprobante subido, pagado, etc.): no se toca
            }
            if (Constants.PROVEEDOR_TILOPAY.equalsIgnoreCase(pago.getProveedor())) {
                try {
                    if (tilopayConfirmacionService.intentarConfirmarSiAprobado(pago)) continue;
                } catch (Exception e) {
                    log.warn("[reserva-antibot] reconsulta Tilopay falló pago={}: {}", id, e.getClass().getSimpleName());
                }
            }
            pago.setEstadoPago(Constants.PAGO_CANCELADO);
            pago.setFechaActualizacion(ahora);
            pagosCancelados.add(pago);
            for (Pedido pedido : grupo) {
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                stockReservationService.liberarReservas(pedido);
            }
        }
        // Pagos y pedidos son entidades gestionadas (cargadas en esta transacción): el cambio de
        // estado se escribe en el commit por dirty checking, sin un save por fila.
        int liberados = pagosCancelados.size();
        if (liberados > 0) {
            log.warn("[reserva-antibot] empresa={}: {} reservas sospechosas liberadas", empresaId, liberados);
        }
        return liberados;
    }

    private static boolean esPendiente(String estado) {
        return Constants.PEDIDO_PENDIENTE.equals(estado) || Constants.PEDIDO_PENDIENTE_COMPROBANTE.equals(estado);
    }
}
