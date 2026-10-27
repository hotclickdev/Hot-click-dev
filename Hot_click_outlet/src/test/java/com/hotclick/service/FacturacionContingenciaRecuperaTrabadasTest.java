package com.hotclick.service;

import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.service.facturacion.ComprobanteXmlPreparer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import java.time.Duration;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("#406 L4 | procesarPendientes recupera las trabadas antes de reclamar (bajo el lock del scheduler)")
class FacturacionContingenciaRecuperaTrabadasTest {

    private final ColaFacturacionOfflineTxOps txOps = mock(ColaFacturacionOfflineTxOps.class);
    private final FacturacionContingenciaService service = new FacturacionContingenciaService(
        txOps, mock(ComprobanteFiscalRepository.class), mock(ComprobanteXmlPreparer.class), mock(HaciendaApiClient.class));

    @Test
    @DisplayName("recupera primero (timeout por defecto 30 min) y luego reclama")
    void recuperaAntesDeReclamar() {
        when(txOps.reclamarLote(anyInt())).thenReturn(List.of());
        service.procesarPendientes();
        InOrder o = inOrder(txOps);
        o.verify(txOps).recuperarTrabadas(eq(Duration.ofMinutes(30)), anyInt());
        o.verify(txOps).reclamarLote(anyInt());
    }

    @Test
    @DisplayName("si la recuperación falla, igual reclama el lote (no frena la contingencia)")
    void fallaDeRecuperacionNoFrena() {
        when(txOps.recuperarTrabadas(any(), anyInt())).thenThrow(new IllegalStateException("db"));
        when(txOps.reclamarLote(anyInt())).thenReturn(List.of());
        service.procesarPendientes();
        verify(txOps).reclamarLote(anyInt());
    }
}
