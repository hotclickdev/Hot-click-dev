package com.hotclick.repository;

import com.hotclick.model.TiendaRapida;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TiendaRapidaRepository extends JpaRepository<TiendaRapida, Long> {

    Optional<TiendaRapida> findByToken(String token);

    List<TiendaRapida> findAllByOrderByCreadaDesc();
}
