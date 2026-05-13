package com.hotclick.repository;

import com.hotclick.model.WebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebhookEventRepository extends JpaRepository<WebhookEvent, Long> {

    boolean existsByMerchantTokenAndEventoTipo(String merchantToken, String eventoTipo);
}
