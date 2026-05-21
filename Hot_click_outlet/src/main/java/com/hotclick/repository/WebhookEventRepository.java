package com.hotclick.repository;

import com.hotclick.model.WebhookEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {

    boolean existsByMerchantTokenAndEventoTipo(String merchantToken, String eventoTipo);

    @Query("SELECT w FROM WebhookEvent w WHERE (:procesado IS NULL OR w.procesado = :procesado) ORDER BY w.fechaRecepcion DESC")
    Page<WebhookEvent> buscarWebhooks(@Param("procesado") Boolean procesado, Pageable pageable);

    @Query("SELECT COUNT(w) FROM WebhookEvent w WHERE w.procesado = :procesado")
    long countByProcesado(@Param("procesado") Boolean procesado);
}
