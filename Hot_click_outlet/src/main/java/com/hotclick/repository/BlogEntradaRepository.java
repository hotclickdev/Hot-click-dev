package com.hotclick.repository;

import com.hotclick.model.BlogEntrada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BlogEntradaRepository extends JpaRepository<BlogEntrada, Long> {
    List<BlogEntrada> findByPublicadoTrueAndEstadoOrderByFechaPublicacionDesc(Integer estado);
    List<BlogEntrada> findAllByOrderByFechaCreacionDesc();
    Optional<BlogEntrada> findBySlug(String slug);
}
