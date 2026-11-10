package com.hotclick.service.suscripcion;

import com.hotclick.controller.SuscripcionController;
import com.hotclick.controller.TenantController;
import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.SuscripcionService;
import com.hotclick.service.TenantService;
import com.hotclick.service.auth.AuthSupport;
import com.hotclick.service.prueba.PruebaPlanService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.aop.support.AopUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

/**
 * Proxy Spring real del lector (H2): transacción propia, de solo lectura, REQUIRES_NEW incluso desde una transacción
 * externa, una sola transacción para todas las páginas, DTO materializados y los dos endpoints con el mismo conjunto.
 * H2 NO prueba el aislamiento REPEATABLE READ: eso lo prueba PlanesActivosSnapshotPostgresTest contra Postgres.
 */
@DataJpaTest
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({PlanesActivosLector.class, SnapshotLecturaPg.class, PlanesLectorGancho.class})
@Transactional(propagation = Propagation.NOT_SUPPORTED)
@DisplayName("PlanesActivosLector: proxy transaccional real, REQUIRES_NEW y mismo conjunto en ambos endpoints (H2)")
class PlanesActivosLectorTransaccionTest {

    @Autowired PlanesActivosLector lector;
    @Autowired @Qualifier("planRepository") PlanRepository repoReal;
    @Autowired PlatformTransactionManager txManager;

    @BeforeEach
    void limpiar() {
        repoReal.deleteAll();
        PlanesLectorGancho.TRAS_PAGINA.set(n -> { });
    }

    @AfterEach
    void fin() {
        PlanesLectorGancho.TRAS_PAGINA.set(n -> { });
        repoReal.deleteAll();
    }

    private Plan plan(String nombre, int crc) {
        Plan p = new Plan();
        p.setNombre(nombre);
        p.setPrecioMensual(crc);
        p.setActivo(true);
        return p;
    }

    private List<Plan> sembrar(int n) {
        List<Plan> ps = new ArrayList<>();
        ps.add(plan("EMPRENDEDOR", 0));
        ps.add(plan("PYME", 12900));
        ps.add(plan("pyme", 12900));
        ps.add(plan("Negocio_Plus", 28900));
        for (int i = 0; i < n; i++) ps.add(plan("Legado " + i, 5000 + (i % 7) * 1000));
        Plan inactivo = plan("FREE", 0);
        inactivo.setActivo(false);
        ps.add(inactivo);
        return repoReal.saveAll(ps);
    }

    private static PageRequest primera() {
        return PageRequest.of(0, PlanesActivosLector.TAMANO_PAGINA, PlanesActivosLector.ORDEN);
    }

    private List<Object> esperado(List<Plan> sembrados) {
        return sembrados.stream().filter(Plan::getActivo)
            .sorted(java.util.Comparator.comparing(Plan::getPrecioMensual).thenComparing(Plan::getId))
            .map(p -> (Object) p.getId()).toList();
    }

    @Test
    @DisplayName("Es un proxy AOP y todas las páginas corren en UNA transacción de solo lectura nueva")
    void unaTransaccionLecturaParaTodasLasPaginas() {
        sembrar(130); // 134 activos: 3 páginas
        assertThat(AopUtils.isAopProxy(lector)).isTrue();
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
        List<Object> txs = new ArrayList<>();
        List<Boolean> soloLectura = new ArrayList<>();
        PlanesLectorGancho.TRAS_PAGINA.set(n -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isTrue();
            soloLectura.add(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
            txs.add(TransactionSynchronizationManager.getResource(
                ((org.springframework.orm.jpa.JpaTransactionManager) txManager).getEntityManagerFactory()));
        });
        List<PlanPublicoVista> out = lector.activos(primera());
        assertThat(out).hasSize(134);
        assertThat(soloLectura).hasSize(3).containsOnly(true);
        assertThat(txs).hasSize(3).doesNotContainNull();
        assertThat(new java.util.HashSet<>(txs)).as("misma transacción/EntityManager en las 3 páginas").hasSize(1);
        assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
    }

    @Test
    @DisplayName("Desde una transacción externa READ_COMMITTED abre una NUEVA (REQUIRES_NEW): no ve lo no confirmado de la externa")
    void requiresNewDesdeTransaccionExterna() {
        sembrar(10);
        TransactionTemplate externa = new TransactionTemplate(txManager);
        externa.setIsolationLevel(TransactionDefinition.ISOLATION_READ_COMMITTED);
        externa.execute(st -> {
            repoReal.saveAndFlush(plan("Sin confirmar", 1)); // solo visible para la transacción externa
            Object emExterna = TransactionSynchronizationManager.getResource(
                ((org.springframework.orm.jpa.JpaTransactionManager) txManager).getEntityManagerFactory());
            List<Object> emInterna = new ArrayList<>();
            PlanesLectorGancho.TRAS_PAGINA.set(n -> emInterna.add(TransactionSynchronizationManager.getResource(
                ((org.springframework.orm.jpa.JpaTransactionManager) txManager).getEntityManagerFactory())));
            List<PlanPublicoVista> out = lector.activos(primera());
            assertThat(out).extracting(PlanPublicoVista::nombre).doesNotContain("Sin confirmar").hasSize(14);
            assertThat(emInterna).isNotEmpty().allSatisfy(em -> assertThat(em).isNotSameAs(emExterna));
            st.setRollbackOnly();
            return null;
        });
    }

    @Test
    @DisplayName("Ambos endpoints con el proxy real: 1.204 activos (25 páginas), mismo conjunto y orden (precio, id), sin truncar")
    @SuppressWarnings("unchecked")
    void ambosEndpointsMismoConjunto() {
        List<Plan> sembrados = sembrar(1200);
        PreciosPlanesConfig cfg = new PreciosPlanesConfig("9", "24", "49", "usd");
        var publico = new TenantController(mock(TenantService.class), lector, mock(PruebaPlanService.class), cfg)
            .planesPublicos().getBody();
        SuscripcionController billing = new SuscripcionController(mock(SuscripcionService.class), repoReal,
            mock(AuthSupport.class), mock(CobroSuscripcionService.class), cfg, mock(PropietarioGuard.class));
        ReflectionTestUtils.setField(billing, "planesActivos", lector);
        var r = billing.listarPlanes();
        List<Object> ids = esperado(sembrados);
        assertThat(ids).hasSize(1204);
        assertThat(publico).extracting(m -> m.get("id")).containsExactlyElementsOf(ids);
        // Billing: los "Legado" no tienen precio → 409 global (comportamiento previo, mismo conjunto leído).
        assertThat(r.getStatusCode().value()).isEqualTo(409);
        assertThat(publico).filteredOn(m -> "pyme".equals(m.get("nombre"))).singleElement()
            .satisfies(m -> assertThat(m.get("precioUsd")).isEqualTo(new java.math.BigDecimal("24")));
    }

    @Test
    @DisplayName("Rechaza una primera página distinta de 0, sin paginar o sin el orden estable")
    void rechazaPaginaInvalida() {
        assertThatThrownBy(() -> lector.activos(PageRequest.of(1, 50, PlanesActivosLector.ORDEN)))
            .isInstanceOf(LecturaPlanesException.class);
        assertThatThrownBy(() -> lector.activos(PageRequest.of(0, 50, Sort.by("precioMensual"))))
            .isInstanceOf(LecturaPlanesException.class);
        assertThatThrownBy(() -> lector.activos(org.springframework.data.domain.Pageable.unpaged()))
            .isInstanceOf(LecturaPlanesException.class);
    }

    @Test
    @DisplayName("Devuelve DTO inmutables (no entidades JPA)")
    void devuelveDto() {
        sembrar(1);
        assertThat(lector.activos(primera())).allSatisfy(v -> assertThat(v).isInstanceOf(PlanPublicoVista.class));
    }
}
