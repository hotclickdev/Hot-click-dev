package com.hotclick.config;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.CupoEmprendedorNoDisponibleException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("GlobalExceptionHandler: fallo de BD al reservar el puesto Emprendedor")
class CupoEmprendedorNoDisponibleHandlerTest {

    @Test
    @DisplayName("Responde 409 con código CUPO_EMPRENDEDOR_NO_DISPONIBLE y mensaje fijo, no 500")
    void responde409ConCodigo() {
        ResponseEntity<ResponseDTO> r = new GlobalExceptionHandler()
            .handleCupoNoDisponible(new CupoEmprendedorNoDisponibleException());

        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(r.getBody()).isNotNull();
        assertThat(r.getBody().isSuccess()).isFalse();
        assertThat(r.getBody().getMessage()).isEqualTo(CupoEmprendedorNoDisponibleException.MENSAJE);
        assertThat(r.getBody().getData()).isEqualTo(Map.of("codigo", "CUPO_EMPRENDEDOR_NO_DISPONIBLE"));
    }
}
