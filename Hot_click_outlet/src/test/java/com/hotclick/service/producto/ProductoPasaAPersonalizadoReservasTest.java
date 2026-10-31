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

/** LOW #456: un personalizado no usa reservas; al pasar a personalizado no quedan reservas viejas. */
@ExtendWith(MockitoExtension.class)
@DisplayName("LOW #456: pasar a personalizado limpia stock_reservado")
class ProductoPasaAPersonalizadoReservasTest {

    @Mock MarcaRepository marcaRepository;
    private ProductoDtoMapper mapper;

    @BeforeEach
    void setup() { mapper = new ProductoDtoMapper(new InputSanitizer(), marcaRepository); }

    private Producto conReservas(Boolean personalizado) {
        Producto p = new Producto();
        p.setEsPersonalizado(personalizado);
        p.setStockActual(5);
        p.setStockReservado(3);
        return p;
    }

    @Test
    @DisplayName("normal con reservas → personalizado: stock_reservado queda en 0")
    void pasaAPersonalizado_limpiaReservas() {
        Producto p = conReservas(false);
        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setEsPersonalizado(true);
        dto.setModoPrecioPersonalizado("COTIZACION");

        mapper.mapDtoToProducto(dto, p);

        assertThat(p.getEsPersonalizado()).isTrue();
        assertThat(p.getStockReservado()).isZero();
        assertThat(p.getStockActual()).isEqualTo(5);
    }

    @Test
    @DisplayName("edición que no cambia a personalizado: las reservas quedan igual")
    void sinCambio_noToca() {
        Producto normal = conReservas(false);
        mapper.mapDtoToProducto(new ProductoRequestDTO(), normal);
        assertThat(normal.getStockReservado()).isEqualTo(3);

        Producto quitaPersonalizado = conReservas(true);
        ProductoRequestDTO dto = new ProductoRequestDTO();
        dto.setEsPersonalizado(false);
        mapper.mapDtoToProducto(dto, quitaPersonalizado);
        assertThat(quitaPersonalizado.getStockReservado()).isEqualTo(3);
    }
}
