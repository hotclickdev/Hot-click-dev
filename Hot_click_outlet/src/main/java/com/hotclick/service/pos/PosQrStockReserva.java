package com.hotclick.service.pos;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.model.PosQrSesion;
import com.hotclick.model.Producto;
import com.hotclick.repository.PosQrSesionRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.utils.Constants;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ALTO 2: reserva de stock del QR del POS. Usa el mismo contador {@code Producto.stockReservado} que
 * {@link com.hotclick.service.payment.StockReservationService} (checkout del marketplace) sin modificar ese
 * servicio: así el checkout y el POS ven el mismo stock disponible y no venden dos veces la misma unidad.
 * La reserva vence a los {@code pos.qr.reserva-minutos}; el barrido la libera si la sesión no se pagó.
 */
@Service
public class PosQrStockReserva {

    private static final Logger log = LoggerFactory.getLogger(PosQrStockReserva.class);
    static final String MSG_NO_CONFIGURADA = "La reserva de stock del QR no está configurada.";

    @Autowired private ProductoRepository productoRepo;
    @Autowired private PosQrSesionRepository posQrRepo;
    @Autowired(required = false) private TransactionTemplate tx;

    @Value("${pos.qr.reserva-minutos:}")
    private String reservaMinutos;

    void setReservaMinutosParaTest(String v) { this.reservaMinutos = v; }

    /** Minutos de reserva; vacío, no numérico o ≤ 0 = no configurado (fail-closed: no se genera el QR). */
    int minutos() {
        try {
            int m = Integer.parseInt(reservaMinutos == null ? "" : reservaMinutos.trim());
            if (m > 0) return m;
        } catch (NumberFormatException ignored) {
            // cae al fail-closed
        }
        throw new IllegalStateException(MSG_NO_CONFIGURADA);
    }

    /** Reserva todas las líneas con bloqueo pesimista; si falta stock, nada queda reservado (rollback). */
    @Transactional
    public void reservar(PosQrSesion sesion, List<Map<String, Object>> items, LocalDateTime ahora) {
        int m = minutos();
        for (Map<String, Object> item : items) {
            Long productoId = PosQrSessionService.productoIdDe(item);
            int cantidad = PosQrSessionService.cantidadDe(item);
            Producto p = productoRepo.findByIdForUpdate(productoId)
                .orElseThrow(() -> new RecursoNoEncontradoException("Producto", productoId));
            if (p.getStockDisponible() < cantidad) {
                throw new StockInsuficienteException(p.getNombreProducto(), p.getStockDisponible(), cantidad);
            }
            p.setStockReservado(p.getStockReservado() + cantidad);
            productoRepo.save(p);
        }
        sesion.setStockReservado(true);
        sesion.setReservaExpira(ahora.plusMinutes(m));
    }

    /**
     * Devuelve las unidades reservadas por la sesión, una sola vez (marca atómica). Devuelve true si la
     * sesión tenía reserva y se liberó en esta llamada.
     */
    @Transactional
    public boolean liberar(PosQrSesion sesion, List<Map<String, Object>> items) {
        if (sesion.getId() == null || posQrRepo.soltarReserva(sesion.getId()) != 1) return false;
        sesion.setStockReservado(false);
        for (Map<String, Object> item : items) {
            Long productoId = PosQrSessionService.productoIdDe(item);
            int cantidad = PosQrSessionService.cantidadDe(item);
            productoRepo.findByIdForUpdate(productoId).ifPresent(p -> {
                p.setStockReservado(Math.max(0, p.getStockReservado() - cantidad));
                productoRepo.save(p);
            });
        }
        return true;
    }

    @Scheduled(fixedDelayString = "${pos.qr.reserva-barrido-ms:60000}", initialDelayString = "${pos.qr.reserva-barrido-ms:60000}")
    @SchedulerLock(name = "pos_qr_reserva_barrido", lockAtMostFor = "PT5M", lockAtLeastFor = "PT10S")
    public void barrer() {
        barrerVencidas(LocalDateTime.now(Constants.ZONA_CR));
    }

    /** Libera reservas de sesiones cerradas sin venta o vencidas. Cada sesión en su propia transacción. */
    int barrerVencidas(LocalDateTime ahora) {
        int liberadas = 0;
        for (PosQrSesion s : posQrRepo.reservasALiberar(ahora)) {
            try {
                List<Map<String, Object>> items = itemsDe(s);
                Boolean ok = tx != null ? tx.execute(st -> liberar(s, items)) : liberar(s, items);
                if (Boolean.TRUE.equals(ok)) liberadas++;
            } catch (RuntimeException e) {
                log.warn("[POS-QR] No se pudo liberar la reserva de la sesión {}: {}",
                    PosQrVentaService.mascararToken(s.getToken()), e.getMessage());
            }
        }
        return liberadas;
    }

    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER = new com.fasterxml.jackson.databind.ObjectMapper();

    static List<Map<String, Object>> itemsDe(PosQrSesion s) {
        try {
            return MAPPER.readValue(s.getItemsJson(), new com.fasterxml.jackson.core.type.TypeReference<>() {});
        } catch (Exception e) {
            throw new IllegalStateException("Ítems de la sesión ilegibles", e);
        }
    }
}
