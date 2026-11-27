package com.hotclick.service.fiscal.fec;

import com.hotclick.controller.AdminFecController;
import com.hotclick.model.Empresa;
import com.hotclick.model.FecCompra;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FecCompraRepository;
import com.hotclick.service.ClaveNumericaService;
import com.hotclick.service.ConsecutivoFiscalService;
import com.hotclick.service.XmlFecBuilder;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService.Fec;
import com.hotclick.service.fiscal.ConfiguracionFiscalService.Reglas;
import com.hotclick.service.fiscal.fec.FecModelos.CompraEmpresa;
import com.hotclick.service.fiscal.fec.FecModelos.LineaCompra;
import com.hotclick.service.fiscal.fec.FecModelos.Reporte;
import com.hotclick.service.fiscal.fec.FecModelos.Resultado;
import com.hotclick.service.fiscal.fec.FecModelos.Vendedor;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@DisplayName("FEC por quincena: interruptor, NO_INSCRITO, idempotencia y autorización")
class FecServiceTest {

    private static final String CABYS = "4321150100101";
    private static final FecPeriodo PERIODO = new FecPeriodo(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 15));

    private ConfiguracionFiscalService config;
    private FecAgregacionService agregacion;
    private FecCompraRepository repo;
    private ConsecutivoFiscalService consecutivos;
    private FecService servicio;

    @BeforeEach
    void setUp() {
        config = mock(ConfiguracionFiscalService.class);
        agregacion = mock(FecAgregacionService.class);
        repo = mock(FecCompraRepository.class);
        consecutivos = mock(ConsecutivoFiscalService.class);
        EmpresaRepository empresas = mock(EmpresaRepository.class);
        Empresa plataforma = emisor();
        plataforma.setId(1L);
        when(empresas.findById(1L)).thenReturn(Optional.of(plataforma));
        when(empresas.getReferenceById(anyLong())).thenReturn(new Empresa());
        when(consecutivos.siguienteNumero(anyLong(), anyString())).thenReturn(1L);
        servicio = new FecService(config, agregacion, empresas, repo, consecutivos, new ClaveNumericaService(),
            new XmlFecBuilder(), CABYS);
    }

    private static Empresa emisor() {
        Empresa e = new Empresa();
        e.setNombreComercialFe("HOTCLICK");
        e.setActividadEconomica("722003");
        e.setTipoCedula("02");
        e.setCedulaJuridica("3101123456");
        e.setCorreoEmpresa("facturas@example.com");
        e.setUbicacionProvincia("1");
        e.setUbicacionCanton("01");
        e.setUbicacionDistrito("01");
        e.setUbicacionOtrasSenas("Dirección de prueba");
        return e;
    }

    private void activar(boolean tradicional, boolean fecOn, boolean noInscrito) {
        when(config.fecActiva()).thenReturn(tradicional && fecOn);
        when(config.fec()).thenReturn(new Fec(fecOn, noInscrito));
        when(config.reglas()).thenReturn(new Reglas(tradicional ? "TRADICIONAL" : "SIMPLIFICADO",
            new BigDecimal("14.00"), 7, 20000, 0));
    }

    private static CompraEmpresa compra(long empresaId, String situacion) {
        return new CompraEmpresa(new Vendedor(empresaId, situacion, "101230456", "Tienda", "471101", null),
            10000, 1000, 9000, List.of(new LineaCompra(CABYS, "Compra de mercancías", 9000)));
    }

    @Test
    @DisplayName("Régimen SIMPLIFICADO: no genera nada ni reserva consecutivos")
    void apagadaNoHaceNada() {
        activar(false, true, true);
        Reporte r = servicio.generar(PERIODO);
        assertThat(r.activa()).isFalse();
        assertThat(r.mensaje()).contains("FEC desactivada: régimen SIMPLIFICADO");
        assertThat(r.items()).isEmpty();
        verifyNoInteractions(agregacion, consecutivos);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("TRADICIONAL pero interruptor apagado: tampoco genera")
    void interruptorApagado() {
        activar(true, false, false);
        assertThat(servicio.generar(PERIODO).activa()).isFalse();
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Encendida: genera la FEC de un negocio simplificado con consecutivo tipo 08")
    void encendidaGenera() {
        activar(true, true, false);
        when(agregacion.compras(PERIODO)).thenReturn(List.of(compra(7L, "REGIMEN_SIMPLIFICADO")));
        Reporte r = servicio.generar(PERIODO);
        assertThat(r.items()).singleElement().satisfies(i -> assertThat(i.resultado()).isEqualTo(Resultado.GENERADA));
        verify(repo).save(org.mockito.ArgumentMatchers.argThat((FecCompra f) ->
            f.getNumeroConsecutivo().substring(8, 10).equals("08") && f.getMontoCompra() == 9000
                && f.getClaveNumerica().length() == 50 && f.getXml().contains("<FacturaElectronicaCompra")
                && FecCompra.GENERADA.equals(f.getEstado())));
    }

    @Test
    @DisplayName("NO_INSCRITO se omite por defecto y se genera con el interruptor")
    void noInscritoDenegadoPorDefecto() {
        when(agregacion.compras(PERIODO)).thenReturn(List.of(compra(8L, "NO_INSCRITO")));
        activar(true, true, false);
        Reporte negado = servicio.generar(PERIODO);
        assertThat(negado.items()).singleElement().satisfies(i -> assertThat(i.resultado()).isEqualTo(Resultado.OMITIDA));
        verify(repo, never()).save(any());

        activar(true, true, true);
        Reporte permitido = servicio.generar(PERIODO);
        assertThat(permitido.items()).singleElement()
            .satisfies(i -> assertThat(i.resultado()).isEqualTo(Resultado.GENERADA));
        verify(repo).save(org.mockito.ArgumentMatchers.argThat((FecCompra f) -> f.getXml().contains("<Tipo>06</Tipo>")));
    }

    @Test
    @DisplayName("Un negocio INSCRITO no recibe FEC")
    void inscritoNoRecibe() {
        activar(true, true, true);
        when(agregacion.compras(PERIODO)).thenReturn(List.of(compra(9L, "INSCRITO")));
        assertThat(servicio.generar(PERIODO).items().get(0).resultado()).isEqualTo(Resultado.OMITIDA);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Idempotencia: mismo negocio y periodo no se genera dos veces")
    void idempotente() {
        activar(true, true, false);
        when(agregacion.compras(PERIODO)).thenReturn(List.of(compra(7L, "REGIMEN_SIMPLIFICADO")));
        when(repo.existsByEmpresa_IdAndPeriodoDesdeAndPeriodoHasta(7L, PERIODO.desde(), PERIODO.hasta())).thenReturn(true);
        Reporte r = servicio.generar(PERIODO);
        assertThat(r.items().get(0).resultado()).isEqualTo(Resultado.YA_EXISTIA);
        verify(repo, never()).save(any());
        verifyNoInteractions(consecutivos);
    }

    @Test
    @DisplayName("Carrera: el índice único responde como YA_EXISTIA")
    void carreraIndiceUnico() {
        activar(true, true, false);
        when(agregacion.compras(PERIODO)).thenReturn(List.of(compra(7L, "REGIMEN_SIMPLIFICADO")));
        when(repo.save(any())).thenThrow(new org.springframework.dao.DataIntegrityViolationException("dup"));
        assertThat(servicio.generar(PERIODO).items().get(0).resultado()).isEqualTo(Resultado.YA_EXISTIA);
    }

    @Test
    @DisplayName("El job y el endpoint: ShedLock, solo ADMIN, y el job con FEC apagada no envía")
    void jobYEndpoint() throws Exception {
        Method job = FecJob.class.getMethod("programado");
        assertThat(job.getAnnotation(SchedulerLock.class)).isNotNull();
        int n = 0;
        for (Method m : AdminFecController.class.getDeclaredMethods()) {
            if (!java.lang.reflect.Modifier.isPublic(m.getModifiers())) continue;
            assertThat(m.getAnnotation(PreAuthorize.class).value()).isEqualTo("hasRole('ADMIN')");
            n++;
        }
        assertThat(n).isEqualTo(1);

        activar(false, true, true);
        FecEnvioService envio = mock(FecEnvioService.class);
        new FecJob(servicio, envio).ejecutar(LocalDate.of(2026, 12, 1));
        verifyNoInteractions(envio);
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Quincenas: la cerrada previa al 1 y al 16, y solo se aceptan quincenas completas ya cerradas")
    void periodos() {
        assertThat(FecPeriodo.anteriorA(LocalDate.of(2026, 12, 1)))
            .isEqualTo(new FecPeriodo(LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 30)));
        assertThat(FecPeriodo.anteriorA(LocalDate.of(2026, 11, 16)))
            .isEqualTo(new FecPeriodo(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 15)));
        LocalDate hoy = LocalDate.of(2026, 11, 27);
        assertThat(FecPeriodo.cerrada(LocalDate.of(2026, 11, 1), LocalDate.of(2026, 11, 15), hoy)).isNotNull();
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
            () -> FecPeriodo.cerrada(LocalDate.of(2026, 11, 16), LocalDate.of(2026, 11, 30), hoy));
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class,
            () -> FecPeriodo.cerrada(LocalDate.of(2026, 11, 2), LocalDate.of(2026, 11, 15), hoy));
    }
}
