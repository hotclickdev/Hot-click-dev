package com.hotclick.catalogo;

import com.hotclick.repository.CategoriaRepository;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.MarcaRepository;
import com.hotclick.repository.ProductoRepository;
import com.hotclick.repository.SuscripcionRepository;
import com.hotclick.service.catalogo.CatalogoChatSql;
import com.hotclick.service.contacto.ContactoTextoPublico;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Query;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("El catálogo público no lista REQUIERE_MEMBRESIA")
class CatalogoPublicoGateTest {

    @Test
    void consultasConVisibilidadExigenMembresiaConfirmada() {
        for (Class<?> tipo : new Class<?>[] {
            ProductoRepository.class, EmpresaRepository.class, CategoriaRepository.class, MarcaRepository.class
        }) {
            for (Method metodo : tipo.getMethods()) {
                Query query = metodo.getAnnotation(Query.class);
                if (query == null) continue;
                String sql = query.value() + " " + query.countQuery();
                if (!sql.contains("visibilidad_publica") && !sql.contains("visibilidadPublica")) continue;
                assertThat(sql)
                    .as(tipo.getSimpleName() + "." + metodo.getName())
                    .contains("REQUIERE_MEMBRESIA");
            }
        }
    }

    @Test
    void chatYNombrePublicoUsanElMismoFiltro() {
        assertThat(CatalogoChatSql.filtroEmpresa(true)).contains(CatalogoPublicoGate.NATIVA_EMP);
        assertThat(ContactoTextoPublico.SQL_NEGOCIO_PRODUCTO).contains(CatalogoPublicoGate.NATIVA_E);
    }

    @Test
    void jobDeReconciliacionIncluyeAltaSinPlanPendiente() throws Exception {
        Query query = SuscripcionRepository.class
            .getMethod("findOnvoPendientesRecientes", java.time.LocalDateTime.class, org.springframework.data.domain.Pageable.class)
            .getAnnotation(Query.class);
        assertThat(query.value())
            .contains("planPendiente IS NULL")
            .contains("REQUIERE_MEMBRESIA")
            .contains("INCOMPLETE")
            .doesNotContain("TRIAL");
        long abiertos = query.value().chars().filter(c -> c == '(').count();
        long cerrados = query.value().chars().filter(c -> c == ')').count();
        assertThat(abiertos).isEqualTo(cerrados);
    }
}
