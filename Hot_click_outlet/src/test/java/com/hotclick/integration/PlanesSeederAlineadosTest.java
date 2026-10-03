package com.hotclick.integration;

import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Decisiones del 3-oct-2026: el POS va en los tres planes y las descripciones de plan no publican montos
 * (contradecían la web; los montos los fija HOT_CLICK).
 */
@DisplayName("DataSeeder — planes alineados con las decisiones del 3-oct-2026")
class PlanesSeederAlineadosTest extends BaseIntegrationTest {

    @Autowired private PlanRepository planRepository;

    @ParameterizedTest(name = "{0} incluye POS y su descripción no trae montos")
    @ValueSource(strings = {"EMPRENDEDOR", "PYME", "NEGOCIO_PLUS"})
    void planConPosYSinMontos(String nombre) {
        Plan plan = planRepository.findByNombre(nombre).orElseThrow();
        assertTrue(Boolean.TRUE.equals(plan.getTienePos()), nombre + " debe incluir POS");
        String descripcion = plan.getDescripcion() == null ? "" : plan.getDescripcion();
        assertFalse(descripcion.matches("(?s).*(₡|\\d\\s?%).*"), nombre + " no debe publicar montos: " + descripcion);
    }
}
