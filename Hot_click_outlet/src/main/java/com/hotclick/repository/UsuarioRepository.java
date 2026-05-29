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

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.empresa WHERE u.correo = :correo")
    Optional<Usuario> findByCorreo(@Param("correo") String correo);

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.empresa WHERE u.identificacion = :identificacion")
    Optional<Usuario> findByIdentificacion(@Param("identificacion") String identificacion);

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

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.estado = 1")
    long countUsuariosActivos();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.estado = 0")
    long countUsuariosPendientes();

    @Query("SELECT COUNT(u) FROM Usuario u WHERE u.empresa.id = :empresaId AND u.estado = 1")
    long countActivosByEmpresaId(@Param("empresaId") Long empresaId);

    @Query("SELECT u FROM Usuario u WHERE u.empresa.id = :empresaId ORDER BY u.id DESC")
    List<Usuario> findByEmpresaIdOrderByIdDesc(@Param("empresaId") Long empresaId);
}
