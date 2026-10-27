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

    @Test
    @DisplayName("B2: un cobro ONVO sin moneda falla cerrado: no se guarda ni cae a crc (COBRO_FALLIDO y CANCELACION)")
    void onvoSinMonedaFallaCerrado() {
        Empresa e = new Empresa();
        e.setId(10L);
        for (String tipo : new String[]{BillingLedger.TIPO_COBRO_FALLIDO, BillingLedger.TIPO_CANCELACION}) {
            for (String sinMoneda : new String[]{null, "", "  "}) {
                org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                    writer.registrar(e, null, tipo, BillingLedger.PROVEEDOR_ONVO, "clsub", null, sinMoneda, "x"))
                    .isInstanceOf(IllegalArgumentException.class);
            }
        }
        verify(ledgerRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("B2: ONVO con moneda se guarda en minúsculas; otros proveedores (Stripe/Tilopay) conservan su comportamiento previo")
    void onvoConMonedaYOtrosProveedoresSinCambio() {
        Empresa e = new Empresa();
        e.setId(10L);
        writer.registrar(e, null, BillingLedger.TIPO_COBRO_FALLIDO, BillingLedger.PROVEEDOR_ONVO, "clsub", null, "USD", "x");
        writer.registrar(e, null, BillingLedger.TIPO_CANCELACION, "STRIPE", "sub_s", null, null, "x");
        ArgumentCaptor<BillingLedger> cap = ArgumentCaptor.forClass(BillingLedger.class);
        verify(ledgerRepo, org.mockito.Mockito.times(2)).save(cap.capture());
        assertThat(cap.getAllValues().get(0).getMoneda()).isEqualTo("usd");
        assertThat(cap.getAllValues().get(1).getMoneda()).isEqualTo("crc"); // Stripe: sin cambio en este PR
    }
}
