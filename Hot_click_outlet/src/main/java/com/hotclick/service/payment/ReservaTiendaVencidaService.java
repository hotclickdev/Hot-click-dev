package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.service.stock.CancelacionVentaStock;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * NP-22: la tienda propia reserva stock al crear el pedido (sin pasarela). Si el vendedor no lo
 * confirma ni lo cancela dentro del plazo, el pedido se cancela y las unidades vuelven a estar disponibles.
 * Cancelar a mano ya libera (PedidoService, CMP-1); el pago en pasarela vence en PaymentExpirationCleanupService.
 */
@Service
public class ReservaTiendaVencidaService {

    private static final Logger log = LoggerFactory.getLogger(ReservaTiendaVencidaService.class);
    static final int LOTE = 200;

    private final EmpresaRepository empresaRepository;
    private final PedidoRepository pedidoRepository;
    private final StockReservationService stockReservationService;
    private final CancelacionVentaStock cancelacionVentaStock;
    private final long horas;

    public ReservaTiendaVencidaService(EmpresaRepository empresaRepository,
                                       PedidoRepository pedidoRepository,
                                       StockReservationService stockReservationService,
                                       CancelacionVentaStock cancelacionVentaStock,
                                       @Value("${hotclick.tienda.reserva.horas:72}") long horas) {
        this.empresaRepository = empresaRepository;
        this.pedidoRepository = pedidoRepository;
        this.stockReservationService = stockReservationService;
        this.cancelacionVentaStock = cancelacionVentaStock;
        this.horas = Math.max(1, horas);
    }

    @Scheduled(fixedRate = 15 * 60 * 1000)
    @SchedulerLock(name = "reserva_tienda_vencida", lockAtMostFor = "PT10M", lockAtLeastFor = "PT30S")
    @Transactional
    public void programado() {
        ejecutar(LocalDateTime.now(Constants.ZONA_CR));
    }

    /** Devuelve cuántos pedidos canceló. */
    @Transactional
    public int ejecutar(LocalDateTime ahora) {
        LocalDateTime corte = ahora.minusHours(horas);
        int total = 0;
        for (Empresa empresa : empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")) {
            try {
                total += cancelarDeEmpresa(empresa.getId(), corte);
            } catch (Exception e) {
                log.error("[reserva-tienda] Error empresa={}: {}", empresa.getId(), e.getClass().getSimpleName());
            }
        }
        return total;
    }

    private int cancelarDeEmpresa(Long empresaId, LocalDateTime corte) {
        List<Pedido> vencidos = pedidoRepository.findTiendaPendientesVencidos(empresaId, corte, PageRequest.of(0, LOTE));
        for (Pedido pedido : vencidos) {
            pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
            // Misma regla que la cancelación manual: venta registrada a mano (descontó stock) se repone.
            if (!cancelacionVentaStock.reponerSiVentaManualSinCobro(pedido)) {
                stockReservationService.liberarReservas(pedido);
            }
            log.info("[reserva-tienda] Pedido {} cancelado: reserva vencida ({} h)", pedido.getNumeroPedido(), horas);
        }
        // Entidades administradas dentro de la transacción: el cambio de estado se guarda al confirmar.
        return vencidos.size();
    }
}
