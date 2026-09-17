package com.hotclick.service.producto;

import com.hotclick.dto.ProductoRequestDTO;
import com.hotclick.model.Producto;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.utils.InputSanitizer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
@DisplayName("Código de barras al registrar producto")
class ProductoDtoMapperBarcodeTest {

    @Mock MarcaRepository marcaRepository;
    private ProductoDtoMapper mapper;

    @BeforeEach
    void setup() {
        mapper = new ProductoDtoMapper(new InputSanitizer(), marcaRepository);
    }

    @Test
    @DisplayName("Guarda el número y quita espacios y guiones")
    void guardaCompacto() {
        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setBarcode("750 1234-567890");
        Producto producto = new Producto();

        mapper.mapDtoToProducto(dto, producto);

        assertThat(producto.getBarcode()).isEqualTo("7501234567890");
    }

    @Test
    @DisplayName("Vacío borra un código ya guardado")
    void vacioBorra() {
        Producto producto = new Producto();
        producto.setBarcode("7501234567890");
        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setBarcode("   ");

        mapper.mapDtoToProducto(dto, producto);

        assertThat(producto.getBarcode()).isNull();
    }

    @Test
    @DisplayName("Si no viene en el DTO, el código queda igual")
    void omitidoNoCambia() {
        Producto producto = new Producto();
        producto.setBarcode("7501234567890");
        ProductoRequestDTO dto = new ProductoRequestDTO();

        mapper.mapDtoToProducto(dto, producto);

        assertThat(producto.getBarcode()).isEqualTo("7501234567890");
    }
}
