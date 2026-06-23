package com.hotclick.repository;

import com.hotclick.model.CotizacionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CotizacionItemRepository extends JpaRepository<CotizacionItem, Long> {
}
