package com.hotclick.service.payment;

import com.hotclick.model.Empresa;
import com.hotclick.model.Pago;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.PagoRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class PaymentExpirationCleanupService {

    private static final Logger log = LoggerFactory.getLogger(PaymentExpirationCleanupService.class);

    @Autowired private EmpresaRepository         empresaRepository;
    @Autowired private PagoRepository            pagoRepository;
    @Autowired private PedidoRepository          pedidoRepository;
    @Autowired private StockReservationService   stockReservationService;

    @Scheduled(fixedRate = 5 * 60 * 1000) // cada 5 minutos
    @SchedulerLock(name = "payment_expiration_cleanup", lockAtMostFor = "PT3M", lockAtLeastFor = "PT30S")
    @Transactional
    public void cancelarExpirados() {
        LocalDateTime corte = LocalDateTime.now(Constants.ZONA_CR).minusMinutes(30);
        for (Empresa empresa : empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")) {
            try {
                cancelarExpiradosDeEmpresa(empresa.getId(), corte);
            } catch (Exception e) {
                log.error("[payment-cleanup] Error empresa={}: {}", empresa.getId(), e.getMessage());
            }
        }
    }

    private void cancelarExpiradosDeEmpresa(Long empresaId, LocalDateTime corte) {
        List<Pago> expirados = pagoRepository.findExpiradosPendientesByEmpresa(corte, empresaId);
        List<Pago> pagosActualizados = new ArrayList<>();
        List<Pedido> pedidosActualizados = new ArrayList<>();

        for (Pago pago : expirados) {
            pago.setEstadoPago(Constants.PAGO_CANCELADO);
            pago.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
            pagosActualizados.add(pago);

            Pedido pedido = pago.getPedido();
            if (Constants.PEDIDO_PENDIENTE.equals(pedido.getEstadoPedido())) {
                pedido.setEstadoPedido(Constants.PEDIDO_CANCELADO);
                pedidosActualizados.add(pedido);
                stockReservationService.liberarReservas(pedido);
                log.info("Pedido {} cancelado por expiración de pago TTL", pedido.getNumeroPedido());
            }
        }

        if (!pagosActualizados.isEmpty()) {
            pagoRepository.saveAll(pagosActualizados);
            pedidoRepository.saveAll(pedidosActualizados);
            log.info("Cleanup TTL empresa={}: {} pagos expirados cancelados", empresaId, pagosActualizados.size());
        }
    }
}
