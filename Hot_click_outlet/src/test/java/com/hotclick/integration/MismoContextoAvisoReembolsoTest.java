package com.hotclick.integration;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.lang.reflect.Field;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regresión #466: AvisoReembolsoPendienteIntegracionTest debe compartir el contexto de Spring de
 * OnvoSobreventaPostCobroTest (mismos @MockitoBean). Si crea uno propio, el cache de contextos desaloja otro y su
 * ddl-auto=create-drop borra el esquema del H2 compartido para los tests que vienen después.
 */
@DisplayName("[Aviso admin] El test de integración reutiliza un contexto existente (sin desalojo del cache)")
class MismoContextoAvisoReembolsoTest {

    private static Set<Class<?>> mocks(Class<?> c) {
        return Arrays.stream(c.getDeclaredFields())
            .filter(f -> f.isAnnotationPresent(MockitoBean.class))
            .map(Field::getType)
            .collect(Collectors.toSet());
    }

    @Test
    @DisplayName("Mismo set de @MockitoBean que OnvoSobreventaPostCobroTest")
    void mismoSetDeMocks() {
        assertThat(mocks(AvisoReembolsoPendienteIntegracionTest.class))
            .isNotEmpty()
            .isEqualTo(mocks(OnvoSobreventaPostCobroTest.class));
    }
}
