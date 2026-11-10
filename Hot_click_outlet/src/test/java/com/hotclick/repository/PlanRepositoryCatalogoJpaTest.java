package com.hotclick.repository;

import com.hotclick.model.Plan;
import com.hotclick.service.suscripcion.PreciosPlanesConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SCALE1 /api/planes: la consulta del catálogo acotado devuelve los 3 planes activos y deja afuera inactivos y ajenos. */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("PlanRepository: catálogo acotado de planes públicos (H2)")
class PlanRepositoryCatalogoJpaTest {

    @Autowired PlanRepository repo;

    private Plan plan(String nombre, int crc, boolean activo) {
        Plan p = new Plan();
        p.setNombre(nombre);
        p.setPrecioMensual(crc);
        p.setActivo(activo);
        return repo.save(p);
    }

    @Test
    @DisplayName("Activos del catálogo, ordenados por precio_mensual; sin FREE inactivo ni planes fuera del catálogo")
    void catalogoAcotado() {
        plan("NEGOCIO_PLUS", 28900, true);
        plan("EMPRENDEDOR", 0, true);
        plan("PYME", 12900, true);
        plan("FREE", 0, false);
        plan("Inicio Ferial", 0, false);
        List<Plan> out = repo.findByNombreInAndActivoTrueOrderByPrecioMensualAsc(
            PreciosPlanesConfig.CATALOGO, PageRequest.of(0, PreciosPlanesConfig.CATALOGO.size()));
        assertThat(out).extracting(Plan::getNombre).containsExactly("EMPRENDEDOR", "PYME", "NEGOCIO_PLUS");
    }

    @Test
    @DisplayName("Un plan del catálogo inactivo no aparece (misma regla activo=true que antes)")
    void inactivoNoAparece() {
        plan("EMPRENDEDOR", 0, true);
        plan("PYME", 12900, false);
        plan("NEGOCIO_PLUS", 28900, true);
        assertThat(repo.findByNombreInAndActivoTrueOrderByPrecioMensualAsc(
                PreciosPlanesConfig.CATALOGO, PageRequest.of(0, PreciosPlanesConfig.CATALOGO.size())))
            .extracting(Plan::getNombre).containsExactly("EMPRENDEDOR", "NEGOCIO_PLUS");
    }
}
