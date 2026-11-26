package com.hotclick.agente.enlace;

import com.hotclick.model.Producto;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * AG-07 / AG-09: abre el enlace. Recalcula el precio actual, detecta cambios de precio y stock, marca ABIERTO y
 * reserva el stock {@code reserva-minutos} (30 por defecto). Abrir de nuevo renueva la reserva (no la duplica).
 * Código inexistente, mal formado, vencido o ya pagado/cancelado: {@link Optional#empty()} sin distinguir (→ 404).
 */
@Service
public class EnlaceCompraAperturaService {

    private static final Logger log = LoggerFactory.getLogger(EnlaceCompraAperturaService.class);

    private final EnlaceCompraRepository repo;
    private final EnlaceCompraReserva reserva;
    private final int reservaMinutos;
    private final int reservaMaxMinutos;
    Supplier<LocalDateTime> reloj = () -> LocalDateTime.now(Constants.ZONA_CR);

    public EnlaceCompraAperturaService(EnlaceCompraRepository repo, EnlaceCompraReserva reserva,
                                       @Value("${hotclick.agente.enlace.reserva-minutos:30}") int reservaMinutos,
                                       @Value("${hotclick.agente.enlace.reserva-max-minutos:90}") int reservaMaxMinutos) {
        this.repo = repo;
        this.reserva = reserva;
        this.reservaMinutos = reservaMinutos;
        this.reservaMaxMinutos = Math.max(reservaMinutos, reservaMaxMinutos);
    }

    @Transactional
    public Optional<EnlaceAbiertoDto> abrir(String codigo) {
        if (!CodigoEnlace.formatoValido(codigo)) return Optional.empty();
        EnlaceCompra e = repo.findByCodigoForUpdate(codigo).orElse(null);
        LocalDateTime ahora = reloj.get();
        if (e == null || !e.estaVigente(ahora)) {
            log.info("[enlace] código no disponible {}", CodigoEnlace.paraLog(codigo));
            return Optional.empty();
        }

        Map<Long, Producto> productos = reserva.bloquear(e);
        // Reabrir renueva: primero se devuelve lo reservado antes y luego se reserva con el stock de ahora.
        reserva.liberar(e, productos);

        // H-04: la reserva no se renueva más allá de reservaMaxMinutos desde la primera apertura. Pasado el tope el
        // enlace sigue abriendo y se revalida precio y stock, pero ya no retiene inventario.
        LocalDateTime topeReserva = e.getAbierto() == null ? null : e.getAbierto().plusMinutes(reservaMaxMinutos);
        boolean puedeReservar = topeReserva == null || ahora.isBefore(topeReserva);
        EnlaceCompraRecalculo.Resultado r = EnlaceCompraRecalculo.recalcular(e, productos, puedeReservar);
        e.setReservaHasta(EnlaceCompraRecalculo.reservaHasta(r, ahora, reservaMinutos, topeReserva));
        if (r.algunaReserva()) reserva.guardarProductos(productos.values());
        if (e.getAbierto() == null || e.getEstado() == EnlaceCompraEstado.RECHAZADO) e.setAbierto(ahora);
        e.setEstado(EnlaceCompraEstado.ABIERTO);
        repo.save(e);

        return Optional.of(new EnlaceAbiertoDto(e.getVence(), e.getReservaHasta(), e.getNombreCliente(),
            mascara(e), r.precioCambio(), r.stockCambio(), e.getPrecioTotalCreado(), r.totalActual(), r.items()));
    }

    /** Solo WhatsApp (el contacto es un número). Deja los últimos 4 dígitos: «****5678». */
    static String mascara(EnlaceCompra e) {
        if (!"WHATSAPP".equals(e.getCanal()) || e.getContactoExterno() == null) return null;
        String d = e.getContactoExterno().replaceAll("\\D", "");
        if (d.length() < 8) return null;
        return "****" + d.substring(d.length() - 4);
    }
}
