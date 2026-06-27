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

    /** Carga empresa + roles con JOIN FETCH (crítico para autenticación y CompanyScope con open-in-view=false). */
    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.empresa LEFT JOIN FETCH u.roles WHERE u.correo = :correo")
    Optional<Usuario> findByCorreo(@Param("correo") String correo);

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

    // Incrementa intentos + bloquea condicionalmente en una sola operación atómica.
    // No usa RETURNING (no portable a H2 en tests) — el llamador debe leer
    // intentosFallidos con findIntentosFallidos() dentro de la MISMA transacción
    // para que el lock de fila evite que dos hilos concurrentes vean intentos==5.
    @Modifying
    @Transactional
    @Query(value = """
        UPDATE hot_click_usuario_tb
        SET intentos_fallidos = intentos_fallidos + 1,
            bloqueado_hasta   = CASE
                WHEN intentos_fallidos + 1 >= 5 THEN NOW() + INTERVAL '30' MINUTE
                ELSE bloqueado_hasta END
        WHERE id_usuario = :id
        """, nativeQuery = true)
    void incrementarYBloquear(@Param("id") Long id);

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

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.estado = 1")
    long countUsuariosActivos();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.estado = 0")
    long countUsuariosPendientes();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.empresa.id = :empresaId AND u.estado = 1")
    long countActivosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT u FROM Usuario u WHERE u.empresa.id = :empresaId ORDER BY u.id DESC")
    List<Usuario> findByEmpresaIdOrderByIdDesc(@Param("empresaId") Long empresaId);

    /** F30 — Carga roles con JOIN FETCH para evitar N+1 en SolicitudAprobacionController. */
    @Query("SELECT DISTINCT u FROM Usuario u LEFT JOIN FETCH u.roles WHERE u.empresa.id = :empresaId ORDER BY u.id DESC")
    List<Usuario> findByEmpresaIdConRoles(@Param("empresaId") Long empresaId);

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.twoFactorEnabled = true AND u.estado = 1")
    long countWith2FAEnabled();

    /** Clientes con rol USUARIO_FINAL — para CRM global (ADMIN_IT). */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 ORDER BY u.id DESC")
    List<Usuario> findClientes();

    /** F29 — Clientes que han comprado en una empresa específica (tenant-scoped CRM). */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 " +
           "AND EXISTS (SELECT p FROM Pedido p WHERE p.usuarioFinal = u AND p.empresa.id = :empresaId) " +
           "ORDER BY u.id DESC")
    List<Usuario> findClientesByEmpresa(@Param("empresaId") Long empresaId);

    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 AND (" +
           "LOWER(u.nombre) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "LOWER(u.correo) LIKE LOWER(CONCAT('%',:q,'%')) OR " +
           "u.telefono LIKE CONCAT('%',:q,'%')) ORDER BY u.nombre ASC")
    List<Usuario> buscarClientes(@Param("q") String q);

    /** F29 — Búsqueda de clientes acotada a una empresa (tenant-scoped CRM). */
    @Query("SELECT DISTINCT u FROM Usuario u JOIN u.roles r " +
           "WHERE r.nombreRol = 'USUARIO_FINAL' AND u.estado = 1 " +
           "AND EXISTS (SELECT p FROM Pedido p WHERE p.usuarioFinal = u AND p.empresa.id = :empresaId) " +
           "AND (LOWER(u.nombre) LIKE LOWER(CONCAT('%',:q,'%')) " +
           " OR LOWER(u.correo) LIKE LOWER(CONCAT('%',:q,'%')) " +
           " OR u.telefono LIKE CONCAT('%',:q,'%')) ORDER BY u.nombre ASC")
    List<Usuario> buscarClientesByEmpresa(@Param("q") String q, @Param("empresaId") Long empresaId);

    /** Updates TOTP replay-protection fields atomically after a successful TOTP verify. */
    @Modifying
    @Transactional
    @Query("UPDATE Usuario u SET u.totpLastUsedOtp = :code, u.totpLastUsedAt = :usedAt WHERE u.id = :id")
    void updateTotpReplayProtection(@Param("id")    Long          id,
                                    @Param("code")  String        code,
                                    @Param("usedAt") java.time.LocalDateTime usedAt);
}
