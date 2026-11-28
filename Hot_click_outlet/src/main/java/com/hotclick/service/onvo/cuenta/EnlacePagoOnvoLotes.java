package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.EnlacePagoOnvo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Operaciones sobre varios enlaces de pago: cada uno es una llamada distinta a ONVO, no una consulta en lote. */
@Component
public class EnlacePagoOnvoLotes {

    private static final Logger log = LoggerFactory.getLogger(EnlacePagoOnvoLotes.class);

    private final EnlacePagoOnvoService enlaces;

    public EnlacePagoOnvoLotes(EnlacePagoOnvoService enlaces) { this.enlaces = enlaces; }

    /**
     * Al aprobarse una factura del negocio: cancela solo los enlaces abiertos atados a ESA factura. Un enlace sin
     * factura (o de otra quincena) no se toca. Nunca lanza; devuelve cuántos quedaron cancelados.
     */
    public int alRecibirFactura(Long empresaId, Long facturaNegocioId) {
        int cancelados = 0;
        for (Long id : enlaces.idsAbiertosDeFactura(empresaId, facturaNegocioId)) {
            try {
                if (EnlacePagoOnvo.CANCELADO.equals(enlaces.cancelar(id).getEstado())) cancelados++;
            } catch (RuntimeException ex) {
                log.warn("[onvo-enlace] No se pudo cancelar id={} al recibir factura: {}", id, ex.getClass().getSimpleName());
            }
        }
        return cancelados;
    }

    /** Red de seguridad si se pierde el webhook: cierra como PAGADO o EXPIRADO lo que ONVO ya resolvió. */
    public void conciliar() {
        for (Long id : enlaces.idsAbiertosLote()) {
            try {
                enlaces.conciliarUno(id);
            } catch (RuntimeException ex) {
                log.warn("[onvo-enlace] Conciliación falló id={}: {}", id, ex.getClass().getSimpleName());
            }
        }
    }
}
