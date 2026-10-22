package com.hotclick.service;

import com.hotclick.model.WalletAcreditacionFallida;
import com.hotclick.repository.WalletAcreditacionFallidaRepository;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WalletDlqTxOpsTest {

    private WalletAcreditacionFallidaRepository repo;
    private SimpleMeterRegistry registry;
    private WalletDlqTxOps ops;

    @BeforeEach
    void setUp() {
        repo = mock(WalletAcreditacionFallidaRepository.class);
        registry = new SimpleMeterRegistry();
        ops = new WalletDlqTxOps(repo, registry);
    }

    private WalletAcreditacionFallida item(int intentos, int max) {
        WalletAcreditacionFallida i = new WalletAcreditacionFallida();
        i.setId(1L);
        i.setPedidoId(10L);
        i.setEmpresaId(2L);
        i.setIntentos(intentos);
        i.setMaxIntentos(max);
        when(repo.findById(1L)).thenReturn(Optional.of(i));
        return i;
    }

    private double agotados() {
        return registry.counter(WalletDlqTxOps.METRICA_AGOTADO).count();
    }

    @Test
    void backoffExponencialConTope() {
        assertEquals(2, WalletDlqTxOps.calcularBackoffMinutos(1));
        assertEquals(64, WalletDlqTxOps.calcularBackoffMinutos(6));
        assertEquals(120, WalletDlqTxOps.calcularBackoffMinutos(7));
        assertEquals(120, WalletDlqTxOps.calcularBackoffMinutos(64));
        assertEquals(120, WalletDlqTxOps.calcularBackoffMinutos(Integer.MAX_VALUE));
    }

    private void updatesAfectan(int filas) {
        when(repo.registrarFalloSiPendiente(anyLong(), anyInt(), anyInt(), anyString(), any(), any())).thenReturn(filas);
        when(repo.marcarProcesadoSiPendiente(anyLong(), any())).thenReturn(filas);
        when(repo.marcarAgotadoSiPendiente(anyLong(), any())).thenReturn(filas);
    }

    @Test
    void falloAplicaBackoffTopadoEnDosHoras() {
        item(8, 50);
        updatesAfectan(1);
        LocalDateTime antes = LocalDateTime.now(com.hotclick.utils.Constants.ZONA_CR);

        ops.marcarFallo(1L, "error");

        org.mockito.ArgumentCaptor<LocalDateTime> prox = org.mockito.ArgumentCaptor.forClass(LocalDateTime.class);
        verify(repo).registrarFalloSiPendiente(eq(1L), eq(8), eq(9),
            eq(WalletAcreditacionFallida.PENDIENTE_REINTENTO), eq("error"), prox.capture());
        long min = Duration.between(antes, prox.getValue()).toMinutes();
        assertTrue(min >= 119 && min <= 120, "backoff=" + min);
        assertEquals(0.0, agotados());
        verify(repo, never()).save(any());
    }

    @Test
    void agotadoIncrementaMetricaDeAlerta() {
        item(9, 10);
        updatesAfectan(1);

        ops.marcarFallo(1L, "error final");

        verify(repo).registrarFalloSiPendiente(eq(1L), eq(9), eq(10),
            eq(WalletAcreditacionFallida.AGOTADO), eq("error final"), any());
        assertEquals(1.0, agotados());
    }

    @Test
    void marcarFalloIgnoraItemsNoPendientes() {
        WalletAcreditacionFallida i = item(3, 10);
        i.setEstado(WalletAcreditacionFallida.PROCESADO);

        ops.marcarFallo(1L, "tarde");

        verify(repo, never()).registrarFalloSiPendiente(anyLong(), anyInt(), anyInt(), anyString(), any(), any());
        verify(repo, never()).save(any());
    }

    @Test
    void carreraEntreLecturaYUpdateNoAlertaNiPisa() {
        item(9, 10);
        updatesAfectan(0); // otro proceso cerró el ítem entre findById y el UPDATE

        ops.marcarFallo(1L, "x");
        ops.marcarProcesado(1L);
        ops.marcarAgotadoSinCredito(1L, "x");

        assertEquals(0.0, agotados());
        verify(repo, never()).save(any());
    }

    @Test
    void agotadoSinCreditoMarcaAgotadoYAlerta() {
        updatesAfectan(1);

        ops.marcarAgotadoSinCredito(1L, "pedidoId nulo");

        verify(repo).marcarAgotadoSiPendiente(1L, "pedidoId nulo");
        assertEquals(1.0, agotados());
    }

    @Test
    void transaccionesDeTransicionTienenTimeoutCorto() throws Exception {
        for (String m : new String[]{"marcarProcesado", "marcarFallo", "marcarAgotadoSinCredito"}) {
            java.lang.reflect.Method met = java.util.Arrays.stream(WalletDlqTxOps.class.getMethods())
                .filter(x -> x.getName().equals(m)).findFirst().orElseThrow();
            int t = met.getAnnotation(org.springframework.transaction.annotation.Transactional.class).timeout();
            assertTrue(t >= 5 && t <= 10, m + " timeout=" + t);
        }
    }
}
