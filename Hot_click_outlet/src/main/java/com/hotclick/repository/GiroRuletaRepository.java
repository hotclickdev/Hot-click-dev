package com.hotclick.repository;

import com.hotclick.model.GiroRuleta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface GiroRuletaRepository extends JpaRepository<GiroRuleta, Long> {

    List<GiroRuleta> findByUsuarioFinalIdAndUsadoFalse(Long usuarioId);

    Long countByUsuarioFinalIdAndUsadoFalse(Long usuarioId);
}
