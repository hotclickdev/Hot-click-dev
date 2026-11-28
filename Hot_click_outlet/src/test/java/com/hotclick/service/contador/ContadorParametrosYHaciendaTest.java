package com.hotclick.service.contador;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@DisplayName("Contador IA: parámetros editables, consultas a Hacienda y migración V263")
class ContadorParametrosYHaciendaTest {

    @Test
    @DisplayName("Valores dudosos sin fijar: factores del RTS y formularios vacíos; tipo y período con su valor por defecto")
    void defectos() {
        Map<String, String> p = new ContadorParametrosService(mock(JdbcTemplate.class)).todos();
        assertThat(p.get(ContadorParametrosService.RTS_FACTOR_IVA_4719)).isEmpty();
        assertThat(p.get(ContadorParametrosService.RTS_FACTOR_RENTA_4741)).isEmpty();
        assertThat(p.get(ContadorParametrosService.RTS_FORMULARIO)).isEmpty();
        assertThat(p.get(ContadorParametrosService.TIPO_PERSONA)).isEqualTo("JURIDICA");
        assertThat(p.get(ContadorParametrosService.PERIODO_RENTA)).isEqualTo("OCT_SEP");
        assertThat(ContadorParametrosService.factoresRts(p)).isNull();
    }

    @Test
    @DisplayName("Validación: clave desconocida, factor fuera de 0..1, opción inválida y tramos mal formados")
    void validacion() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var svc = new ContadorParametrosService(jdbc);
        assertThatThrownBy(() -> svc.actualizar(Map.of("OTRA", "1"))).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.actualizar(Map.of(ContadorParametrosService.RTS_FACTOR_IVA_4719, "1.5")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.actualizar(Map.of(ContadorParametrosService.TIPO_PERSONA, "EMPRESA")))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.actualizar(Map.of(ContadorParametrosService.RENTA_TRAMOS_JURIDICA, "5:5;3:10;:20")))
            .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(jdbc);
        svc.actualizar(Map.of(ContadorParametrosService.RTS_FACTOR_IVA_4719, "0.0125", ContadorParametrosService.RTS_FORMULARIO, "D-105"));
        verify(jdbc).batchUpdate(anyString(), anyList());
    }

    @Test
    @DisplayName("Las 4 consultas a Hacienda son borradores para copiar, con el aviso de revisión")
    void hacienda() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        var svc = new ContadorHaciendaService(jdbc);
        assertThat(svc.listar()).hasSize(4).allSatisfy(c -> assertThat(c.get("aviso")).isEqualTo(ContadorTextos.AVISO_BORRADOR));
        Map<String, Object> b = svc.borrador("FEC_NO_INSCRITOS");
        assertThat((String) b.get("texto")).startsWith(ContadorTextos.AVISO_BORRADOR).contains("Factura Electrónica de Compra")
            .contains("Decreto 25514-H");
        assertThatThrownBy(() -> svc.borrador("OTRA")).isInstanceOf(IllegalArgumentException.class);
        assertThat(ContadorTextos.AVISO_BORRADOR).isEqualTo("Borrador: revisar con un contador público antes de enviar.");
    }

    @Test
    @DisplayName("V263 es aditiva e idempotente, y Actualizado.sql la lleva sin INSERT")
    void migracion() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V263__contador_ia.sql"));
        String upper = sql.toUpperCase();
        assertThat(upper).doesNotContain("DROP ").doesNotContain("DELETE FROM").doesNotContain("TRUNCATE").doesNotContain("INSERT ");
        assertThat(sql.split("CREATE TABLE ").length - 1).isEqualTo(sql.split("CREATE TABLE IF NOT EXISTS").length - 1);
        assertThat(sql.split("ADD COLUMN ").length - 1).isEqualTo(sql.split("ADD COLUMN IF NOT EXISTS").length - 1);
        String a = Files.readString(Path.of("Actualizado.sql"));
        assertThat(a).contains("V263: Contador IA").contains("hot_click_contador_consulta_tb").contains("hot_click_contador_param_tb")
            .contains("hot_click_contador_hacienda_tb").contains("limite_preguntas_dia");
    }
}
