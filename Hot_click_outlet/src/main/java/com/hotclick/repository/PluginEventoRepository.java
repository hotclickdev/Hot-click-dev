package com.hotclick.repository;

import com.hotclick.model.PluginEvento;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PluginEventoRepository extends JpaRepository<PluginEvento, Long> {

    Page<PluginEvento> findByPluginIdOrderByFechaEnvioDesc(Long pluginId, Pageable pageable);
}
