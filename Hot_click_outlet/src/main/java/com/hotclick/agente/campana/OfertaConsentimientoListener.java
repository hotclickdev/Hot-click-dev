package com.hotclick.agente.campana;

import com.hotclick.agente.canal.CanalCuentaService;
import com.hotclick.agente.enlace.EnlaceCompra;
import com.hotclick.agente.enlace.EnlaceCompraRepository;
import com.hotclick.agente.pago.PedidoBotPagadoEvent;
import com.hotclick.agente.webhook.MensajeEntrante;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Locale;

/**
 * Tras el pago de un pedido del bot, ofrece el opt-in de campañas por la misma conversación. Después del COMMIT y en
 * otro hilo: un fallo aquí nunca toca el cobro.
 */
@Component
public class OfertaConsentimientoListener {

    private static final Logger log = LoggerFactory.getLogger(OfertaConsentimientoListener.class);

    private final EnlaceCompraRepository enlaces;
    private final CanalCuentaService cuentas;
    private final OfertaConsentimientoService oferta;

    public OfertaConsentimientoListener(EnlaceCompraRepository enlaces, CanalCuentaService cuentas,
                                        OfertaConsentimientoService oferta) {
        this.enlaces = enlaces;
        this.cuentas = cuentas;
        this.oferta = oferta;
    }

    @Async("taskExecutor")
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alPagar(PedidoBotPagadoEvent ev) {
        try {
            EnlaceCompra e = enlaces.findById(ev.enlaceId()).orElse(null);
            if (e == null || e.getEmpresaId() == null || e.getContactoExterno() == null) return;
            MensajeEntrante.Canal tipo = MensajeEntrante.Canal.valueOf(e.getCanal().toUpperCase(Locale.ROOT));
            cuentas.activaDe(e.getEmpresaId(), tipo).ifPresent(c -> oferta.ofrecer(c, e.getContactoExterno()));
        } catch (RuntimeException ex) {
            log.warn("[campana-consent] no se pudo ofrecer el opt-in tras el pago: {}", ex.getClass().getSimpleName());
        }
    }
}
