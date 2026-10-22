package com.hotclick.scheduler;

import com.hotclick.model.WalletAcreditacionFallida;
import com.hotclick.repository.WalletAcreditacionFallidaRepository;
import com.hotclick.service.WalletDlqTxOps;
import com.hotclick.service.WalletService;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Pageable;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class WalletReconciliacionSchedulerTest {

    private WalletAcreditacionFallidaRepository repo;
    private WalletService walletService;
    private WalletDlqTxOps txOps;
    private WalletReconciliacionScheduler scheduler;

    @BeforeEach
    void setUp() {
        repo = mock(WalletAcreditacionFallidaRepository.class);
        walletService = mock(WalletService.class);
        txOps = mock(WalletDlqTxOps.class);
        scheduler = new WalletReconciliacionScheduler(repo, walletService, txOps);
        scheduler.configurarLotes(50, 20, 180, System::currentTimeMillis);
    }

    private static WalletAcreditacionFallida item(long id) {
        WalletAcreditacionFallida i = new WalletAcreditacionFallida();
        i.setId(id);
        i.setEmpresaId(1L);
        i.setPedidoId(100L + id);
        i.setMontoNeto(1000L);
        i.setTotalBruto(1100L);
        i.setComSaas(50L);
        i.setComGw(50L);
        return i;
    }

    private void acreditarLanza(RuntimeException ex) {
        doThrow(ex).when(walletService).acreditarVentaReintentoDlq(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }

    @Test
    void constraintEspecificoDeCreditoMarcaProcesado() {
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(item(1)), List.of());
        acreditarLanza(new DataIntegrityViolationException("dup",
            new ConstraintViolationException("duplicate key", new SQLException("duplicate key", "23505"),
                WalletReconciliacionScheduler.CONSTRAINT_CREDITO_POR_PEDIDO)));

        scheduler.reintentarAcreditacionesFallidas();

        verify(txOps).marcarProcesado(1L);
        verify(txOps, never()).marcarFallo(anyLong(), any());
    }

    @Test
    void constraintSoloEnMensajeYaNoEsDuplicado() {
        // Sin fallback por texto: el mensaje solo no basta.
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException(
            "duplicate key value violates unique constraint \"uq_wallet_tx_credito_por_pedido\"")));
    }

    @Test
    void exigeSqlState23505ademasDelConstraint() {
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x",
            new ConstraintViolationException("dup", new SQLException("dup", "23514"),
                WalletReconciliacionScheduler.CONSTRAINT_CREDITO_POR_PEDIDO))));
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x",
            new ConstraintViolationException("dup", new SQLException("dup", "23505"),
                "uq_wallet_tx_credito_por_pedido_otro"))));
    }

    @Test
    void extractorDeHibernatePostgresResuelveElConstraint() {
        // Mismo camino que en producción: SQLException 23505 del driver → Hibernate PostgreSQLDialect
        // extrae el nombre → ConstraintViolationException → esCreditoDuplicado.
        SQLException sqle = new SQLException(
            "ERROR: duplicate key value violates unique constraint \"uq_wallet_tx_credito_por_pedido\"", "23505");
        String nombre = new org.hibernate.dialect.PostgreSQLDialect()
            .getViolatedConstraintNameExtractor().extractConstraintName(sqle);
        assertEquals(WalletReconciliacionScheduler.CONSTRAINT_CREDITO_POR_PEDIDO, nombre);
        assertTrue(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x",
            new ConstraintViolationException("dup", sqle, nombre))));
        // La SQLException sola (sin nombre de constraint de Hibernate) no basta.
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x", sqle)));
    }

    @Test
    void indiceV166TambienEsCreditoDuplicado() {
        SQLException sqle = new SQLException(
            "ERROR: duplicate key value violates unique constraint \"uq_wallet_tx_referencia_tipo\"", "23505");
        String nombre = new org.hibernate.dialect.PostgreSQLDialect()
            .getViolatedConstraintNameExtractor().extractConstraintName(sqle);
        assertEquals(WalletReconciliacionScheduler.INDICE_TX_REFERENCIA_TIPO, nombre);
        assertTrue(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x",
            new ConstraintViolationException("dup", sqle, nombre))));
        // Nombre parecido pero no exacto, o SQLState distinto: no es duplicado.
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x",
            new ConstraintViolationException("dup", sqle, "uq_wallet_tx_referencia_tipo_old"))));
        SQLException fk = new SQLException("fk", "23503");
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x",
            new ConstraintViolationException("fk", fk, WalletReconciliacionScheduler.INDICE_TX_REFERENCIA_TIPO))));
    }

    @Test
    void pedidoIdNuloVaAAgotadoSinAcreditar() {
        WalletAcreditacionFallida sinPedido = item(9);
        sinPedido.setPedidoId(null);
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(sinPedido), List.of());

        scheduler.reintentarAcreditacionesFallidas();

        verify(txOps).marcarAgotadoSinCredito(eq(9L), contains("pedidoId nulo"));
        verifyNoInteractions(walletService);
        verify(txOps, never()).marcarProcesado(anyLong());
    }

    @Test
    void otraViolacionDeIntegridadSigueReintento() {
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(item(2)), List.of());
        acreditarLanza(new DataIntegrityViolationException("check",
            new ConstraintViolationException("violates check constraint", new SQLException("check", "23514"),
                "chk_wallet_saldo_disponible_positivo")));

        scheduler.reintentarAcreditacionesFallidas();

        verify(txOps).marcarFallo(2L, "integridad sqlstate=23514 constraint=chk_wallet_saldo_disponible_positivo");
        verify(txOps, never()).marcarProcesado(anyLong());
    }

    @Test
    void dlqNoGuardaMensajeInterno() {
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(item(3)), List.of());
        acreditarLanza(new DataIntegrityViolationException(
            "could not execute statement [insert into wallet values (cliente@ejemplo.test, 9999)]",
            new ConstraintViolationException("detail: Key (email)=(cliente@ejemplo.test)",
                new SQLException("ERROR: null value; Detail: fila con datos", "23502"), null)));

        scheduler.reintentarAcreditacionesFallidas();

        verify(txOps).marcarFallo(3L, "integridad sqlstate=23502 constraint=desconocido");
        verify(txOps, never()).marcarFallo(anyLong(), contains("cliente@"));
    }

    @Test
    void errorGenericoGuardaSoloElTipo() {
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(item(5)), List.of());
        acreditarLanza(new IllegalStateException("saldo de cliente@ejemplo.test"));

        scheduler.reintentarAcreditacionesFallidas();

        verify(txOps).marcarFallo(5L, "IllegalStateException");
    }

    @Test
    void violacionSinNombreDeConstraintSigueReintento() {
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(
            new DataIntegrityViolationException("not-null violation")));
        assertFalse(WalletReconciliacionScheduler.esCreditoDuplicado(new DataIntegrityViolationException("x",
            new ConstraintViolationException("dup", new SQLException(), "uq_payout_activo_por_empresa"))));
    }

    @Test
    void paginaEnLotesAcotados() {
        scheduler.configurarLotes(2, 20, 180, System::currentTimeMillis);
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(item(1), item(2)), List.of(item(3), item(4)), List.of(item(5)));

        scheduler.reintentarAcreditacionesFallidas();

        verify(repo, times(3)).findPendientesParaReintento(any(LocalDateTime.class),
            argThat((Pageable p) -> p.getPageSize() == 2 && p.getPageNumber() == 0));
        verify(repo, never()).findPendientesParaReintento(any(LocalDateTime.class));
        verify(txOps, times(5)).marcarProcesado(anyLong());
    }

    @Test
    void respetaMaxLotes() {
        scheduler.configurarLotes(1, 3, 180, System::currentTimeMillis);
        AtomicLong id = new AtomicLong();
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenAnswer(inv -> List.of(item(id.incrementAndGet())));

        scheduler.reintentarAcreditacionesFallidas();

        verify(repo, times(3)).findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class));
    }

    @Test
    void cortaSiLaPaginaNoTraeItemsNuevos() {
        scheduler.configurarLotes(1, 20, 180, System::currentTimeMillis);
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(item(7)));
        acreditarLanza(new RuntimeException("caído"));

        scheduler.reintentarAcreditacionesFallidas();

        verify(txOps, times(1)).marcarFallo(eq(7L), any());
        verify(repo, times(2)).findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class));
    }

    @Test
    void cortaAlAgotarPresupuestoDeTiempo() {
        List<Long> tiempos = new ArrayList<>(List.of(0L, 10L, 200_000L));
        scheduler.configurarLotes(10, 20, 180, () -> tiempos.size() > 1 ? tiempos.remove(0) : tiempos.get(0));
        when(repo.findPendientesParaReintento(any(LocalDateTime.class), any(Pageable.class)))
            .thenReturn(List.of(item(1), item(2), item(3)));

        scheduler.reintentarAcreditacionesFallidas();

        // Presupuesto comprobado ANTES de cada ítem: item1 arranca (t=10), item2 no (t=200000).
        verify(txOps, times(1)).marcarProcesado(anyLong());
        verify(walletService, times(1)).acreditarVentaReintentoDlq(anyLong(), anyLong(), anyLong(), anyLong(), anyLong(), anyLong());
    }
}
