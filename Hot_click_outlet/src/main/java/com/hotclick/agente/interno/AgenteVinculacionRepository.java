package com.hotclick.agente.interno;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AgenteVinculacionRepository extends JpaRepository<AgenteVinculacion, Long> {

    Optional<AgenteVinculacion> findByUsuarioIdAndEmpresaIdAndCanal(Long usuarioId, Long empresaId, String canal);

    Optional<AgenteVinculacion> findByEmpresaIdAndCanalAndContactoHashAndEstado(
        Long empresaId, String canal, String contactoHash, String estado);

    /** Bloqueo de escritura: un código de un solo uso no puede canjearse dos veces a la vez. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM AgenteVinculacion v WHERE v.empresaId = :empresaId AND v.codigoHash = :codigoHash")
    Optional<AgenteVinculacion> findPorCodigoParaActualizar(@Param("empresaId") Long empresaId,
                                                            @Param("codigoHash") String codigoHash);

    @Query("SELECT COUNT(v) > 0 FROM AgenteVinculacion v WHERE v.empresaId = :empresaId "
         + "AND v.codigoHash = :codigoHash AND v.codigoExpira > :ahora")
    boolean existeCodigoVigente(@Param("empresaId") Long empresaId, @Param("codigoHash") String codigoHash,
                                @Param("ahora") Instant ahora);

    /** Bloqueo de escritura: los intentos de PIN se cuentan sin carreras. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT v FROM AgenteVinculacion v WHERE v.id = :id")
    Optional<AgenteVinculacion> findByIdParaActualizar(@Param("id") Long id);

    List<AgenteVinculacion> findByEmpresaIdAndEstado(Long empresaId, String estado);
}
