package com.hotclick.service.billing;

import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.model.Suscripcion;
import com.hotclick.repository.BillingLedgerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Escribe eventos al ledger de billing de plataforma.
 * Idempotente por (referenciaExterna, tipo) cuando hay referencia.
 */
@Service
public class BillingLedgerWriter {

    private static final Logger log = LoggerFactory.getLogger(BillingLedgerWriter.class);
    private static final int MAX_DETALLE = 500;

    private final BillingLedgerRepository ledgerRepo;

    public BillingLedgerWriter(BillingLedgerRepository ledgerRepo) {
        this.ledgerRepo = ledgerRepo;
    }

    @Transactional
    public void registrar(Empresa empresa, Suscripcion sub, String tipo, String proveedor,
                          String referenciaExterna, Integer montoCentavos, String moneda,
                          String detalle) {
        if (empresa == null || tipo == null || tipo.isBlank()) {
            return;
        }
        if (referenciaExterna != null && !referenciaExterna.isBlank()
                && ledgerRepo.existsByReferenciaExternaAndTipo(referenciaExterna, tipo)) {
            log.debug("[billing-ledger] Ya registrado tipo={} ref={}", tipo, referenciaExterna);
            return;
        }
        BillingLedger entry = new BillingLedger();
        entry.setEmpresa(empresa);
        entry.setSuscripcion(sub);
        entry.setTipo(tipo);
        entry.setProveedor(proveedor);
        entry.setReferenciaExterna(blankToNull(referenciaExterna));
        entry.setMontoCentavos(montoCentavos);
        if (moneda != null && !moneda.isBlank()) {
            entry.setMoneda(moneda.toLowerCase());
        }
        entry.setDetalle(truncar(detalle));
        ledgerRepo.save(entry);
    }

    private static String blankToNull(String v) {
        return v == null || v.isBlank() ? null : v;
    }

    private static String truncar(String detalle) {
        if (detalle == null) return null;
        return detalle.length() <= MAX_DETALLE ? detalle : detalle.substring(0, MAX_DETALLE);
    }
}
