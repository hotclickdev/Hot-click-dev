package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.Periodo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

import java.util.List;

/** Genera la factura pendiente de varios negocios; cada uno en su propia transacción (si uno falla, sigue el resto). */
@Component
public class FacturaNegocioGeneracionLotes {

    private static final Logger log = LoggerFactory.getLogger(FacturaNegocioGeneracionLotes.class);

    private final FacturaNegocioGeneradorUno uno;

    public FacturaNegocioGeneracionLotes(FacturaNegocioGeneradorUno uno) { this.uno = uno; }

    public int generar(List<Long> empresaIds, Periodo periodo) {
        int creadas = 0;
        for (Long id : empresaIds) {
            try {
                if (uno.generar(id, periodo)) creadas++;
            } catch (DataIntegrityViolationException e) {
                // Otra instancia la creó al mismo tiempo (índice único empresa + quincena): ya existe.
                log.info("[factura-negocio] empresa={} ya tenía registro de la quincena", id);
            } catch (RuntimeException e) {
                log.warn("[factura-negocio] no se generó la de empresa={}: {}", id, e.getClass().getSimpleName());
            }
        }
        return creadas;
    }
}
