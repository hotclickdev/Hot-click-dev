package com.hotclick.service.fiscal.facturanegocio;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaNegocio;
import com.hotclick.model.Pedido;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.repository.PedidoRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AggregatorService;
import com.hotclick.service.AggregatorService.DetalleComision;
import com.hotclick.service.AggregatorService.Liquidacion;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.TelegramNotificacionClienteService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.fiscal.facturanegocio.FacturaNegocioCalculo.Periodo;
import com.hotclick.service.onvo.cuenta.EnlacePagoOnvoLotes;
import com.hotclick.service.wallet.AggregatorCommissionMath;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@DisplayName("Fase 2: monto, generación idempotente, VENCIDA, job, evento y ADMIN")
class FacturaNegocioGeneracionTest {

    static final Periodo P = new Periodo(LocalDate.of(2026, 3, 1), LocalDate.of(2026, 3, 15));

    private PedidoRepository pedidos;
    private AggregatorService aggregator;
    private FacturaNegocioRepository repo;
    private EmpresaRepository empresas;
    private ConfiguracionFiscalService config;

    @BeforeEach
    void setUp() {
        pedidos = mock(PedidoRepository.class);
        aggregator = mock(AggregatorService.class);
        repo = mock(FacturaNegocioRepository.class);
        empresas = mock(EmpresaRepository.class);
        config = mock(ConfiguracionFiscalService.class);
        when(config.reglas()).thenReturn(ConfiguracionFiscalService.DEFAULTS);
        when(config.reglasFactura()).thenReturn(ConfiguracionFiscalService.FACTURA_DEFAULTS);
    }

    /** Un pedido de ₡11.000 con ₡1.000 de envío y 9 % de comisión sobre los productos (₡900). */
    private void unPedido() {
        Pedido p = new Pedido();
        p.setTotalPedido(11_000);
        p.setCostoEnvio(1_000);
        when(pedidos.pedidosParaFacturaNegocio(eq(5L), any(), any(), any(), any())).thenReturn(List.of(p));
        var r = new AggregatorCommissionMath.Resultado(700, 200, 9_100, 900);
        when(aggregator.liquidarPedido(p)).thenReturn(new Liquidacion(1_000, new DetalleComision("EMPRENDEDOR",
            new BigDecimal("9"), 0, r), 10_100));
        when(pedidos.productosParaFacturaNegocio(eq(5L), any(), any(), any(), any())).thenReturn(List.<Object[]>of(
            new Object[]{1L, "Camisa", "4321150100101", 2L, 6_000L},
            new Object[]{2L, "Gorra", null, 1L, 4_000L}));
    }

    private FacturaNegocioMontoService montoService() {
        return new FacturaNegocioMontoService(pedidos, new FacturaNegocioLiquidacionLotes(aggregator));
    }

    @Test
    @DisplayName("Monto NETO = productos - comisión (el envío no entra); BRUTO = productos; desglose suma el monto")
    void montoNetoYBruto() {
        unPedido();
        var neto = montoService().calcular(5L, P, "NETO");
        assertThat(neto.productos()).isEqualTo(10_000);
        assertThat(neto.comision()).isEqualTo(900);
        assertThat(neto.monto()).isEqualTo(9_100);
        assertThat(neto.desglose()).hasSize(2);
        assertThat(neto.desglose().stream().mapToLong(FacturaNegocioCalculo.LineaDesglose::monto).sum()).isEqualTo(9_100);
        assertThat(neto.desglose().get(0).cabys()).isEqualTo("4321150100101");
        var bruto = montoService().calcular(5L, P, "BRUTO");
        assertThat(bruto.monto()).isEqualTo(10_000);
    }

    private Empresa empresa(String situacion, boolean verificado) {
        Empresa e = new Empresa();
        e.setId(5L);
        e.setSituacionFiscal(situacion);
        e.setFiscalVerificado(verificado);
        when(empresas.findById(5L)).thenReturn(Optional.of(e));
        return e;
    }

    private FacturaNegocioGeneradorUno generador() {
        return new FacturaNegocioGeneradorUno(repo, empresas, montoService(), config, new ObjectMapper());
    }

    private FacturaNegocio generadaCon(String situacion, boolean verificado) {
        unPedido();
        empresa(situacion, verificado);
        when(repo.findByEmpresaIdAndPeriodoDesdeAndPeriodoHasta(5L, P.desde(), P.hasta())).thenReturn(Optional.empty());
        assertThat(generador().generar(5L, P)).isTrue();
        ArgumentCaptor<FacturaNegocio> cap = ArgumentCaptor.forClass(FacturaNegocio.class);
        verify(repo).save(cap.capture());
        return cap.getValue();
    }

    @Test
    @DisplayName("INSCRITO verificado: PENDIENTE con monto, plazo de 7 días y desglose")
    void inscritoVerificadoPendiente() {
        FacturaNegocio f = generadaCon("INSCRITO", true);
        assertThat(f.getEstado()).isEqualTo(FacturaNegocio.PENDIENTE);
        assertThat(f.getMontoCrc()).isEqualTo(9_100);
        assertThat(f.getFechaLimite()).isEqualTo(LocalDate.of(2026, 3, 22));
        assertThat(f.getDesgloseJson()).contains("Camisa").contains("4321150100101");
    }

    @Test
    @DisplayName("NO_APLICA: sin declarar, NO_INSCRITO, Régimen Simplificado e inscrito sin verificar")
    void noAplica() {
        assertThat(generadaCon(null, false).getEstado()).isEqualTo(FacturaNegocio.NO_APLICA);
        reset(repo);
        assertThat(generadaCon("NO_INSCRITO", false).getEstado()).isEqualTo(FacturaNegocio.NO_APLICA);
        reset(repo);
        assertThat(generadaCon("REGIMEN_SIMPLIFICADO", true).getEstado()).isEqualTo(FacturaNegocio.NO_APLICA);
        reset(repo);
        assertThat(generadaCon("INSCRITO", false).getEstado()).isEqualTo(FacturaNegocio.NO_APLICA);
    }

    @Test
    @DisplayName("Idempotente: si ya existe la de esa quincena no crea otra ni recalcula")
    void idempotente() {
        when(repo.findByEmpresaIdAndPeriodoDesdeAndPeriodoHasta(5L, P.desde(), P.hasta()))
            .thenReturn(Optional.of(new FacturaNegocio()));
        assertThat(generador().generar(5L, P)).isFalse();
        verify(repo, never()).save(any());
        verifyNoInteractions(pedidos, aggregator);
    }

    @Test
    @DisplayName("Sin ventas de productos en la quincena: no crea nada")
    void sinVentas() {
        empresa("INSCRITO", true);
        when(repo.findByEmpresaIdAndPeriodoDesdeAndPeriodoHasta(any(), any(), any())).thenReturn(Optional.empty());
        assertThat(generador().generar(5L, P)).isFalse();
        verify(repo, never()).save(any());
    }

    @Test
    @DisplayName("Lote: un choque del índice único (otra instancia ya la creó) no corta el resto")
    void loteSigue() {
        FacturaNegocioGeneradorUno uno = mock(FacturaNegocioGeneradorUno.class);
        when(uno.generar(1L, P)).thenThrow(new DataIntegrityViolationException("dup"));
        when(uno.generar(2L, P)).thenReturn(true);
        when(uno.generar(3L, P)).thenReturn(false);
        assertThat(new FacturaNegocioGeneracionLotes(uno).generar(List.of(1L, 2L, 3L), P)).isEqualTo(1);
    }

    @Test
    @DisplayName("Generar busca negocios con ventas sin la empresa plataforma; vencer marca VENCIDA con un UPDATE")
    void generarYVencer() {
        when(pedidos.empresasConVentasParaFacturaNegocio(any(), any(), any(), eq(Constants.EMPRESA_PLATAFORMA_ID), any()))
            .thenReturn(List.of(5L));
        FacturaNegocioGeneracionLotes lotes = mock(FacturaNegocioGeneracionLotes.class);
        when(lotes.generar(List.of(5L), P)).thenReturn(1);
        var g = new FacturaNegocioGeneracionService(pedidos, repo, lotes);
        assertThat(g.generar(P).get("creadas")).isEqualTo(1);
        when(repo.marcarVencidas(eq(LocalDate.of(2026, 3, 23)), any())).thenReturn(4);
        assertThat(g.vencer(LocalDate.of(2026, 3, 23))).isEqualTo(4);
    }

    @Test
    @DisplayName("Job: el 16 genera la quincena del 1 al 15 y marca las vencidas")
    void job() {
        FacturaNegocioGeneracionService g = mock(FacturaNegocioGeneracionService.class);
        when(g.generar(any())).thenReturn(java.util.Map.of("desde", P.desde(), "hasta", P.hasta(), "creadas", 0));
        Clock reloj = Clock.fixed(LocalDate.of(2026, 3, 16).atTime(6, 30).toInstant(ZoneOffset.UTC), Constants.ZONA_CR);
        new FacturaNegocioJob(g, reloj).ejecutar();
        verify(g).generar(P);
        verify(g).vencer(LocalDate.of(2026, 3, 16));
    }

    @Test
    @DisplayName("Evento: al aceptarse, cancela los enlaces de cobro abiertos; un fallo de ONVO no se propaga")
    void listener() {
        EnlacePagoOnvoLotes enlaces = mock(EnlacePagoOnvoLotes.class);
        var l = new FacturaNegocioEnlacePagoListener(enlaces);
        l.alRecibir(new FacturaNegocioRecibidaEvent(5L));
        verify(enlaces).alRecibirFactura(5L);
        when(enlaces.alRecibirFactura(6L)).thenThrow(new RuntimeException("onvo"));
        l.alRecibir(new FacturaNegocioRecibidaEvent(6L));
        l.alRecibir(null);
        verify(enlaces, times(2)).alRecibirFactura(anyLong());
    }

    // ── ADMIN ───────────────────────────────────────────────────────────────────────────────────────────────

    private FacturaNegocioAdminService admin(CompanyScope scope, RateLimiter rate, TelegramNotificacionClienteService tg) {
        return new FacturaNegocioAdminService(repo, empresas, scope, mock(FacturaNegocioGeneracionService.class), tg, rate,
            config, mock(AuditoriaAdminRegistroService.class));
    }

    @Test
    @DisplayName("ADMIN impersonando o un no ADMIN: 403 en todas las acciones")
    void adminExigido() {
        CompanyScope imp = mock(CompanyScope.class);
        when(imp.isAdminIT()).thenReturn(true);
        when(imp.isImpersonating()).thenReturn(true);
        var s = admin(imp, mock(RateLimiter.class), mock(TelegramNotificacionClienteService.class));
        assertThatThrownBy(() -> s.listar(null, null, 0, 10)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> s.detalle(1L)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> s.marcarRevisada(1L)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> s.recordar(1L)).isInstanceOf(TenantAccessDeniedException.class);
        assertThatThrownBy(() -> s.generar(null)).isInstanceOf(TenantAccessDeniedException.class);
        CompanyScope vendedor = mock(CompanyScope.class);
        var s2 = admin(vendedor, mock(RateLimiter.class), mock(TelegramNotificacionClienteService.class));
        assertThatThrownBy(() -> s2.detalle(1L)).isInstanceOf(TenantAccessDeniedException.class);
        verifyNoInteractions(repo);
    }

    @Test
    @DisplayName("Recordar: suma el contador y avisa por Telegram; no recuerda lo ya aceptado")
    void recordar() {
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.isAdminIT()).thenReturn(true);
        RateLimiter rate = mock(RateLimiter.class);
        when(rate.tryAcquireEstricto(anyString(), anyInt(), anyInt())).thenReturn(true);
        TelegramNotificacionClienteService tg = mock(TelegramNotificacionClienteService.class);
        FacturaNegocio f = new FacturaNegocio();
        f.setEmpresaId(5L);
        f.setEstado(FacturaNegocio.PENDIENTE);
        f.setFechaLimite(LocalDate.now(Constants.ZONA_CR).plusDays(3));
        f.setPeriodoDesde(P.desde());
        f.setPeriodoHasta(P.hasta());
        when(repo.findById(1L)).thenReturn(Optional.of(f));
        when(empresas.findById(5L)).thenReturn(Optional.empty());
        var s = admin(scope, rate, tg);
        s.recordar(1L);
        assertThat(f.getRecordatorios()).isEqualTo(1);
        verify(tg).notificarRecordatorioFacturaHotclick(5L, 3L);
        f.setEstado(FacturaNegocio.ACEPTADA);
        assertThatThrownBy(() -> s.recordar(1L)).isInstanceOf(IllegalStateException.class);
        s.marcarRevisada(1L);
        assertThat(f.isRevisada()).isTrue();
        assertThatThrownBy(() -> s.listar("RARO", null, 0, 10)).isInstanceOf(IllegalArgumentException.class);
    }
}
