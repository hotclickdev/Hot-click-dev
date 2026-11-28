package com.hotclick.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regresión del panel de auditoría: con filtros nulos PostgreSQL tipaba el parámetro como {@code bytea} y la consulta
 * caía con {@code function lower(bytea) does not exist}. Los filtros de texto deben ir siempre con
 * {@code CAST(:p AS String)}.
 */
@DisplayName("AuditoriaAdminRepository.buscar: filtros de texto nulos con CAST")
class AuditoriaAdminRepositoryQueryTest {

    private static String jpql() throws NoSuchMethodException {
        Query q = AuditoriaAdminRepository.class
                .getMethod("buscar", String.class, String.class, Long.class, LocalDateTime.class, LocalDateTime.class, Pageable.class)
                .getAnnotation(Query.class);
        return q.value().replaceAll("\\s+", " ");
    }

    @Test
    @DisplayName("cada uso de :accion y :adminEmail va dentro de CAST(... AS String)")
    void filtrosDeTextoConCast() throws Exception {
        String sql = jpql();
        for (String p : new String[] {":accion", ":adminEmail"}) {
            int usos = sql.split(p + "\\b", -1).length - 1;
            int conCast = sql.split("CAST\\(" + p + " AS String\\)", -1).length - 1;
            assertThat(usos).as("usos de %s", p).isGreaterThan(0);
            assertThat(conCast).as("usos de %s con CAST", p).isEqualTo(usos);
        }
    }

    @Test
    @DisplayName("no queda LOWER aplicado directo a un parámetro sin tipo")
    void sinLowerSobreParametroCrudo() throws Exception {
        assertThat(jpql()).doesNotContainPattern("LOWER\\(CONCAT\\('%', :");
    }
}
