package com.hotclick.service.contador;

import com.hotclick.service.contador.ComprasFiscalesProvider.ResumenCompras;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.*;

@DisplayName("Contador IA: Este mes y borradores con datos de prueba")
class ContadorFiscalServiceTest {

    private ConfiguracionFiscalService config;
    private ContadorParametrosService parametros;
    private VentasFiscalesService ventas;
    private ComprasFiscalesProvider compras;
    private ContadorFiscalService svc;
    private final Map<String, String> par = new LinkedHashMap<>();

    @BeforeEach
    void setUp() {
        config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        ContadorAjustesService ajustes = mock(ContadorAjustesService.class);
        when(ajustes.ajustes()).thenReturn(ContadorAjustesService.DEFAULTS);
        // Valores por defecto reales (sin filas guardadas): los factores del RTS quedan vacíos.
        par.putAll(new ContadorParametrosService(mock(JdbcTemplate.class)).todos());
        parametros = mock(ContadorParametrosService.class);
        when(parametros.todos()).thenAnswer(i -> new LinkedHashMap<>(par));
        ventas = mock(VentasFiscalesService.class);
        when(ventas.delAnio(anyInt())).thenReturn(List.of(new VentasFiscalesService.VentasMes(10, 2_000_000, 260_000, 4)));
        when(ventas.mes(anyInt(), anyInt())).thenReturn(new VentasFiscalesService.VentasMes(10, 2_000_000, 260_000, 4));
        compras = mock(ComprasFiscalesProvider.class);
        ResumenCompras[] anio = new ResumenCompras[12];
        java.util.Arrays.fill(anio, ResumenCompras.SIN_DATOS);
        anio[6] = new ResumenCompras(1_000_000, 0, 115_000, true);   // julio
        anio[7] = new ResumenCompras(500_000, 500_000, 57_500, true); // agosto
        anio[9] = new ResumenCompras(800_000, 200_000, 92_000, true); // octubre
        when(compras.anio(2026)).thenReturn(anio);
        when(compras.mes(YearMonth.of(2026, 10))).thenReturn(anio[9]);
        RecargosCobradosProvider recargos = mock(RecargosCobradosProvider.class);
        when(recargos.cobradoEnMes(org.mockito.ArgumentMatchers.any())).thenReturn(OptionalLong.empty());
        svc = new ContadorFiscalService(config, ajustes, parametros, ventas, compras, recargos);
    }

    @Test
    @DisplayName("RTS sin factor: muestra «Configurá el factor (Decreto 25514-H)» y no calcula cuota")
    void factorVacio() {
        Map<String, Object> m = svc.esteMes(LocalDate.of(2026, 11, 10));
        @SuppressWarnings("unchecked") Map<String, Object> rts = (Map<String, Object>) m.get("rts");
        @SuppressWarnings("unchecked") Map<String, Object> tri = (Map<String, Object>) rts.get("trimestreADeclarar");
        assertThat(tri.get("trimestre")).isEqualTo(3);
        assertThat(tri.get("compras")).isEqualTo(2_000_000L);
        assertThat(tri.get("cuotaTotal")).isNull();
        assertThat(tri.get("mensaje")).isEqualTo("Configurá el factor (Decreto 25514-H)");
        assertThat(m.get("avisoLegal")).isEqualTo(ContadorTextos.AVISO_LEGAL);
    }

    @Test
    @DisplayName("RTS con factores configurados: cuota = compras del trimestre por cada factor")
    @SuppressWarnings("unchecked")
    void factorConfigurado() {
        par.put(ContadorParametrosService.RTS_FACTOR_IVA_4719, "0.02");
        par.put(ContadorParametrosService.RTS_FACTOR_RENTA_4719, "0.01");
        Map<String, Object> m = svc.borradorRts(LocalDate.of(2026, 11, 10), 2026, 3);
        @SuppressWarnings("unchecked") List<Map<String, Object>> cajas = (List<Map<String, Object>>) m.get("cajas");
        assertThat(cajas).extracting(c -> c.get("valor")).containsExactly(2_000_000L, 40_000L, 20_000L, 60_000L);
        assertThat(m.get("mensaje")).isNull();
        assertThat((List<Object>) m.get("avisos")).contains(ContadorTextos.AVISO_BORRADOR);
    }

    @Test
    @DisplayName("Tope del RTS: progreso de las compras del año contra 186 salarios base")
    void topeRts() {
        Map<String, Object> m = svc.esteMes(LocalDate.of(2026, 11, 10));
        @SuppressWarnings("unchecked") Map<String, Object> rts = (Map<String, Object>) m.get("rts");
        @SuppressWarnings("unchecked") Map<String, Object> p = (Map<String, Object>) rts.get("progresoTope");
        assertThat(p.get("valor")).isEqualTo(3_000_000L);
        assertThat(p.get("tope")).isEqualTo(85_969_200L);
    }

    @Test
    @DisplayName("Tradicional: borrador del 150 con totales y la nota de casilla a confirmar, sin números de casilla")
    void borrador150() {
        when(config.reglas()).thenReturn(new ConfiguracionFiscalService.Reglas("TRADICIONAL", new BigDecimal("14.00"), 7, 20_000, 0));
        Map<String, Object> m = svc.borradorIva(LocalDate.of(2026, 11, 10), 2026, 10);
        @SuppressWarnings("unchecked") List<Map<String, Object>> cajas = (List<Map<String, Object>>) m.get("cajas");
        Map<String, Object> pagar = cajas.stream().filter(c -> c.get("id").equals("iva_a_pagar")).findFirst().orElseThrow();
        assertThat(pagar.get("valor")).isEqualTo(260_000L - 92_000L);
        assertThat(cajas).allSatisfy(c -> assertThat(c.get("nota")).isEqualTo(ContadorFiscalService.CASILLA));
        Map<String, Object> mes = svc.esteMes(LocalDate.of(2026, 11, 10));
        assertThat(mes).containsKey("iva").doesNotContainKey("rts");
    }

    @Test
    @DisplayName("Renta: progreso de ingresos brutos al umbral de ₡119.174.000 y tramos legibles")
    void renta() {
        Map<String, Object> m = svc.esteMes(LocalDate.of(2026, 11, 10));
        @SuppressWarnings("unchecked") Map<String, Object> r = (Map<String, Object>) m.get("renta");
        assertThat(r.get("umbral")).isEqualTo(119_174_000L);
        assertThat(r.get("ingresosBrutosAnio")).isEqualTo(2_000_000L);
        assertThat(r.get("tipoPersona")).isEqualTo("JURIDICA");
        assertThat(r.get("periodoFiscal")).isEqualTo("OCT_SEP");
        assertThat((List<?>) r.get("tramosDetalle")).hasSize(4);
        assertThat(r.get("superaUmbral")).isEqualTo(false);
    }

    @Test
    @DisplayName("Período fuera de rango: no se arma borrador")
    void periodoInvalido() {
        assertThatThrownBy(() -> svc.borradorIva(LocalDate.of(2026, 11, 10), 2030, 1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> svc.borradorRts(LocalDate.of(2026, 11, 10), 2026, 5)).isInstanceOf(IllegalArgumentException.class);
    }
}
