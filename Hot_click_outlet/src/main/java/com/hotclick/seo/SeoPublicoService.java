package com.hotclick.seo;

import com.hotclick.dto.seo.SeoPublicoDtos.ProductoSeo;
import com.hotclick.dto.seo.SeoPublicoDtos.ProvinciaSeo;
import com.hotclick.dto.seo.SeoPublicoDtos.SectorDetalle;
import com.hotclick.dto.seo.SeoPublicoDtos.SectorResumen;
import com.hotclick.dto.seo.SeoPublicoDtos.TiendaSeo;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.ProductoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class SeoPublicoService {

    private final EmpresaRepository empresaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ProductoRepository productoRepository;

    public SeoPublicoService(EmpresaRepository empresaRepository,
                             CategoriaRepository categoriaRepository,
                             ProductoRepository productoRepository) {
        this.empresaRepository = empresaRepository;
        this.categoriaRepository = categoriaRepository;
        this.productoRepository = productoRepository;
    }

    @Transactional(readOnly = true)
    public List<TiendaSeo> tiendas() {
        return empresaRepository.findTiendasPublicasSeo().stream().map(SeoPublicoService::tienda).toList();
    }

    @Transactional(readOnly = true)
    public List<SectorResumen> sectores() {
        return categoriaRepository.findSectoresIndexables(SeoIndexacion.MINIMO_PRODUCTOS_SECTOR).stream()
            .map(SeoPublicoService::resumen)
            .filter(s -> SeoSlugs.esSeguro(s.slug()))
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<SectorDetalle> sector(String slug) {
        if (!SeoSlugs.esSeguro(slug)) return Optional.empty();
        return sectores().stream()
            .filter(s -> s.slug().equals(slug))
            .findFirst()
            .map(this::detalle);
    }

    @Transactional(readOnly = true)
    public List<ProvinciaSeo> provincias() {
        Map<String, List<TiendaSeo>> porSlug = new LinkedHashMap<>();
        for (TiendaSeo tienda : tiendas()) {
            ProvinciasCostaRica.desdeTexto(tienda.provincia()).ifPresent(provincia ->
                porSlug.computeIfAbsent(provincia.slug(), k -> new ArrayList<>()).add(sinProvinciaCruda(tienda, provincia.nombre())));
        }
        return ProvinciasCostaRica.todas().stream()
            .filter(p -> porSlug.containsKey(p.slug()))
            .map(p -> new ProvinciaSeo(p.slug(), p.nombre(), porSlug.get(p.slug())))
            .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ProvinciaSeo> provincia(String slug) {
        return provincias().stream().filter(p -> p.slug().equals(slug)).findFirst();
    }

    /** Paths relativos que el sitemap debe incluir además de las páginas fijas. */
    @Transactional(readOnly = true)
    public List<String> rutasSitemap() {
        List<String> rutas = new ArrayList<>();
        for (TiendaSeo tienda : tiendas()) rutas.add("/tienda/" + tienda.slug());
        for (SectorResumen sector : sectores()) rutas.add("/comprar/" + sector.slug());
        for (ProvinciaSeo provincia : provincias()) rutas.add("/tiendas/" + provincia.slug());
        return rutas;
    }

    private SectorDetalle detalle(SectorResumen resumen) {
        List<ProductoSeo> productos = productoRepository
            .findProductosDeSector(resumen.slug(), PageRequest.of(0, SeoIndexacion.MAX_PRODUCTOS_LANDING))
            .stream()
            .map(SeoPublicoService::producto)
            .toList();
        String descripcion = resumen.nombre() + " en Costa Rica: comprá en línea en HotClick a emprendedores, pymes y negocios, con envío a todo el país.";
        return new SectorDetalle(resumen.slug(), resumen.nombre(), descripcion, resumen.cantidad(), productos);
    }

    private static TiendaSeo sinProvinciaCruda(TiendaSeo tienda, String provinciaNombre) {
        return new TiendaSeo(tienda.slug(), tienda.nombre(), tienda.tagline(), tienda.logoUrl(), provinciaNombre);
    }

    private static TiendaSeo tienda(Object[] fila) {
        return new TiendaSeo(texto(fila, 0), texto(fila, 1), texto(fila, 2), texto(fila, 3), texto(fila, 4));
    }

    private static SectorResumen resumen(Object[] fila) {
        return new SectorResumen(texto(fila, 0), texto(fila, 1), numero(fila[3]));
    }

    private static ProductoSeo producto(Object[] fila) {
        return new ProductoSeo(numero(fila[0]), texto(fila, 1), (int) numero(fila[2]), texto(fila, 3));
    }

    private static String texto(Object[] fila, int i) {
        Object valor = fila[i];
        return valor == null ? "" : valor.toString();
    }

    private static long numero(Object valor) {
        return valor instanceof Number n ? n.longValue() : 0L;
    }
}
