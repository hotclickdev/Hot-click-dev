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

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByCorreo(String correo);

    Optional<Usuario> findByIdentificacion(String identificacion);

    boolean existsByCorreo(String correo);

    boolean existsByIdentificacion(String identificacion);

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
}
