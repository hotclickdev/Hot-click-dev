package com.hotclick.config;

import com.hotclick.monitoreo.OnvoPedidosPendientesJob;
import com.hotclick.service.suscripcion.AdminSuspensionService;
import net.javacrumbs.shedlock.core.LockConfiguration;
import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.core.SimpleLock;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.filter.AssignableTypeFilter;
import org.springframework.util.ClassUtils;

import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/** QA5-SL-01: ShedLock lanza LockingNotSupportedException si un @SchedulerLock no devuelve void. */
class SchedulerLockVoidTest {

    static final List<String> LOCKS = new CopyOnWriteArrayList<>();

    @Configuration
    @EnableSchedulerLock(defaultLockAtMostFor = "PT10M")
    static class Cfg {
        @Bean LockProvider lockProvider() {
            return (LockConfiguration c) -> {
                LOCKS.add(c.getName());
                SimpleLock l = () -> { };
                return Optional.of(l);
            };
        }
        @Bean OnvoPedidosPendientesJob job() throws Exception {
            var k = OnvoPedidosPendientesJob.class.getDeclaredConstructor(
                com.hotclick.repository.PagoRepository.class, com.hotclick.service.TelegramService.class,
                int.class, java.time.Clock.class);
            k.setAccessible(true);
            return k.newInstance(mock(com.hotclick.repository.PagoRepository.class),
                mock(com.hotclick.service.TelegramService.class), 30, java.time.Clock.systemUTC());
        }
        @Bean AdminSuspensionService suspension() throws Exception {
            // Constructor real con dependencias mock (SuscripcionPlanSupport es package-private).
            var k = AdminSuspensionService.class.getConstructors()[0];
            Object[] args = new Object[k.getParameterCount()];
            Class<?>[] tipos = k.getParameterTypes();
            for (int i = 0; i < tipos.length; i++) args[i] = tipos[i] == int.class ? 3 : mock(tipos[i]);
            return (AdminSuspensionService) k.newInstance(args);
        }
    }

    @Test
    void cadaJobCorreConElLockSinLanzar() {
        LOCKS.clear();
        try (var ctx = new AnnotationConfigApplicationContext(Cfg.class)) {
            OnvoPedidosPendientesJob job = ctx.getBean(OnvoPedidosPendientesJob.class);
            AdminSuspensionService svc = ctx.getBean(AdminSuspensionService.class);
            job.revisarProgramado();
            svc.vencerExtensionesProgramado();
            assertThat(LOCKS).containsExactly("onvo-pedidos-pendientes", "vencerExtensionesImpago");
        }
    }

    @Test
    void ningunSchedulerLockDevuelveAlgoDistintoDeVoid() throws Exception {
        var scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AssignableTypeFilter(Object.class));
        List<String> malos = new ArrayList<>();
        int total = 0;
        for (var bd : scanner.findCandidateComponents("com.hotclick")) {
            Class<?> c;
            try { c = ClassUtils.forName(bd.getBeanClassName(), getClass().getClassLoader()); }
            catch (Throwable t) { continue; }
            for (Method m : c.getDeclaredMethods()) {
                if (m.isAnnotationPresent(SchedulerLock.class)) {
                    total++;
                    if (m.getReturnType() != void.class) malos.add(c.getSimpleName() + "." + m.getName());
                }
            }
        }
        assertThat(total).as("debe encontrar los @SchedulerLock del repo").isGreaterThan(10);
        assertThat(malos).as("@SchedulerLock con retorno no void").isEmpty();
    }
}
