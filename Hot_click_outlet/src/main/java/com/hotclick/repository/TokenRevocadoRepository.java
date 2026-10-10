package com.hotclick.repository;

import com.hotclick.model.TokenRevocado;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface TokenRevocadoRepository extends JpaRepository<TokenRevocado, String> {

    @Modifying
    @Query("DELETE FROM TokenRevocado t WHERE t.expiraEn < :ahora")
    int borrarVencidos(@Param("ahora") LocalDateTime ahora);
}
