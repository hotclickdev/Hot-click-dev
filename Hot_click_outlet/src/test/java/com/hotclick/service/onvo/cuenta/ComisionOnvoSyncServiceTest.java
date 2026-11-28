package com.hotclick.service.onvo.cuenta;

import com.hotclick.model.Empresa;
import com.hotclick.model.EmpresaCuentaOnvo;
import com.hotclick.repository.EmpresaCuentaOnvoRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.service.fiscal.ComisionEfectivaService;
import com.hotclick.service.onvo.cuenta.ComisionOnvoSyncService.Resultado;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.client.ResourceAccessException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@DisplayName("Comisión ONVO por negocio: solo se sincroniza cuando cambia, y los fallos quedan pendientes")
class ComisionOnvoSyncServiceTest {

    private EmpresaCuentaOnvoRepository repo;
    private EmpresaRepository empresaRepo;
    private ComisionEfectivaService comision;
    private OnvoCuentaConectadaClient client;
    private EmpresaCuentaOnvo cuenta;
    private Empresa empresa;

    @BeforeEach
    void setUp() {
        repo = mock(EmpresaCuentaOnvoRepository.class);
        empresaRepo = mock(EmpresaRepository.class);
        comision = mock(ComisionEfectivaService.class);
        client = mock(OnvoCuentaConectadaClient.class);
        empresa = new Empresa();
        empresa.setId(7L);
        cuenta = new EmpresaCuentaOnvo();
        cuenta.setEmpresaId(7L);
        cuenta.setOnvoAccountId("cl_abc123");
        when(repo.findByEmpresaId(7L)).thenReturn(Optional.of(cuenta));
        when(repo.save(any())).thenAnswer(i -> i.getArgument(0));
        when(empresaRepo.findById(7L)).thenReturn(Optional.of(empresa));
        when(comision.porcentajeEfectivo(empresa)).thenReturn(new BigDecimal("9.00"));
    }

    private ComisionOnvoSyncService svc(boolean habilitado) {
        return new ComisionOnvoSyncService(repo, empresaRepo, comision, client,
            mock(PlatformTransactionManager.class), habilitado, 100);
    }

    @Test
    @DisplayName("Primera vez: envía el % efectivo y guarda valor y fecha")
    void primeraVez() {
        assertThat(svc(true).sincronizar(7L, false)).isEqualTo(Resultado.SINCRONIZADO);
        verify(client).actualizarComision("cl_abc123", new BigDecimal("9.00"));
        assertThat(cuenta.getFeeEnviadoPct()).isEqualByComparingTo("9.00");
        assertThat(cuenta.getFeeEnviadoEn()).isNotNull();
        assertThat(cuenta.isFeePendiente()).isFalse();
    }

    @Test
    @DisplayName("Idempotente: sin cambio no llama a ONVO; con cambio de plan o de situación fiscal sí")
    void soloSiCambia() {
        ComisionOnvoSyncService s = svc(true);
        s.sincronizar(7L, false);
        assertThat(s.sincronizar(7L, false)).isEqualTo(Resultado.SIN_CAMBIO);
        verify(client, times(1)).actualizarComision(anyString(), any());

        when(comision.porcentajeEfectivo(empresa)).thenReturn(new BigDecimal("23.00"));
        assertThat(s.sincronizar(7L, false)).isEqualTo(Resultado.SINCRONIZADO);
        verify(client).actualizarComision("cl_abc123", new BigDecimal("23.00"));
    }

    @Test
    @DisplayName("El botón del ADMIN (forzar) reenvía aunque no haya cambio")
    void forzar() {
        ComisionOnvoSyncService s = svc(true);
        s.sincronizar(7L, false);
        assertThat(s.sincronizar(7L, true)).isEqualTo(Resultado.SINCRONIZADO);
        verify(client, times(2)).actualizarComision(anyString(), any());
    }

    @Test
    @DisplayName("Fallo de ONVO: queda pendiente, cuenta intento y no guarda el valor; el reintento lo resuelve")
    void falloYReintento() {
        doThrow(new ResourceAccessException("timeout")).when(client).actualizarComision(anyString(), any());
        ComisionOnvoSyncService s = svc(true);
        assertThat(s.sincronizar(7L, false)).isEqualTo(Resultado.PENDIENTE);
        assertThat(cuenta.isFeePendiente()).isTrue();
        assertThat(cuenta.getFeeIntentos()).isEqualTo(1);
        assertThat(cuenta.getFeeEnviadoPct()).isNull();
        assertThat(cuenta.getFeeUltimoError()).contains("ResourceAccessException").doesNotContain("timeout");

        doNothing().when(client).actualizarComision(anyString(), any());
        assertThat(s.sincronizar(7L, false)).isEqualTo(Resultado.SINCRONIZADO);
        assertThat(cuenta.isFeePendiente()).isFalse();
        assertThat(cuenta.getFeeIntentos()).isZero();
    }

    @Test
    @DisplayName("ONVO deshabilitado o sin llave: pendiente sin contar intento")
    void sinOnvo() {
        assertThat(svc(false).sincronizar(7L, false)).isEqualTo(Resultado.PENDIENTE);
        verifyNoInteractions(client);
        doThrow(new OnvoCuentaConectadaClient.OnvoNoConfiguradoException("x")).when(client).actualizarComision(anyString(), any());
        assertThat(svc(true).sincronizar(7L, false)).isEqualTo(Resultado.PENDIENTE);
        assertThat(cuenta.getFeeIntentos()).isZero();
    }

    @Test
    @DisplayName("Sin cuenta conectada o sin id de ONVO: no hace nada")
    void sinCuenta() {
        cuenta.setOnvoAccountId(null);
        assertThat(svc(true).sincronizar(7L, true)).isEqualTo(Resultado.SIN_CUENTA);
        verifyNoInteractions(client);
    }

    @Test
    @DisplayName("Conciliación (poller): reintenta pendientes y detecta cambios sin tocar los servicios fiscales")
    void conciliacion() {
        cuenta.setFeeEnviadoPct(new BigDecimal("9.00"));
        when(repo.findByOnvoAccountIdIsNotNullOrderByIdAsc(any(Pageable.class))).thenReturn(List.of(cuenta));
        ComisionOnvoSyncService s = svc(true);
        ComisionOnvoSyncPoller poller = new ComisionOnvoSyncPoller(s, mock(EnlacePagoOnvoLotes.class));
        assertThat(poller.conciliarComisiones()).isEqualTo(1);
        verifyNoInteractions(client);

        when(comision.porcentajeEfectivo(empresa)).thenReturn(new BigDecimal("7.50"));
        assertThat(poller.conciliarComisiones()).isEqualTo(1);
        verify(client).actualizarComision("cl_abc123", new BigDecimal("7.50"));
    }

    @Test
    @DisplayName("Estado para la ficha: pendiente si el enviado no coincide con el efectivo")
    void estado() {
        cuenta.setFeeEnviadoPct(new BigDecimal("6.00"));
        var e = svc(true).estado(7L);
        assertThat(e.efectivoPct()).isEqualByComparingTo("9.00");
        assertThat(e.enviadoPct()).isEqualByComparingTo("6.00");
        assertThat(e.pendiente()).isTrue();
        assertThat(e.tieneCuenta()).isTrue();
    }
}
