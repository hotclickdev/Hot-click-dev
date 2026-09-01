package com.hotclick.service.customermemory;

import com.hotclick.dto.GustosAffinityDto;
import com.hotclick.model.Categoria;
import com.hotclick.model.Marca;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.utils.Constants;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Convierte {@code customer_memory} en scores de afinidad compatibles con gustos.ts.
 * Sin ML: resolución por nombre de categoría/marca y banda de presupuesto.
 */
@Service
public class CustomerMemoryAffinityService {

    static final int SCORE_CATEGORIA = 10;
    static final int SCORE_MARCA     = 8;
    static final int SCORE_BANDA     = 5;

    private final CustomerMemoryService memoryService;
    private final CategoriaRepository categoriaRepository;
    private final MarcaRepository marcaRepository;

    public CustomerMemoryAffinityService(CustomerMemoryService memoryService,
                                         CategoriaRepository categoriaRepository,
                                         MarcaRepository marcaRepository) {
        this.memoryService       = memoryService;
        this.categoriaRepository = categoriaRepository;
        this.marcaRepository     = marcaRepository;
    }

    public GustosAffinityDto buildAffinity(String visitorId) {
        if (!CustomerMemoryHelpers.isValidVisitorId(visitorId)) {
            return GustosAffinityDto.empty();
        }

        CustomerMemoryDto memoria = memoryService.getOrCreate(visitorId);
        if (!memoria.hasContent()) {
            return GustosAffinityDto.empty();
        }

        List<Categoria> categorias = categoriaRepository.findPublicasByEstado(Constants.ESTADO_ACTIVO);
        List<Marca> marcas = marcaRepository.findPublicasByEstado(Constants.ESTADO_ACTIVO);

        Map<String, Double> scores = new LinkedHashMap<>();
        Set<String> categoryIds = new LinkedHashSet<>();
        Set<String> priceBands = new LinkedHashSet<>();

        for (String interest : memoria.interests()) {
            Long catId = matchCategoria(interest, categorias);
            if (catId == null) continue;
            scores.put("c:" + catId, (double) SCORE_CATEGORIA);
            categoryIds.add(String.valueOf(catId));
        }

        for (String brand : memoria.preferredBrands()) {
            Long marcaId = matchMarca(brand, marcas);
            if (marcaId == null) continue;
            scores.put("m:" + marcaId, (double) SCORE_MARCA);
        }

        if (memoria.estimatedBudget() != null && memoria.estimatedBudget() > 0) {
            String band = priceBand(memoria.estimatedBudget());
            scores.put("b:" + band, (double) SCORE_BANDA);
            priceBands.add(band);
        }

        if (categoryIds.isEmpty() && scores.isEmpty()) {
            return GustosAffinityDto.empty();
        }

        return new GustosAffinityDto(
            Map.copyOf(scores),
            List.copyOf(categoryIds),
            List.copyOf(priceBands),
            true
        );
    }

    private Long matchCategoria(String interest, List<Categoria> categorias) {
        if (interest == null || interest.isBlank()) return null;
        String norm = interest.toLowerCase(Locale.ROOT).trim();
        for (Categoria c : categorias) {
            String name = c.getNombreCategoria().toLowerCase(Locale.ROOT);
            if (name.contains(norm) || norm.contains(name)) {
                return c.getId();
            }
        }
        return null;
    }

    private Long matchMarca(String brand, List<Marca> marcas) {
        if (brand == null || brand.isBlank()) return null;
        String norm = brand.toLowerCase(Locale.ROOT).trim();
        for (Marca m : marcas) {
            String name = m.getNombreMarca().toLowerCase(Locale.ROOT);
            if (name.equals(norm) || name.contains(norm) || norm.contains(name)) {
                return m.getId();
            }
        }
        return null;
    }

    /** Mismas bandas que frontend gustos.ts (₡ enteros). */
    static String priceBand(long precio) {
        if (precio < 10_000) return "b1";
        if (precio < 25_000) return "b2";
        if (precio < 50_000) return "b3";
        return "b4";
    }
}
