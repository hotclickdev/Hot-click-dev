package com.hotclick.service.billing;

import com.hotclick.model.BillingLedger;
import com.hotclick.model.Empresa;
import com.hotclick.repository.BillingLedgerRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("BillingLedgerWriter — idempotencia")
class BillingLedgerWriterTest {

    @Mock BillingLedgerRepository ledgerRepo;
    @InjectMocks BillingLedgerWriter writer;

    @Test
    @DisplayName("No duplica si ya existe la misma referencia y tipo")
    void noDuplicaReferencia() {
        Empresa e = new Empresa();
        e.setId(10L);
        when(ledgerRepo.existsByReferenciaExternaAndTipo("inv_1", BillingLedger.TIPO_COBRO_OK))
            .thenReturn(true);

        writer.registrar(e, null, BillingLedger.TIPO_COBRO_OK, "STRIPE", "inv_1", 9900, "crc", "ok");

        verify(ledgerRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Persiste evento nuevo y recorta detalle largo")
    void persisteYTrunca() {
        Empresa e = new Empresa();
        e.setId(10L);
        when(ledgerRepo.existsByReferenciaExternaAndTipo("inv_2", BillingLedger.TIPO_COBRO_FALLIDO))
            .thenReturn(false);

        writer.registrar(e, null, BillingLedger.TIPO_COBRO_FALLIDO, "ONVO", "inv_2",
            100, "CRC", "x".repeat(600));

        ArgumentCaptor<BillingLedger> cap = ArgumentCaptor.forClass(BillingLedger.class);
        verify(ledgerRepo).save(cap.capture());
        assertThat(cap.getValue().getDetalle()).hasSize(500);
        assertThat(cap.getValue().getMoneda()).isEqualTo("crc");
        assertThat(cap.getValue().getTipo()).isEqualTo(BillingLedger.TIPO_COBRO_FALLIDO);
    }
}
