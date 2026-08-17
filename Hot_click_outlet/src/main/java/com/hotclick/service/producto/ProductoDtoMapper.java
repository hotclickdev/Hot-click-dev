package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Producto;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.utils.InputSanitizer;
import org.springframework.stereotype.Component;

@Component
public class ProductoDtoMapper {

    private final InputSanitizer sanitizer;
    private final MarcaRepository marcaRepository;

    public ProductoDtoMapper(InputSanitizer sanitizer, MarcaRepository marcaRepository) {
        this.sanitizer = sanitizer;
        this.marcaRepository = marcaRepository;
    }

    public void mapDtoToProducto(ProductoRequestDTO dto, Producto p) {
        if (dto.getNombreProducto()     != null) p.setNombreProducto(sanitizer.cleanWithLimit(dto.getNombreProducto(), 200));
        if (dto.getDescripcionCorta()   != null) p.setDescripcionCorta(sanitizer.cleanWithLimit(dto.getDescripcionCorta(), 255));
        if (dto.getTituloProducto()     != null) p.setTituloProducto(sanitizer.cleanWithLimit(dto.getTituloProducto(), 255));
        if (dto.getMarcaTexto()         != null) p.setMarcaTexto(sanitizer.cleanWithLimit(dto.getMarcaTexto(), 100));
        if (dto.getLinkAmazon()         != null) p.setLinkAmazon(sanitizer.cleanWithLimit(dto.getLinkAmazon(), 500));
        if (dto.getImagenPrincipalUrl() != null) p.setImagenPrincipalUrl(sanitizer.cleanWithLimit(dto.getImagenPrincipalUrl(), 500));
        if (dto.getCondicion()          != null) p.setCondicion(dto.getCondicion());
        if (dto.getPrecioCompra()       != null) p.setPrecioCompra(dto.getPrecioCompra());
        if (dto.getPrecioVenta()        != null) p.setPrecioVenta(dto.getPrecioVenta());
        if (dto.getStockActual()        != null) p.setStockActual(dto.getStockActual());
        if (dto.getStockMinimo()        != null) p.setStockMinimo(dto.getStockMinimo());
        if (dto.getVisibleCatalogo()    != null) p.setVisibleCatalogo(dto.getVisibleCatalogo());
        if (dto.getDestacado()          != null) p.setDestacado(dto.getDestacado());
        // Rich text: permite negrita/lista pero bloquea scripts
        if (dto.getEspecificaciones()   != null) p.setEspecificaciones(sanitizer.cleanRichText(dto.getEspecificaciones()));
        if (dto.getComoUsar()           != null) p.setComoUsar(sanitizer.cleanRichText(dto.getComoUsar()));
        if (dto.getDescripcionLarga()   != null) p.setDescripcionLarga(sanitizer.cleanRichText(dto.getDescripcionLarga()));
        if (dto.getMetaTitle()          != null) p.setMetaTitle(sanitizer.cleanWithLimit(dto.getMetaTitle(), 70));
        if (dto.getMetaDescription()    != null) p.setMetaDescription(sanitizer.cleanWithLimit(dto.getMetaDescription(), 160));
        if (dto.getMetaKeywords()       != null) p.setMetaKeywords(sanitizer.cleanWithLimit(dto.getMetaKeywords(), 255));
        if (dto.getMetaTitleEn()        != null) p.setMetaTitleEn(sanitizer.cleanWithLimit(dto.getMetaTitleEn(), 70));
        if (dto.getMetaTitlePt()        != null) p.setMetaTitlePt(sanitizer.cleanWithLimit(dto.getMetaTitlePt(), 70));
        if (dto.getMetaTitleFr()        != null) p.setMetaTitleFr(sanitizer.cleanWithLimit(dto.getMetaTitleFr(), 70));
        if (dto.getMetaDescriptionEn()  != null) p.setMetaDescriptionEn(sanitizer.cleanWithLimit(dto.getMetaDescriptionEn(), 160));
        if (dto.getMetaDescriptionPt()  != null) p.setMetaDescriptionPt(sanitizer.cleanWithLimit(dto.getMetaDescriptionPt(), 160));
        if (dto.getMetaDescriptionFr()  != null) p.setMetaDescriptionFr(sanitizer.cleanWithLimit(dto.getMetaDescriptionFr(), 160));
        if (dto.getVideoUrl()           != null) p.setVideoUrl(sanitizer.cleanWithLimit(dto.getVideoUrl(), 500));
        if (dto.getTalla()              != null) p.setTalla(sanitizer.cleanWithLimit(dto.getTalla(), 20));
        if (dto.getGrupoVarianteId()    != null) p.setGrupoVarianteId(sanitizer.cleanWithLimit(dto.getGrupoVarianteId(), 64));
        if (dto.getColorVariante()      != null) p.setColorVariante(sanitizer.cleanWithLimit(dto.getColorVariante(), 50));
        if (dto.getTags()               != null) p.setTags(sanitizer.cleanWithLimit(dto.getTags().toLowerCase(), 500));
        Long mid = dto.getMarcaId();
        if (mid != null) {
            p.setMarca(marcaRepository.findById(mid)
                .orElseThrow(() -> new RecursoNoEncontradoException("Marca", mid)));
        }
    }
}
