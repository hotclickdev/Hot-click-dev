package com.hotclick.repository;

import com.hotclick.model.CatalogoMaestro;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CatalogoMaestroRepository extends JpaRepository<CatalogoMaestro, Long> {

    Optional<CatalogoMaestro> findByCodigoBarras(String codigoBarras);

    Optional<CatalogoMaestro> findBySkuFabricante(String skuFabricante);

    @Query("SELECT cm FROM CatalogoMaestro cm WHERE cm.marca.id = :marcaId AND LOWER(cm.modelo) = LOWER(:modelo)")
    Optional<CatalogoMaestro> findByMarcaIdAndModeloIgnoreCase(@Param("marcaId") Long marcaId, @Param("modelo") String modelo);

    // ─── Búsqueda en marketplace con Buy Box ─────────────────────────────────
    //
    // Lógica:
    //  1. CTE "ranked": para cada producto activo con fk_id_catalogo_maestro,
    //     calcula score_geo (2=mismo cantón, 1=misma provincia, 0=otro),
    //     precio_efectivo, total_vendedores y precio_desde usando window functions.
    //  2. JOIN al catálogo maestro filtrando rn=1 para obtener el vendedor
    //     principal (Buy Box winner) por entrada de catálogo.
    //  3. CASE short-circuit: evita llamar plainto_tsquery con cadena vacía.
    //
    @Query(value = """
        WITH ranked AS (
          SELECT
            p.fk_id_catalogo_maestro,
            p.id_producto,
            CASE WHEN p.en_oferta = true AND p.precio_oferta IS NOT NULL
                 THEN p.precio_oferta ELSE p.precio_venta END                       AS precio_efectivo,
            (p.stock_actual - p.stock_reservado)                                    AS stock_disponible,
            e.id_empresa,
            e.nombre_empresa,
            e.nombre_comercial,
            e.logo_url,
            e.slug                                                                  AS empresa_slug,
            b.provincia,
            b.canton,
            CASE
              WHEN UPPER(immutable_unaccent(b.canton))    = :canton    THEN 2
              WHEN UPPER(immutable_unaccent(b.provincia)) = :provincia THEN 1
              ELSE 0
            END                                                                     AS score_geo,
            ROW_NUMBER() OVER (
              PARTITION BY p.fk_id_catalogo_maestro
              ORDER BY
                CASE WHEN UPPER(immutable_unaccent(b.canton)) = :canton THEN 2 WHEN UPPER(immutable_unaccent(b.provincia)) = :provincia THEN 1 ELSE 0 END DESC,
                CASE WHEN p.en_oferta = true AND p.precio_oferta IS NOT NULL
                     THEN p.precio_oferta ELSE p.precio_venta END ASC
            )                                                                       AS rn,
            COUNT(*)         OVER (PARTITION BY p.fk_id_catalogo_maestro)           AS total_vendedores,
            MIN(CASE WHEN p.en_oferta = true AND p.precio_oferta IS NOT NULL
                     THEN p.precio_oferta ELSE p.precio_venta END)
                             OVER (PARTITION BY p.fk_id_catalogo_maestro)           AS precio_desde
          FROM hot_click_producto_tb   p
          JOIN hot_click_empresa_tb    e ON e.id_empresa = p.fk_id_empresa
          JOIN hot_click_bodega_tb     b ON b.id_bodega  = p.fk_id_bodega
          WHERE p.fk_id_catalogo_maestro IS NOT NULL
            AND p.visible_catalogo = true
            AND (p.stock_actual - p.stock_reservado) > 0
        )
        SELECT
          cm.id_catalogo_maestro,
          cm.nombre,
          cm.descripcion_corta,
          cm.imagen_principal_url,
          cm.sku_fabricante,
          cm.codigo_barras,
          cm.fk_id_categoria,
          cm.fk_id_marca,
          r.precio_efectivo    AS buy_box_precio,
          r.id_empresa         AS buy_box_empresa_id,
          r.id_producto        AS buy_box_producto_id,
          r.nombre_empresa     AS buy_box_tienda,
          r.nombre_comercial   AS buy_box_tienda_comercial,
          r.logo_url           AS buy_box_logo,
          r.empresa_slug       AS buy_box_slug,
          r.provincia          AS buy_box_provincia,
          r.canton             AS buy_box_canton,
          r.stock_disponible   AS buy_box_stock,
          r.score_geo,
          r.precio_desde,
          r.total_vendedores
        FROM hot_click_catalogo_maestro_tb cm
        JOIN ranked r ON r.fk_id_catalogo_maestro = cm.id_catalogo_maestro AND r.rn = 1
        WHERE cm.activo = true
          AND (
            CASE WHEN COALESCE(:q, '') = '' THEN true
                 ELSE cm.busqueda_ts @@ plainto_tsquery('spanish', :q) END
          )
        ORDER BY
          CASE WHEN COALESCE(:q, '') = '' THEN 0
               ELSE ts_rank(cm.busqueda_ts, plainto_tsquery('spanish', :q)) END DESC,
          r.score_geo DESC,
          r.precio_desde ASC
        LIMIT :pageSize OFFSET :offset
        """, nativeQuery = true)
    List<CatalogoCardProjection> buscarConBuyBox(
            @Param("q")         String q,
            @Param("provincia") String provincia,
            @Param("canton")    String canton,
            @Param("pageSize")  int pageSize,
            @Param("offset")    int offset
    );

    @Query(value = """
        SELECT COUNT(DISTINCT cm.id_catalogo_maestro)
        FROM hot_click_catalogo_maestro_tb cm
        JOIN hot_click_producto_tb p ON p.fk_id_catalogo_maestro = cm.id_catalogo_maestro
        WHERE cm.activo = true
          AND p.visible_catalogo = true
          AND (p.stock_actual - p.stock_reservado) > 0
          AND (
            CASE WHEN COALESCE(:q, '') = '' THEN true
                 ELSE cm.busqueda_ts @@ plainto_tsquery('spanish', :q) END
          )
        """, nativeQuery = true)
    long contarBusqueda(@Param("q") String q);

    // ─── Detalle: todos los vendedores de un catálogo, rankeados ─────────────
    @Query(value = """
        SELECT
          p.id_producto,
          p.nombre_producto,
          p.descripcion_corta          AS descripcion_corta_producto,
          p.imagen_principal_url       AS imagen_producto_url,
          p.condicion,
          p.garantia_dias,
          CASE WHEN p.en_oferta = true AND p.precio_oferta IS NOT NULL
               THEN p.precio_oferta ELSE p.precio_venta END AS precio_efectivo,
          p.precio_venta,
          p.precio_oferta,
          p.en_oferta,
          (p.stock_actual - p.stock_reservado)              AS stock_disponible,
          e.id_empresa,
          e.nombre_empresa,
          e.nombre_comercial,
          e.logo_url,
          e.slug                                            AS empresa_slug,
          b.provincia,
          b.canton,
          CASE
            WHEN UPPER(immutable_unaccent(b.canton))    = :canton    THEN 2
            WHEN UPPER(immutable_unaccent(b.provincia)) = :provincia THEN 1
            ELSE 0
          END                                               AS score_geo
        FROM hot_click_producto_tb  p
        JOIN hot_click_empresa_tb   e ON e.id_empresa = p.fk_id_empresa
        JOIN hot_click_bodega_tb    b ON b.id_bodega  = p.fk_id_bodega
        WHERE p.fk_id_catalogo_maestro = :catalogoId
          AND p.visible_catalogo = true
          AND (p.stock_actual - p.stock_reservado) > 0
        ORDER BY
          CASE WHEN UPPER(immutable_unaccent(b.canton))    = :canton    THEN 2
               WHEN UPPER(immutable_unaccent(b.provincia)) = :provincia THEN 1
               ELSE 0 END DESC,
          CASE WHEN p.en_oferta = true AND p.precio_oferta IS NOT NULL
               THEN p.precio_oferta ELSE p.precio_venta END ASC
        """, nativeQuery = true)
    List<VendedorOfertaProjection> listarVendedores(
            @Param("catalogoId") Long catalogoId,
            @Param("provincia")  String provincia,
            @Param("canton")     String canton
    );

    // ─── Projection interfaces ────────────────────────────────────────────────

    interface CatalogoCardProjection {
        Long   getIdCatalogoMaestro();
        String getNombre();
        String getDescripcionCorta();
        String getImagenPrincipalUrl();
        String getSkuFabricante();
        String getCodigoBarras();
        Long   getFkIdCategoria();
        Long   getFkIdMarca();
        Integer getBuyBoxPrecio();
        Long    getBuyBoxEmpresaId();
        Long    getBuyBoxProductoId();
        String  getBuyBoxTienda();
        String  getBuyBoxTiendaComercial();
        String  getBuyBoxLogo();
        String  getBuyBoxSlug();
        String  getBuyBoxProvincia();
        String  getBuyBoxCanton();
        Integer getBuyBoxStock();
        Integer getScoreGeo();
        Integer getPrecioDesde();
        Long    getTotalVendedores();
    }

    interface VendedorOfertaProjection {
        Long    getIdProducto();
        String  getNombreProducto();
        String  getDescripcionCortaProducto();
        String  getImagenProductoUrl();
        String  getCondicion();
        Integer getGarantiaDias();
        Integer getPrecioEfectivo();
        Integer getPrecioVenta();
        Integer getPrecioOferta();
        Boolean getEnOferta();
        Integer getStockDisponible();
        Long    getIdEmpresa();
        String  getNombreEmpresa();
        String  getNombreComercial();
        String  getLogoUrl();
        String  getEmpresaSlug();
        String  getProvincia();
        String  getCanton();
        Integer getScoreGeo();
    }
}
