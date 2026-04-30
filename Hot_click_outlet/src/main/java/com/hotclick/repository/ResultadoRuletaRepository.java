package com.hotclick.repository;

import com.hotclick.model.ResultadoRuleta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResultadoRuletaRepository extends JpaRepository<ResultadoRuleta, Long> {

    Optional<ResultadoRuleta> findByCodigoCanje(String codigoCanje);

    List<ResultadoRuleta> findByUsuarioFinalIdOrderByFechaGiroDesc(Long usuarioId);
}
