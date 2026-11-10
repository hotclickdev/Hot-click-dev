package com.hotclick.repository;

import com.hotclick.model.Plan;
import com.hotclick.service.suscripcion.PlanPublicoMapper;
import com.hotclick.utils.PaginasCompletas;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** SCALE1 /api/planes y /api/billing/planes: lectura paginada real (H2) de TODOS los planes activos, sin truncar. */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DisplayName("PlanRepository: todos los activos paginados con orden estable (H2)")
class PlanRepositoryActivosPaginadosJpaTest {

    @Autowired PlanRepository repo;

    private Plan plan(String nombre, int crc, boolean activo) {
        Plan p = new Plan();
        p.setNombre(nombre);
        p.setPrecioMensual(crc);
        p.setActivo(activo);
        return repo.save(p);
    }

    private List<Plan> leerTodos() {
        return PaginasCompletas.todas(repo::findByActivoTrue,
            PageRequest.of(0, PlanPublicoMapper.TAMANO_PAGINA, PlanPublicoMapper.ORDEN), PlanPublicoMapper.MAX_PAGINAS);
    }

    @Test
    @DisplayName("Más de 2 páginas, nombres no canónicos y empates de precio: todos los activos, una vez, en (precio, id)")
    void todosLosActivosSinTruncar() {
        List<Plan> activos = new ArrayList<>();
        activos.add(plan("NEGOCIO_PLUS", 28900, true));
        activos.add(plan("EMPRENDEDOR", 0, true));
        activos.add(plan("PYME", 12900, true));
        activos.add(plan("pyme", 12900, true));          // otra capitalización, mismo precio: desempata id
        activos.add(plan("Negocio_Plus", 28900, true));
        for (int i = 0; i < 110; i++) activos.add(plan("Legado Feria " + i, i % 3 == 0 ? 0 : 5000, true));
        plan("FREE", 0, false);
        plan("Inicio Ferial", 0, false);

        List<Plan> out = leerTodos();

        assertThat(out).hasSize(activos.size());
        assertThat(out).extracting(Plan::getId).doesNotHaveDuplicates()
            .containsExactlyElementsOf(activos.stream()
                .sorted(Comparator.comparing(Plan::getPrecioMensual).thenComparing(Plan::getId))
                .map(Plan::getId).toList());
        assertThat(out).extracting(Plan::getNombre).contains("pyme", "Negocio_Plus", "Legado Feria 109")
            .doesNotContain("FREE", "Inicio Ferial");
    }

    @Test
    @DisplayName("Un plan inactivo no aparece (misma regla activo=true que antes)")
    void inactivoNoAparece() {
        plan("EMPRENDEDOR", 0, true);
        plan("PYME", 12900, false);
        plan("NEGOCIO_PLUS", 28900, true);
        assertThat(leerTodos()).extracting(Plan::getNombre).containsExactly("EMPRENDEDOR", "NEGOCIO_PLUS");
    }
}
