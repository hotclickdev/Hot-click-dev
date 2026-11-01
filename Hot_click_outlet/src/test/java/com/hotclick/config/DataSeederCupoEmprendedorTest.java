package com.hotclick.config;

import com.hotclick.model.Plan;
import com.hotclick.repository.PlanRepository;
import com.hotclick.service.suscripcion.TrialEmprendedorConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("DataSeeder — el cupo gratis de Emprendedor sale de la configuración, no de un literal")
class DataSeederCupoEmprendedorTest {

    @Test
    @DisplayName("La descripción usa el cupo configurado")
    void descripcionUsaElCupoConfigurado() {
        assertThat(DataSeeder.descripcionEmprendedor(25)).contains("los primeros 25 negocios").doesNotContain("70");
        assertThat(DataSeeder.descripcionEmprendedor(120)).contains("los primeros 120 negocios");
    }

    @Test
    @DisplayName("Sin cupo válido cae a una frase sin cifra")
    void sinCupoValidoNoInventaCifra() {
        for (Integer cupo : new Integer[] {null, 0, -5}) {
            assertThat(DataSeeder.descripcionEmprendedor(cupo))
                .contains("los primeros negocios")
                .doesNotContainPattern("\\d+ negocios");
        }
    }

    @Test
    @DisplayName("El seeder guarda el plan EMPRENDEDOR con el cupo de TrialEmprendedorConfig (25, no 70)")
    void seederGuardaElPlanConElCupoConfigurado() throws Exception {
        PlanRepository planRepository = mock(PlanRepository.class);
        when(planRepository.findByNombre(any())).thenReturn(Optional.empty());
        DataSeeder seeder = new DataSeeder();
        ReflectionTestUtils.setField(seeder, "planRepository", planRepository);
        ReflectionTestUtils.setField(seeder, "trialConfig", new TrialEmprendedorConfig(25, 90));
        ReflectionTestUtils.setField(seeder, "empPrecio", 0);
        ReflectionTestUtils.setField(seeder, "empPct", new BigDecimal("9"));
        ReflectionTestUtils.setField(seeder, "pymePrecio", 0);
        ReflectionTestUtils.setField(seeder, "pymePct", new BigDecimal("7"));
        ReflectionTestUtils.setField(seeder, "plusPrecio", 0);
        ReflectionTestUtils.setField(seeder, "plusPct", new BigDecimal("7"));

        Method m = DataSeeder.class.getDeclaredMethod("seedPlanesSaas");
        m.setAccessible(true);
        m.invoke(seeder);

        ArgumentCaptor<Plan> captor = ArgumentCaptor.forClass(Plan.class);
        verify(planRepository, atLeastOnce()).save(captor.capture());
        Plan emprendedor = captor.getAllValues().stream()
            .filter(p -> "EMPRENDEDOR".equals(p.getNombre())).findFirst().orElseThrow();
        assertThat(emprendedor.getDescripcion()).contains("los primeros 25 negocios").doesNotContain("70");
    }

    @Test
    @DisplayName("DataSeeder.java no vuelve a traer «70 negocios» fijo")
    void fuenteSinCupoFijo() throws Exception {
        Path fuente = raizDelProyecto().resolve("src/main/java/com/hotclick/config/DataSeeder.java");
        assertThat(Files.readString(fuente)).doesNotContain("primeros 70").doesNotContain("70 negocios");
    }

    /** Sube desde la ubicación de las clases compiladas hasta el pom.xml; no depende del directorio de trabajo. */
    private static Path raizDelProyecto() throws Exception {
        Path dir = Path.of(DataSeeder.class.getProtectionDomain().getCodeSource().getLocation().toURI());
        while (dir != null && !Files.exists(dir.resolve("pom.xml"))) {
            dir = dir.getParent();
        }
        assertThat(dir).as("raíz del proyecto (pom.xml) encontrada desde el classpath").isNotNull();
        return dir;
    }
}
