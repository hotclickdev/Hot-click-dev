package com.hotclick.repository;

import com.hotclick.model.Plugin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PluginRepository extends JpaRepository<Plugin, Long> {

    List<Plugin> findByEmpresaIdOrderByFechaCreacionDesc(Long empresaId);

    List<Plugin> findByEmpresaIdAndActivoTrueOrderByNombreAsc(Long empresaId);
}
