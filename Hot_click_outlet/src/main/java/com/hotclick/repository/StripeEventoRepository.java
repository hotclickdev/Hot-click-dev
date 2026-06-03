package com.hotclick.repository;

import com.hotclick.model.StripeEvento;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StripeEventoRepository extends JpaRepository<StripeEvento, String> {
}
