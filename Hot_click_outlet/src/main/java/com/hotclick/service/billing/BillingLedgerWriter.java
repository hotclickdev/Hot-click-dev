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
 * Idempotente por (referenciaExterna, tipo) cuando hay referencia. La moneda es obligatoria: es la real del cobro.
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
        if (moneda == null || moneda.isBlank()) {
            // Fail-closed: el ledger registra la moneda real del cobro; sin ella no se escribe (no hay "crc" por defecto).
            log.error("[ALERTA-PAGO] [billing-ledger] Sin moneda, no se registra tipo={} proveedor={}", tipo, proveedor);
            throw new IllegalArgumentException("Ledger sin moneda");
        }
        BillingLedger entry = new BillingLedger();
        entry.setEmpresa(empresa);
        entry.setSuscripcion(sub);
        entry.setTipo(tipo);
        entry.setProveedor(proveedor);
        entry.setReferenciaExterna(blankToNull(referenciaExterna));
        entry.setMontoCentavos(montoCentavos);
        entry.setMoneda(moneda.trim().toLowerCase(java.util.Locale.ROOT));
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
