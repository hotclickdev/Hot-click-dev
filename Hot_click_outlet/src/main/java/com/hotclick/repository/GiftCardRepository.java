package com.hotclick.repository;

import com.hotclick.model.GiftCard;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GiftCardRepository extends JpaRepository<GiftCard, Long> {

    Optional<GiftCard> findByCodigo(String codigo);

    /** Pessimistic write lock — prevents concurrent deduction of the same gift card */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT g FROM GiftCard g WHERE g.codigo = :codigo")
    Optional<GiftCard> findByCodigoForUpdate(@Param("codigo") String codigo);

    List<GiftCard> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId);

    boolean existsByCodigoAndEmpresaId(String codigo, Long empresaId);
}
