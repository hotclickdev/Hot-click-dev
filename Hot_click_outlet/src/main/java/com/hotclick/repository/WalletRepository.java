package com.hotclick.repository;

import com.hotclick.model.Wallet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

    Optional<Wallet> findByEmpresaId(Long empresaId);

    /**
     * Acredita monto al saldo_disponible de forma atómica (UPDATE atómico, seguro en PgBouncer).
     * Crea la fila si no existe (UPSERT).
     * Devuelve el saldo_disponible resultante para grabarlo en el ledger.
     */
    @Modifying
    @Query(value = """
        INSERT INTO hot_click_wallet_tb
            (fk_id_empresa, saldo_disponible, saldo_retenido, total_acreditado, total_retirado, ultima_actualizacion)
        VALUES
            (:empresaId, :monto, 0, :monto, 0, NOW())
        ON CONFLICT (fk_id_empresa) DO UPDATE
            SET saldo_disponible    = saldo_disponible + :monto,
                total_acreditado    = total_acreditado + :monto,
                ultima_actualizacion = NOW()
        """, nativeQuery = true)
    void upsertAcreditar(@Param("empresaId") Long empresaId, @Param("monto") Long monto);

    /**
     * Mueve monto de saldo_disponible a saldo_retenido (reserva para payout pendiente).
     * Lanza excepción si saldo_disponible < monto (CHECK en BD lo captura).
     */
    @Modifying
    @Query(value = """
        UPDATE hot_click_wallet_tb
           SET saldo_disponible    = saldo_disponible    - :monto,
               saldo_retenido      = saldo_retenido      + :monto,
               ultima_actualizacion = NOW()
         WHERE fk_id_empresa = :empresaId
           AND saldo_disponible >= :monto
        """, nativeQuery = true)
    int retenerParaPayout(@Param("empresaId") Long empresaId, @Param("monto") Long monto);

    /**
     * Confirma el payout: reduce saldo_retenido y aumenta total_retirado.
     * Guard AND saldo_retenido >= :monto: segunda línea de defensa si el
     * SELECT FOR UPDATE en WalletService.aprobarPayout no fuera suficiente.
     * Devuelve filas afectadas: 0 = inconsistencia detectada (lanzar excepción).
     */
    @Modifying
    @Query(value = """
        UPDATE hot_click_wallet_tb
           SET saldo_retenido      = saldo_retenido - :monto,
               total_retirado      = total_retirado + :monto,
               ultima_actualizacion = NOW()
         WHERE fk_id_empresa = :empresaId
           AND saldo_retenido >= :monto
        """, nativeQuery = true)
    int confirmarPayout(@Param("empresaId") Long empresaId, @Param("monto") Long monto);

    /**
     * Rechaza el payout: libera saldo_retenido de vuelta a saldo_disponible.
     */
    @Modifying
    @Query(value = """
        UPDATE hot_click_wallet_tb
           SET saldo_disponible    = saldo_disponible + :monto,
               saldo_retenido      = saldo_retenido   - :monto,
               ultima_actualizacion = NOW()
         WHERE fk_id_empresa = :empresaId
        """, nativeQuery = true)
    void liberarRetencion(@Param("empresaId") Long empresaId, @Param("monto") Long monto);

    /** Lee el saldo_disponible actual en una sola consulta (sin cargar la entidad entera). */
    @Query("SELECT w.saldoDisponible FROM Wallet w WHERE w.empresaId = :empresaId")
    Optional<Long> findSaldoDisponible(@Param("empresaId") Long empresaId);
}
