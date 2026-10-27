package com.hotclick.controller;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.TurnoCajaService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** QA6-R4-02: PUT /api/pos/caja/9999/cerrar daba 500; debe ser 404. */
class TurnoCajaCerrarInexistenteTest {

    @Test
    void turnoInexistenteDa404() {
        TurnoCajaService service = mock(TurnoCajaService.class);
        when(service.cerrarTurno(eq(9999L), any(), any()))
            .thenThrow(new RecursoNoEncontradoException("Turno no encontrado"));
        TurnoCajaController controller = new TurnoCajaController();
        ReflectionTestUtils.setField(controller, "turnoCajaService", service);

        ResponseEntity<?> r = controller.cerrar(9999L, Map.of("montoDeclarado", 0));

        assertThat(r.getStatusCode().value()).isEqualTo(404);
    }
}
