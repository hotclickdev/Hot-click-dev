package com.hotclick.service.suscripcion;

import com.hotclick.repository.PlanRepository;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Proxy;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.IntConsumer;

/**
 * Solo tests: PlanRepository @Primary que delega en el repositorio real de Spring Data y, DESPUÉS de cada página de
 * {@code findByActivoTrue}, ejecuta un gancho (número de página) dentro de la transacción del lector. Sirve para
 * observar la transacción y para poner una barrera entre páginas.
 */
@TestConfiguration
public class PlanesLectorGancho {

    public static final AtomicReference<IntConsumer> TRAS_PAGINA = new AtomicReference<>(n -> { });

    @Bean
    @Primary
    PlanRepository planRepositoryConGancho(@Qualifier("planRepository") PlanRepository real) {
        return (PlanRepository) Proxy.newProxyInstance(PlanRepository.class.getClassLoader(),
            new Class<?>[]{PlanRepository.class}, (proxy, m, args) -> {
                Object out;
                try {
                    out = m.invoke(real, args);
                } catch (InvocationTargetException e) {
                    throw e.getCause();
                }
                if ("findByActivoTrue".equals(m.getName())) {
                    TRAS_PAGINA.get().accept(((org.springframework.data.domain.Pageable) args[0]).getPageNumber());
                }
                return out;
            });
    }
}
