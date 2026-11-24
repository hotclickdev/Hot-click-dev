package com.hotclick.agente.enlace;

import com.hotclick.dto.PaymentCheckoutRequest;
import com.hotclick.model.Pedido;
import com.hotclick.utils.Constants;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Puente entre el enlace y el checkout existente ({@code PaymentService.checkout}), dentro de su misma transacción:
 * <ol>
 *   <li>{@link #preparar}: si el request trae {@code enlaceCodigo} válido y ABIERTO, libera la reserva del enlace (el
 *       pedido reservará lo suyo) y, si el comprador no escribió teléfono, usa el de su WhatsApp. El teléfono
 *       completo nunca viaja al navegador: por eso la página solo recibe la versión enmascarada.</li>
 *   <li>{@link #vincular}: ata pedidos ↔ enlace y marca la atribución «venta del bot». El estado del enlace sigue
 *       ABIERTO hasta que AG-08 confirme el pago.</li>
 * </ol>
 * Un código inválido o ajeno nunca bloquea la compra: simplemente no vincula.
 */
@Service
public class EnlaceCompraVinculo {

    private static final Logger log = LoggerFactory.getLogger(EnlaceCompraVinculo.class);

    private final EnlaceCompraRepository repo;
    private final EnlaceCompraReserva reserva;
    Supplier<LocalDateTime> reloj = () -> LocalDateTime.now(Constants.ZONA_CR);

    public EnlaceCompraVinculo(EnlaceCompraRepository repo, EnlaceCompraReserva reserva) {
        this.repo = repo;
        this.reserva = reserva;
    }

    /** @return id del enlace vinculado, o empty si el request no trae enlace utilizable. */
    @Transactional
    public Optional<Long> preparar(PaymentCheckoutRequest req) {
        String codigo = req == null ? null : req.getEnlaceCodigo();
        if (!CodigoEnlace.formatoValido(codigo)) return Optional.empty();
        EnlaceCompra e = repo.findByCodigoForUpdate(codigo).orElse(null);
        if (e == null || !e.estaVigente(reloj.get())) {
            log.info("[enlace] checkout con código no utilizable {}", CodigoEnlace.paraLog(codigo));
            return Optional.empty();
        }
        reserva.liberar(e);
        repo.save(e);
        if (req.getGuestPhone() == null || req.getGuestPhone().isBlank()) {
            String tel = telefonoNacionalCr(e);
            if (tel != null) req.setGuestPhone(tel);
        }
        return Optional.of(e.getId());
    }

    @Transactional
    public void vincular(Long enlaceId, List<Pedido> pedidos) {
        if (enlaceId == null || pedidos == null || pedidos.isEmpty()) return;
        EnlaceCompra e = repo.findById(enlaceId).orElse(null);
        if (e == null) return;
        EnlaceItems.atribuir(e, pedidos);
        repo.save(e);
    }

    /** 8 dígitos si el contacto de WhatsApp es un número de Costa Rica (506 + 8 dígitos); si no, null. */
    static String telefonoNacionalCr(EnlaceCompra e) {
        if (!"WHATSAPP".equals(e.getCanal()) || e.getContactoExterno() == null) return null;
        String d = e.getContactoExterno().replaceAll("\\D", "");
        return d.length() == 11 && d.startsWith("506") ? d.substring(3) : null;
    }
}
