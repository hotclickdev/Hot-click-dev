package com.hotclick.service.facturacion;

import com.hotclick.model.ComprobanteFiscal;
import com.hotclick.model.Empresa;
import com.hotclick.repository.ComprobanteFiscalRepository;
import com.hotclick.service.FacturacionContingenciaService;
import com.hotclick.service.HaciendaApiClient;
import com.hotclick.service.hacienda.ComprobanteInvalidoException;
import com.hotclick.service.hacienda.HaciendaConfiguracionException;
import com.hotclick.service.hacienda.HaciendaTransitoriaException;
import com.hotclick.service.hacienda.ResultadoEnvioHacienda;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DisplayName("FacturacionEnvioProcessor — HTTP fuera de transacción, nunca ENVIADO sin recepción")
class FacturacionEnvioProcessorTest {

    /** Transaction manager real de Spring (sin BD) para saber si hay transacción activa. */
    static class TxManagerDePrueba extends AbstractPlatformTransactionManager {
        @Override protected Object doGetTransaction() { return new Object(); }
        @Override protected void doBegin(Object t, TransactionDefinition d) {}
        @Override protected void doCommit(DefaultTransactionStatus s) {}
        @Override protected void doRollback(DefaultTransactionStatus s) {}
    }

    private final ComprobanteFiscalRepository repo = mock(ComprobanteFiscalRepository.class);
    private final ComprobanteXmlPreparer preparer = mock(ComprobanteXmlPreparer.class);
    private final HaciendaApiClient client = mock(HaciendaApiClient.class);
    private final FacturacionContingenciaService contingencia = mock(FacturacionContingenciaService.class);
    private final List<String> estadosGuardados = new ArrayList<>();
    private ComprobanteFiscal cf;
    private FacturacionEnvioProcessor processor;

    @BeforeEach
    void setUp() {
        cf = new ComprobanteFiscal();
        cf.setId(10L);
        cf.setClaveNumerica("clave");
        cf.setEstado(ComprobanteFiscal.ESTADO_PENDIENTE);
        cf.setEmpresa(empresaCompleta());
        when(repo.findById(10L)).thenReturn(Optional.of(cf));
        when(repo.save(any())).thenAnswer(i -> {
            estadosGuardados.add(((ComprobanteFiscal) i.getArgument(0)).getEstado());
            return i.getArgument(0);
        });
        when(repo.reclamarEnvio(eq(10L), anyInt())).thenReturn(1);
        when(preparer.preparar(10L)).thenReturn(new ComprobanteXmlPreparer.Preparado(10L, "clave", "<firmado/>", cf.getEmpresa()));
        processor = new FacturacionEnvioProcessor(repo, preparer, client, contingencia, new TxManagerDePrueba());
    }

    @Test
    @DisplayName("la llamada HTTP a Hacienda corre sin transacción activa")
    void httpFueraDeTransaccion() {
        boolean[] enTx = {true};
        when(client.enviar(any(), any(), any())).thenAnswer(i -> {
            enTx[0] = TransactionSynchronizationManager.isActualTransactionActive();
            return ResultadoEnvioHacienda.recibido(202);
        });
        processor.procesarComprobante(10L);
        assertThat(enTx[0]).isFalse();
        assertThat(cf.getEstado()).isEqualTo(ComprobanteFiscal.ESTADO_ENVIADO);
    }

    @Test
    @DisplayName("sin usuario ATV queda PENDIENTE_CONFIG, nunca ENVIADO, y no se llama a Hacienda")
    void sinAtvNuncaEnviado() {
        cf.getEmpresa().setUsuarioHacienda(null);
        processor.procesarComprobante(10L);
        assertThat(cf.getEstado()).isEqualTo(ComprobanteFiscal.ESTADO_PENDIENTE_CONFIG);
        assertThat(estadosGuardados).doesNotContain(ComprobanteFiscal.ESTADO_ENVIADO);
        verifyNoInteractions(client);
        verify(contingencia, never()).encolar(any());
    }

    @Test
    @DisplayName("si el cliente detecta falta de credenciales o token, queda PENDIENTE_CONFIG")
    void tokenVacioPendienteConfig() {
        when(client.enviar(any(), any(), any())).thenThrow(new HaciendaConfiguracionException("sin token"));
        processor.procesarComprobante(10L);
        assertThat(cf.getEstado()).isEqualTo(ComprobanteFiscal.ESTADO_PENDIENTE_CONFIG);
        assertThat(estadosGuardados).doesNotContain(ComprobanteFiscal.ESTADO_ENVIADO);
    }

    @Test
    @DisplayName("falla transitoria → ERROR y a contingencia")
    void transitoriaAContingencia() {
        when(client.enviar(any(), any(), any())).thenThrow(new HaciendaTransitoriaException("503", null));
        processor.procesarComprobante(10L);
        assertThat(cf.getEstado()).isEqualTo(ComprobanteFiscal.ESTADO_ERROR);
        verify(contingencia).encolar(10L);
        assertThat(estadosGuardados).doesNotContain(ComprobanteFiscal.ESTADO_ENVIADO);
    }

    @Test
    @DisplayName("rechazo 4xx → ERROR con el motivo, sin reencolar el mismo XML")
    void rechazoSinContingencia() {
        when(client.enviar(any(), any(), any())).thenReturn(ResultadoEnvioHacienda.rechazoRecepcion(400, "Clave duplicada"));
        processor.procesarComprobante(10L);
        assertThat(cf.getEstado()).isEqualTo(ComprobanteFiscal.ESTADO_ERROR);
        assertThat(cf.getMensajeHacienda()).isEqualTo("Clave duplicada");
        verify(contingencia, never()).encolar(any());
    }

    @Test
    @DisplayName("XML que no cumple el XSD oficial → ERROR, no se envía")
    void xsdInvalidoNoEnvia() {
        when(preparer.preparar(10L)).thenThrow(new ComprobanteInvalidoException("cvc-...", null));
        processor.procesarComprobante(10L);
        assertThat(cf.getEstado()).isEqualTo(ComprobanteFiscal.ESTADO_ERROR);
        verifyNoInteractions(client);
    }

    @Test
    @DisplayName("si otra ejecución ya reclamó el envío, no se manda dos veces")
    void reclamoPerdidoNoEnvia() {
        when(repo.reclamarEnvio(eq(10L), anyInt())).thenReturn(0);
        processor.procesarComprobante(10L);
        verifyNoInteractions(client);
    }

    private static Empresa empresaCompleta() {
        Empresa e = new Empresa();
        e.setId(3L);
        e.setCedulaJuridica("3101000000");
        e.setActividadEconomica("722003");
        e.setUsuarioHacienda("usuario-prueba");
        e.setClaveHaciendaEnc("cifrado");
        e.setCertP12Path("certificados/3/x.p12");
        e.setPinCertEnc("pin");
        return e;
    }
}
