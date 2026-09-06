-- V123: config real del homepage publico (antes vivia solo en localStorage del admin, sin efecto real)
CREATE TABLE IF NOT EXISTS hot_click_homepage_config_tb (
    id BIGINT PRIMARY KEY,
    hero_sections VARCHAR(100) NOT NULL DEFAULT 'chat,products,businesses',
    visible_categoria_ids VARCHAR(1000) NOT NULL DEFAULT '',
    max_categorias INTEGER NOT NULL DEFAULT 8
);

INSERT INTO hot_click_homepage_config_tb (id, hero_sections, visible_categoria_ids, max_categorias)
VALUES (1, 'chat,products,businesses', '', 8)
ON CONFLICT (id) DO NOTHING;
