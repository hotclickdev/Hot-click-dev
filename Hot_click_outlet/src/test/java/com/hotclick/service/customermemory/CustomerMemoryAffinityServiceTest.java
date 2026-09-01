package com.hotclick.service.customermemory;

import com.hotclick.dto.GustosAffinityDto;
import com.hotclick.model.Categoria;
import com.hotclick.model.Marca;
import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.MarcaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomerMemoryAffinityServiceTest {

    @Mock private CustomerMemoryService memoryService;
    @Mock private CategoriaRepository categoriaRepository;
    @Mock private MarcaRepository marcaRepository;

    private CustomerMemoryAffinityService service;

    @BeforeEach
    void setUp() {
        service = new CustomerMemoryAffinityService(memoryService, categoriaRepository, marcaRepository);
    }

    @Test
    void priceBand_matchesFrontend() {
        assertThat(CustomerMemoryAffinityService.priceBand(5_000)).isEqualTo("b1");
        assertThat(CustomerMemoryAffinityService.priceBand(15_000)).isEqualTo("b2");
        assertThat(CustomerMemoryAffinityService.priceBand(40_000)).isEqualTo("b3");
        assertThat(CustomerMemoryAffinityService.priceBand(80_000)).isEqualTo("b4");
    }

    @Test
    void buildAffinity_mapsInterestsBrandsAndBudget() {
        String visitorId = "550e8400-e29b-41d4-a716-446655440000";

        Categoria tecnologia = new Categoria();
        tecnologia.setId(10L);
        tecnologia.setNombreCategoria("Tecnología");

        Marca nike = new Marca();
        nike.setId(5L);
        nike.setNombreMarca("Nike");

        when(memoryService.getOrCreate(visitorId)).thenReturn(new CustomerMemoryDto(
            visitorId,
            "Busca zapatillas",
            List.of("tecnología"),
            List.of("Nike"),
            20_000L
        ));
        when(categoriaRepository.findPublicasByEstado(1)).thenReturn(List.of(tecnologia));
        when(marcaRepository.findPublicasByEstado(1)).thenReturn(List.of(nike));

        GustosAffinityDto dto = service.buildAffinity(visitorId);

        assertThat(dto.fromBackend()).isTrue();
        assertThat(dto.selectedCategoryIds()).containsExactly("10");
        assertThat(dto.selectedPriceBands()).containsExactly("b2");
        assertThat(dto.scores()).containsEntry("c:10", 10.0);
        assertThat(dto.scores()).containsEntry("m:5", 8.0);
        assertThat(dto.scores()).containsEntry("b:b2", 5.0);
    }

    @Test
    void buildAffinity_invalidVisitor_returnsEmpty() {
        GustosAffinityDto dto = service.buildAffinity("not-a-uuid");
        assertThat(dto.fromBackend()).isFalse();
        assertThat(dto.scores()).isEmpty();
    }

    @Test
    void buildAffinity_emptyMemory_returnsEmpty() {
        String visitorId = "550e8400-e29b-41d4-a716-446655440001";
        when(memoryService.getOrCreate(anyString()))
            .thenReturn(CustomerMemoryDto.empty(visitorId));

        GustosAffinityDto dto = service.buildAffinity(visitorId);

        assertThat(dto.fromBackend()).isFalse();
        assertThat(dto.scores()).isEmpty();
    }
}
