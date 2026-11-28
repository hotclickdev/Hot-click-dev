package com.hotclick.service.fiscal;

import com.hotclick.service.HaciendaContribuyenteService;
import com.hotclick.service.HaciendaContribuyenteService.ContribuyenteDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("Base fiscal: comprobación automática contra Hacienda (API simulada, nunca la real)")
class FiscalVerificacionAutoTest {

    private static final String CEDULA = "3111111111";
    private HaciendaContribuyenteService hacienda;
    private FiscalVerificacionAuto auto;

    @BeforeEach
    void setUp() {
        hacienda = mock(HaciendaContribuyenteService.class);
        auto = new FiscalVerificacionAuto(hacienda);
    }

    private static ContribuyenteDTO dto(String nombre, String estado, String regimen, List<String> actividades) {
        return new ContribuyenteDTO(CEDULA, nombre, "02", estado, regimen, "INSCRITO".equalsIgnoreCase(estado), actividades);
    }

    @SuppressWarnings("unchecked")
    private static List<Object> difs(FiscalVerificacionAuto.Resultado r) {
        return (List<Object>) FiscalVerificacionAuto.leerDetalle(r.detalle()).get("diferencias");
    }

    private FiscalVerificacionAuto.Resultado comprobar(ContribuyenteDTO respuesta, SituacionFiscal declarada, String nombre, String actividad) {
        org.mockito.Mockito.doReturn(respuesta).when(hacienda).consultar(anyString());
        return auto.comprobar(CEDULA, declarada, nombre, actividad);
    }

    @Test
    @DisplayName("Coincide: cédula existe, inscrito, régimen, nombre (sin tildes ni sufijos) y actividad")
    void coincide() {
        var r = comprobar(dto("TIENDA LA ESPERANZA SOCIEDAD ANONIMA", "INSCRITO", "Régimen General",
                List.of("477101 Venta al por menor de prendas de vestir")),
            SituacionFiscal.INSCRITO, "Tienda La Esperanza S.A.", "Venta de prendas de vestir");
        assertThat(r.estado()).isEqualTo("COINCIDE");
        Map<String, Object> d = FiscalVerificacionAuto.leerDetalle(r.detalle());
        assertThat((List<?>) d.get("diferencias")).isEmpty();
        assertThat(d.get("nombre")).isEqualTo("TIENDA LA ESPERANZA SOCIEDAD ANONIMA");
    }

    @Test
    @DisplayName("Persona física: el nombre en otro orden y con tildes coincide")
    void nombreOtroOrden() {
        var r = comprobar(dto("PEREZ GOMEZ JOSÉ", "INSCRITO", "Régimen General", List.of()),
            SituacionFiscal.INSCRITO, "José Pérez Gómez", "Ventas");
        assertThat(r.estado()).isEqualTo("COINCIDE");
    }

    @Test
    @DisplayName("Régimen distinto: declara Simplificado y Hacienda dice General")
    void regimenDistinto() {
        var r = comprobar(dto("MARIA ROJAS", "INSCRITO", "Régimen General", List.of()),
            SituacionFiscal.REGIMEN_SIMPLIFICADO, "María Rojas", "Ventas");
        assertThat(r.estado()).isEqualTo("NO_COINCIDE");
        assertThat(difs(r)).containsExactly("regimen");
    }

    @Test
    @DisplayName("Régimen Simplificado declarado y confirmado coincide")
    void simplificadoCoincide() {
        var r = comprobar(dto("MARIA ROJAS", "INSCRITO", "Régimen de Tributación Simplificada", List.of()),
            SituacionFiscal.REGIMEN_SIMPLIFICADO, "María Rojas", "Ventas");
        assertThat(r.estado()).isEqualTo("COINCIDE");
    }

    @Test
    @DisplayName("Nombre distinto")
    void nombreDistinto() {
        var r = comprobar(dto("INVERSIONES DEL SUR", "INSCRITO", "Régimen General", List.of()),
            SituacionFiscal.INSCRITO, "Tienda La Esperanza", "Ventas");
        assertThat(r.estado()).isEqualTo("NO_COINCIDE");
        assertThat(difs(r)).containsExactly("nombre");
    }

    @Test
    @DisplayName("Contribuyente no activo (desinscrito) no coincide")
    void noActivo() {
        var r = comprobar(dto("MARIA ROJAS", "DESINSCRITO", "Régimen General", List.of()),
            SituacionFiscal.INSCRITO, "María Rojas", "Ventas");
        assertThat(r.estado()).isEqualTo("NO_COINCIDE");
        assertThat(difs(r)).contains("situacion");
    }

    @Test
    @DisplayName("Actividad declarada que no está entre las de Hacienda no coincide; el código sí vale")
    void actividad() {
        var base = dto("MARIA ROJAS", "INSCRITO", "Régimen General", List.of("477101 Venta de ropa"));
        var mal = comprobar(base, SituacionFiscal.INSCRITO, "María Rojas", "Taller mecánico");
        assertThat(difs(mal)).containsExactly("actividad");
        var codigo = comprobar(base, SituacionFiscal.INSCRITO, "María Rojas", "477101");
        assertThat(codigo.estado()).isEqualTo("COINCIDE");
    }

    @Test
    @DisplayName("No encontrado")
    void noEncontrado() {
        var r = comprobar(new ContribuyenteDTO(CEDULA, null, null, "NO_ENCONTRADO", null, false),
            SituacionFiscal.INSCRITO, "Ana", "Ventas");
        assertThat(r.estado()).isEqualTo("NO_ENCONTRADO");
    }

    @Test
    @DisplayName("Error de la API: excepción o fallback del circuit breaker dan ERROR_CONSULTA, sin lanzar")
    void errorDeApi() {
        when(hacienda.consultar(anyString())).thenThrow(new IllegalStateException("timeout"));
        assertThat(auto.comprobar(CEDULA, SituacionFiscal.INSCRITO, "Ana", "Ventas").estado()).isEqualTo("ERROR_CONSULTA");
        var r = comprobar(new ContribuyenteDTO(CEDULA, null, null, "SERVICIO_NO_DISPONIBLE", null, false),
            SituacionFiscal.INSCRITO, "Ana", "Ventas");
        assertThat(r.estado()).isEqualTo("ERROR_CONSULTA");
        assertThat(r.detalle()).doesNotContain(CEDULA);
    }

    @Test
    @DisplayName("El detalle no lleva la cédula y cabe en la columna")
    void detalleAcotado() {
        var muchas = java.util.stream.IntStream.range(0, 10).mapToObj(i -> "47710" + i + " " + "x".repeat(300)).toList();
        var r = comprobar(dto("N".repeat(500), "INSCRITO", "Régimen General", muchas), SituacionFiscal.INSCRITO, "Ana", "Ventas");
        assertThat(r.detalle().length()).isLessThanOrEqualTo(2000);
        assertThat(r.detalle()).doesNotContain(CEDULA);
    }
}
