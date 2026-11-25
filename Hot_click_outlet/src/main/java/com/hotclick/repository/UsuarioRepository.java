package com.hotclick.repository;

import com.hotclick.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /**
     * Carga empresa + roles con JOIN FETCH (crítico para autenticación y CompanyScope con open-in-view=false).
     * IGNORA las filas ELIMINADAS (estado 3): el índice único parcial permite una ELIMINADA y una viva con el mismo
     * correo, y sin este filtro la consulta devolvía 2 filas (500). La reactivación por SALIDA_EQUIPO usa
     * {@link #findEliminadoByCorreo}.
     */
    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.empresa LEFT JOIN FETCH u.roles "
         + "WHERE u.correo = :correo AND u.estado <> 3")
    Optional<Usuario> findByCorreo(@Param("correo") String correo);

    /** Fila ELIMINADA más reciente de ese correo (puede haber varias). Solo para el camino de reactivación. */
    Optional<Usuario> findFirstByCorreoAndEstadoOrderByIdDesc(String correo, Integer estado);

    default Optional<Usuario> findEliminadoByCorreo(String correo) {
        return findFirstByCorreoAndEstadoOrderByIdDesc(correo, 3);
    }

    /** G1b: busqueda del correo sin distinguir mayusculas (sin indice nuevo; solo en el checkout manual). */
    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.empresa WHERE LOWER(u.correo) = LOWER(:correo)")
    List<Usuario> findAllByCorreoIgnoreCase(@Param("correo") String correo);

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.empresa WHERE u.identificacion = :identificacion")
    Optional<Usuario> findByIdentificacion(@Param("identificacion") String identificacion);

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.empresa LEFT JOIN FETCH u.roles WHERE u.clerkUserId = :clerkUserId")
    Optional<Usuario> findByClerkUserId(@Param("clerkUserId") String clerkUserId);

    /** Para endpoints que serializan el usuario con sus roles (evita LazyInitializationException). */
    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.roles WHERE u.id = :id")
    Optional<Usuario> findByIdWithRoles(@Param("id") Long id);

    boolean existsByCorreo(String correo);

    boolean existsByIdentificacion(String identificacion);

    boolean existsByCorreoAndEstadoNot(String correo, Integer estado);

    boolean existsByIdentificacionAndEstadoNot(String identificacion, Integer estado);

    @Modifying
    @Transactional
    @Query("UPDATE Usuario u SET u.fechaUltimoAcceso = :fecha WHERE u.id = :id")
    void updateUltimoAcceso(@Param("id") Long id, @Param("fecha") LocalDateTime fecha);

    @Modifying
    @Transactional
    @Query("UPDATE Usuario u SET u.intentosFallidos = u.intentosFallidos + 1 WHERE u.id = :id")
    void incrementarIntentosFallidos(@Param("id") Long id);

    @Query("SELECT u.intentosFallidos FROM Usuario u WHERE u.id = :id")
    Optional<Integer> findIntentosFallidos(@Param("id") Long id);

    @Modifying
    @Transactional
    @Query("UPDATE Usuario u SET u.intentosFallidos = 0 WHERE u.id = :id")
    void resetearIntentosFallidos(@Param("id") Long id);

    @Modifying
    @Transactional
    @Query("UPDATE Usuario u SET u.bloqueadoHasta = :fecha WHERE u.id = :id")
    void bloquearUsuario(@Param("id") Long id, @Param("fecha") LocalDateTime fecha);

    List<Usuario> findByEstadoOrderByIdDesc(Integer estado);

    List<Usuario> findAllByOrderByIdDesc();

    List<Usuario> findTop500ByOrderByIdDesc();

    @Query("SELECT u FROM Usuario u WHERE u.empresa.id = :empresaId ORDER BY u.id DESC LIMIT 500")
    List<Usuario> findTop500ByEmpresaIdOrderByIdDesc(@Param("empresaId") Long empresaId);

    /** Para listados admin — carga roles en JOIN para evitar N+1 con roles LAZY. */
    @Query("SELECT DISTINCT u FROM Usuario u LEFT JOIN FETCH u.roles ORDER BY u.id DESC")
    List<Usuario> findAllWithRolesOrderByIdDesc();

    @Query("SELECT DISTINCT u FROM Usuario u JOIN FETCH u.roles r WHERE r.nombreRol = 'ADMIN' ORDER BY u.id DESC")
    List<Usuario> findOperadores();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.estado = 1")
    long countUsuariosActivos();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.estado = 0")
    long countUsuariosPendientes();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.empresa.id = :empresaId AND u.estado = 1")
    long countActivosByEmpresaId(@Param("empresaId") Long empresaId);

    /**
     * QA3-P03: miembros activos del equipo, igual que la lista de /api/equipo. Cuenta por membresía
     * (miembro_empresa.estado = 1), no solo por usuario.empresa_id: un usuario que ya existía y se agregó al
     * equipo conserva su propia empresa y no se contaba. Un usuario con empresa_id = :empresaId y sin ninguna
     * fila de membresía (cuentas anteriores a la tabla) sigue contando; un miembro dado de baja no.
     */
    @Query("""
        SELECT COUNT(u) FROM Usuario u WHERE u.estado = 1 AND (
          EXISTS (SELECT 1 FROM MiembroEmpresa m WHERE m.usuario = u AND m.empresa.id = :empresaId AND m.estado = 1)
          OR (u.empresa.id = :empresaId AND NOT EXISTS
              (SELECT 1 FROM MiembroEmpresa m2 WHERE m2.usuario = u AND m2.empresa.id = :empresaId)))
        """)
    long countMiembrosActivosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT u FROM Usuario u WHERE u.empresa.id = :empresaId ORDER BY u.id DESC")
    List<Usuario> findByEmpresaIdOrderByIdDesc(@Param("empresaId") Long empresaId);

    /** F30 — Carga roles con JOIN FETCH para evitar N+1 en SolicitudAprobacionController. */
    @Query("SELECT DISTINCT u FROM Usuario u LEFT JOIN FETCH u.roles WHERE u.empresa.id = :empresaId ORDER BY u.id DESC")
    List<Usuario> findByEmpresaIdConRoles(@Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.twoFactorEnabled = true AND u.estado = 1")
    long countWith2FAEnabled();

    /** Clientes con rol USUARIO_FINAL — para CRM global (ADMIN). */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 ORDER BY u.id DESC")
    List<Usuario> findClientes();

    /** F29 — Clientes que han comprado en una empresa específica, o que la empresa registró manualmente (CRM). */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 " +
           "AND (EXISTS (SELECT p FROM Pedido p WHERE p.usuarioFinal = u AND p.empresa.id = :empresaId) " +
           "     OR u.empresaRegistro.id = :empresaId) " +
           "ORDER BY u.id DESC")
    List<Usuario> findClientesByEmpresa(@Param("empresaId") Long empresaId);

    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 AND (" +
           "LOWER(u.nombre) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(u.correo) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "u.telefono LIKE CONCAT('%',:q,'%')) ORDER BY u.nombre ASC")
    List<Usuario> buscarClientes(@Param("q") String q);

    /** P9-01: misma búsqueda global, paginada (solo ADMIN de plataforma). */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 AND (" +
           "LOWER(u.nombre) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(u.correo) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "u.telefono LIKE CONCAT('%',:q,'%')) ORDER BY u.nombre ASC")
    List<Usuario> buscarClientes(@Param("q") String q, org.springframework.data.domain.Pageable pageable);

    /** F29 — Búsqueda de clientes acotada a una empresa (tenant-scoped CRM), incluye registrados manualmente. */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 " +
           "AND (EXISTS (SELECT p FROM Pedido p WHERE p.usuarioFinal = u AND p.empresa.id = :empresaId) " +
           "     OR u.empresaRegistro.id = :empresaId) " +
           "AND (LOWER(u.nombre) LIKE LOWER(CONCAT('%',:q,'%')) " +
           " OR LOWER(u.correo) LIKE LOWER(CONCAT('%',:q,'%')) " +
           " OR u.telefono LIKE CONCAT('%',:q,'%')) ORDER BY u.nombre ASC")
    List<Usuario> buscarClientesByEmpresa(@Param("q") String q, @Param("empresaId") Long empresaId);

    /** P9-01: el usuario es comprador de la empresa (compró ahí o la empresa lo registró). */
    @Query("SELECT COUNT(u) > 0 FROM Usuario u WHERE u.id = :usuarioId AND (" +
           "EXISTS (SELECT p FROM Pedido p WHERE p.usuarioFinal = u AND p.empresa.id = :empresaId) " +
           "OR u.empresaRegistro.id = :empresaId)")
    boolean esClienteDeEmpresa(@Param("usuarioId") Long usuarioId, @Param("empresaId") Long empresaId);

    /** P9-01: búsqueda del vendedor, acotada a su empresa y paginada. */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 " +
           "AND (EXISTS (SELECT p FROM Pedido p WHERE p.usuarioFinal = u AND p.empresa.id = :empresaId) " +
           "     OR u.empresaRegistro.id = :empresaId) " +
           "AND (LOWER(u.nombre) LIKE LOWER(CONCAT('%',:q,'%')) " +
           " OR LOWER(u.correo) LIKE LOWER(CONCAT('%',:q,'%')) " +
           " OR u.telefono LIKE CONCAT('%',:q,'%')) ORDER BY u.nombre ASC")
    List<Usuario> buscarClientesByEmpresa(@Param("q") String q, @Param("empresaId") Long empresaId,
                                          org.springframework.data.domain.Pageable pageable);

    /** Updates TOTP replay-protection fields atomically after a successful TOTP verify. */
    @Modifying
    @Transactional
    @Query("UPDATE Usuario u SET u.totpLastUsedOtp = :code, u.totpLastUsedAt = :usedAt WHERE u.id = :id")
    void updateTotpReplayProtection(@Param("id")    Long          id,
                                    @Param("code")  String        code,
                                    @Param("usedAt") java.time.LocalDateTime usedAt);

    /**
     * AG-05: ¿el usuario activo pertenece al equipo de la empresa? Misma regla de membresía que
     * {@link #countMiembrosActivosByEmpresaId}. Se usa para asignar conversaciones solo a gente del mismo negocio.
     */
    @Query("""
        SELECT COUNT(u) > 0 FROM Usuario u WHERE u.id = :usuarioId AND u.estado = 1 AND (
          EXISTS (SELECT 1 FROM MiembroEmpresa m WHERE m.usuario = u AND m.empresa.id = :empresaId AND m.estado = 1)
          OR (u.empresa.id = :empresaId AND NOT EXISTS
              (SELECT 1 FROM MiembroEmpresa m2 WHERE m2.usuario = u AND m2.empresa.id = :empresaId)))
        """)
    boolean esMiembroActivoDeEmpresa(@Param("usuarioId") Long usuarioId, @Param("empresaId") Long empresaId);

    /** AG-05: personal de plataforma (rol ADMIN) activo, para conversaciones del bot de HotClick (sin empresa). */
    @Query("""
        SELECT COUNT(u) > 0 FROM Usuario u WHERE u.id = :usuarioId AND u.estado = 1
          AND EXISTS (SELECT 1 FROM u.roles r WHERE r.nombreRol = 'ADMIN')
        """)
    boolean esAdminActivo(@Param("usuarioId") Long usuarioId);
}
