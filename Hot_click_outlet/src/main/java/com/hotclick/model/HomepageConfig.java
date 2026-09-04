package com.hotclick.model;

import jakarta.persistence.*;

/** Configuración global del homepage público (una sola fila, id fijo = 1). */
@Entity
@Table(name = "hot_click_homepage_config_tb")
public class HomepageConfig {

    @Id
    private Long id = 1L;

    /** IDs de fase del hero rotator separados por coma, en el orden en que rotan (ej. "chat,products,businesses"). */
    @Column(name = "hero_sections", nullable = false, length = 100)
    private String heroSections = "chat,products,businesses";

    /** IDs de categoría separados por coma. Vacío = automático (las N con más productos). */
    @Column(name = "visible_categoria_ids", length = 1000)
    private String visibleCategoriaIds = "";

    @Column(name = "max_categorias", nullable = false)
    private Integer maxCategorias = 8;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getHeroSections() { return heroSections; }
    public void setHeroSections(String heroSections) { this.heroSections = heroSections; }

    public String getVisibleCategoriaIds() { return visibleCategoriaIds; }
    public void setVisibleCategoriaIds(String visibleCategoriaIds) { this.visibleCategoriaIds = visibleCategoriaIds; }

    public Integer getMaxCategorias() { return maxCategorias; }
    public void setMaxCategorias(Integer maxCategorias) { this.maxCategorias = maxCategorias; }
}
