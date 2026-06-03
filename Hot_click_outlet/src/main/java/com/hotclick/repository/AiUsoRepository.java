package com.hotclick.repository;

import com.hotclick.model.AiUso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AiUsoRepository extends JpaRepository<AiUso, Long> {

    Optional<AiUso> findByEmpresaIdAndAnioAndMes(Long empresaId, int anio, int mes);

    /** Total de tokens consumidos en la plataforma para un mes dado (ADMIN_IT — observabilidad). */
    @Query("SELECT COALESCE(SUM(u.tokensEntrada + u.tokensSalida), 0) FROM AiUso u WHERE u.anio = :anio AND u.mes = :mes")
    long sumTokensGlobales(@Param("anio") int anio, @Param("mes") int mes);

    /** Tokens de entrada (input) globales — usado para calcular costo estimado. */
    @Query("SELECT COALESCE(SUM(u.tokensEntrada), 0) FROM AiUso u WHERE u.anio = :anio AND u.mes = :mes")
    long sumTokensEntradaGlobales(@Param("anio") int anio, @Param("mes") int mes);

    /** Tokens de salida (output) globales — usado para calcular costo estimado. */
    @Query("SELECT COALESCE(SUM(u.tokensSalida), 0) FROM AiUso u WHERE u.anio = :anio AND u.mes = :mes")
    long sumTokensSalidaGlobales(@Param("anio") int anio, @Param("mes") int mes);

    /** Tokens de entrada acumulados históricos (todos los meses). */
    @Query("SELECT COALESCE(SUM(u.tokensEntrada), 0) FROM AiUso u")
    long sumTokensEntradaAcumulados();

    /** Tokens de salida acumulados históricos (todos los meses). */
    @Query("SELECT COALESCE(SUM(u.tokensSalida), 0) FROM AiUso u")
    long sumTokensSalidaAcumulados();

    /** Top 5 empresas por tokens consumidos en el mes. Returns [nombre, llamadas, tokensEntrada, tokensSalida]. */
    @Query(value = """
        SELECT e.nombre_empresa, u.llamadas, u.tokens_entrada, u.tokens_salida
        FROM hot_click_ai_uso_tb u
        JOIN hot_click_empresa_tb e ON e.id_empresa = u.fk_id_empresa
        WHERE u.anio = :anio AND u.mes = :mes AND (u.tokens_entrada + u.tokens_salida) > 0
        ORDER BY (u.tokens_entrada + u.tokens_salida) DESC
        LIMIT 5
        """, nativeQuery = true)
    List<Object[]> findTopConsumoMes(@Param("anio") int anio, @Param("mes") int mes);

    /** Total de llamadas a la API de IA en la plataforma para un mes dado. */
    @Query("SELECT COALESCE(SUM(u.llamadas), 0) FROM AiUso u WHERE u.anio = :anio AND u.mes = :mes")
    long sumLlamadasGlobales(@Param("anio") int anio, @Param("mes") int mes);

    /** Atomic upsert: inserts row if not exists, then increments counters in one statement. */
    @Modifying
    @Query(value = """
        INSERT INTO hot_click_ai_uso_tb (fk_id_empresa, anio, mes, llamadas, tokens_entrada, tokens_salida)
        VALUES (:empId, :anio, :mes, :ll, :te, :ts)
        ON CONFLICT (fk_id_empresa, anio, mes) DO UPDATE
          SET llamadas       = hot_click_ai_uso_tb.llamadas       + :ll,
              tokens_entrada = hot_click_ai_uso_tb.tokens_entrada + :te,
              tokens_salida  = hot_click_ai_uso_tb.tokens_salida  + :ts
        """, nativeQuery = true)
    void upsertIncrement(@Param("empId") Long empresaId,
                         @Param("anio") int anio,
                         @Param("mes") int mes,
                         @Param("ll") int llamadas,
                         @Param("te") int tokensEntrada,
                         @Param("ts") int tokensSalida);

    /**
     * Atomic check-and-reserve: increments llamadas by 1 only when llamadas < limite.
     * Returns the new llamadas value. Empty result = quota exceeded.
     * Eliminates the TOCTOU race between puedeUsarAi() and registrarUso().
     */
    @Query(value = """
        INSERT INTO hot_click_ai_uso_tb (fk_id_empresa, anio, mes, llamadas, tokens_entrada, tokens_salida)
        VALUES (:empId, :anio, :mes, 1, 0, 0)
        ON CONFLICT (fk_id_empresa, anio, mes) DO UPDATE
          SET llamadas = hot_click_ai_uso_tb.llamadas + 1
        WHERE hot_click_ai_uso_tb.llamadas < :limite
        RETURNING llamadas
        """, nativeQuery = true)
    List<Object[]> reservarSlot(@Param("empId") Long empresaId,
                                @Param("anio") int anio,
                                @Param("mes") int mes,
                                @Param("limite") int limite);

    /**
     * Updates only token counts after the AI call completes.
     * llamadas was already incremented by reservarSlot() — do NOT call registrarUso() after esto.
     */
    @Modifying
    @Query(value = """
        UPDATE hot_click_ai_uso_tb
        SET tokens_entrada = tokens_entrada + :te,
            tokens_salida  = tokens_salida  + :ts
        WHERE fk_id_empresa = :empId AND anio = :anio AND mes = :mes
        """, nativeQuery = true)
    void actualizarTokens(@Param("empId") Long empresaId,
                          @Param("anio") int anio,
                          @Param("mes") int mes,
                          @Param("te") int tokensEntrada,
                          @Param("ts") int tokensSalida);
}
