package com.hotclick.repository;

import com.hotclick.model.TerminoProhibido;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TerminoProhibidoRepository extends JpaRepository<TerminoProhibido, Long> {
    /** Lista acotada (la edita el ADMIN a mano; cientos como mucho). */
    List<TerminoProhibido> findTop500ByOrderByTerminoAsc();
    Optional<TerminoProhibido> findByTermino(String termino);
}
