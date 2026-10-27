package com.hotclick.service;

import com.hotclick.model.ColaFacturacionOffline;
import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.service.facturacion.ComprobanteXmlPreparer;
import com.hotclick.service.hacienda.ResultadoEnvioHacienda;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("#428 MEDIO-1 / BAJO-2 | reenvío de filas recuperadas y renovación del inicio por fila")
class FacturacionContingenciaReintento428Test {

    private static final String CLAVE = "50601012600310123456700100001010000000001100000001";

    private final ColaFacturacionOfflineTxOps txOps = mock(ColaFacturacionOfflineTxOps.class);
    private final ComprobanteFiscalRepository comprobanteRepo = mock(ComprobanteFiscalRepository.class);
    private final ComprobanteXmlPreparer preparer = mock(ComprobanteXmlPreparer.class);
    private final HaciendaApiClient hacienda = mock(HaciendaApiClient.class);
    private final FacturacionContingenciaService service =
        new FacturacionContingenciaService(txOps, comprobanteRepo, preparer, hacienda);
    private final Empresa empresa = new Empresa();

    @BeforeEach
    void setUp() {
        empresa.setId(1L);
        when(txOps.renovarInicioProceso(anyLong())).thenReturn(true);
        when(comprobanteRepo.findById(5L)).thenReturn(Optional.of(new ComprobanteFiscal()));
        when(preparer.preparar(5L)).thenReturn(new ComprobanteXmlPreparer.Preparado(5L, CLAVE, "<xml/>", empresa));
        when(hacienda.enviar(any(), eq(CLAVE), eq(empresa)))
            .thenReturn(ResultadoEnvioHacienda.rechazoRecepcion(400, "clave duplicada"));
    }

    private void procesar(int intentos) {
        ColaFacturacionOffline c = new ColaFacturacionOffline();
        c.setId(77L);
        c.setEmpresaId(1L);
        c.setComprobanteId(5L);
        c.setIntentos(intentos);
        when(txOps.reclamarLote(anyInt())).thenReturn(List.of(c));
        service.procesarPendientes();
    }

    @Test
    @DisplayName("Fila recuperada + 4xx al reenviar + Hacienda ya tiene la clave → COMPLETADA, no AGOTADA")
    void recuperadaYaRecibidaSeCompleta() {
        when(hacienda.consultarEstado(CLAVE, empresa)).thenReturn("procesando");
        procesar(1);
        verify(txOps).marcarCompletado(77L, 5L);
        verify(txOps, never()).marcarAgotado(anyLong(), any());
    }

    @Test
    @DisplayName("Fila recuperada + 4xx y Hacienda no conoce la clave (404) → AGOTADA como antes")
    void recuperadaNoRecibidaSeAgota() {
        when(hacienda.consultarEstado(CLAVE, empresa)).thenThrow(HttpClientErrorException.create(
            HttpStatus.NOT_FOUND, "nf", null, null, null));
        procesar(1);
        verify(txOps).marcarAgotado(77L, "clave duplicada");
        verify(txOps, never()).marcarCompletado(anyLong(), any());
    }

    @Test
    @DisplayName("Primer envío (intentos=0) con 4xx → AGOTADA sin consultar a Hacienda")
    void primerEnvioNoConsulta() {
        procesar(0);
        verify(txOps).marcarAgotado(77L, "clave duplicada");
        verify(hacienda, never()).consultarEstado(any(), any());
    }

    @Test
    @DisplayName("La consulta responde 429 → fallo transitorio (reintento), ni completada ni agotada")
    void consultaLimitadaReintenta() {
        when(hacienda.consultarEstado(CLAVE, empresa)).thenThrow(HttpClientErrorException.create(
            HttpStatus.TOO_MANY_REQUESTS, "rl", null, null, null));
        procesar(2);
        verify(txOps).marcarFallo(eq(77L), any());
        verify(txOps, never()).marcarAgotado(anyLong(), any());
        verify(txOps, never()).marcarCompletado(anyLong(), any());
    }

    @Test
    @DisplayName("BAJO-2: si la fila ya no está PROCESANDO al llegarle el turno, no se reenvía")
    void filaRecuperadaPorOtraCorridaNoSeEnvia() {
        when(txOps.renovarInicioProceso(77L)).thenReturn(false);
        procesar(0);
        verify(hacienda, never()).enviar(any(), any(), any());
        verifyNoMoreInteractions(preparer);
        verify(txOps, never()).marcarFallo(anyLong(), any());
    }
}
