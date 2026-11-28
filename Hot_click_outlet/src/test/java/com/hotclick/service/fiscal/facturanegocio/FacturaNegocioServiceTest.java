package com.hotclick.service.fiscal.facturanegocio;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.model.Empresa;
import com.hotclick.model.FacturaNegocio;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.FacturaNegocioRepository;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.RateLimiter;
import com.hotclick.service.AuditoriaAdminRegistroService;
import com.hotclick.service.SupabaseStorageService;
import com.hotclick.service.fiscal.ConfiguracionFiscalService;
import com.hotclick.service.hacienda.XmlFacturaSchemaValidator;
import com.hotclick.utils.Constants;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Fase 2: subir el XML (servicio real con el validador real; base y almacenamiento simulados). */
@DisplayName("Fase 2: recepción de la factura del negocio (servicio)")
class FacturaNegocioServiceTest {

    static final long EMPRESA = 50L;

    private FacturaNegocioRepository repo;
    private EmpresaRepository empresas;
    private RateLimiter rate;
    private ConfiguracionFiscalService config;
    private SupabaseStorageService storage;
    private FacturaNegocioService svc;
    private FacturaNegocio factura;
    private Empresa negocio;

    @BeforeEach
    void setUp() {
        repo = mock(FacturaNegocioRepository.class);
        empresas = mock(EmpresaRepository.class);
        rate = mock(RateLimiter.class);
        config = mock(ConfiguracionFiscalService.class);
        storage = mock(SupabaseStorageService.class);
        svc = new FacturaNegocioService(repo, empresas, mock(CompanyScope.class), rate,
            new FacturaNegocioXmlValidador(new XmlFacturaSchemaValidator()), mock(FacturaNegocioMontoService.class),
            config, storage, mock(AuditoriaAdminRegistroService.class));
        negocio = new Empresa();
        negocio.setId(EMPRESA);
        negocio.setSituacionFiscal("INSCRITO");
        negocio.setCedulaFiscal(FacturaNegocioXmlValidadorTest.CED_NEGOCIO);
        negocio.setFiscalVerificado(true);
        Empresa hotclick = new Empresa();
        hotclick.setId(Constants.EMPRESA_PLATAFORMA_ID);
        hotclick.setCedulaJuridica(FacturaNegocioXmlValidadorTest.CED_HOTCLICK);
        when(empresas.findById(EMPRESA)).thenReturn(Optional.of(negocio));
        when(empresas.findById(Constants.EMPRESA_PLATAFORMA_ID)).thenReturn(Optional.of(hotclick));
        factura = new FacturaNegocio();
        factura.setEmpresaId(EMPRESA);
        factura.setEstado(FacturaNegocio.PENDIENTE);
        factura.setMontoCrc(FacturaNegocioXmlValidadorTest.MONTO);
        factura.setCedulaFiscalEsperada(FacturaNegocioXmlValidadorTest.CED_NEGOCIO);
        factura.setPeriodoDesde(LocalDate.of(2026, 3, 1));
        factura.setPeriodoHasta(LocalDate.of(2026, 3, 15));
        factura.setFechaLimite(LocalDate.of(2026, 3, 22));
        when(repo.findByIdAndEmpresaId(7L, EMPRESA)).thenReturn(Optional.of(factura));
        when(repo.saveAndFlush(any())).thenAnswer(i -> i.getArgument(0));
        when(rate.tryAcquireEstricto(anyString(), anyInt(), anyInt())).thenReturn(true);
        when(storage.subirXmlPrivado(any(), anyString())).thenAnswer(i -> "privado/" + i.getArgument(1));
        when(config.reglas()).thenReturn(new ConfiguracionFiscalService.Reglas("SIMPLIFICADO", new BigDecimal("14.00"), 7, 20_000, 0));
        when(config.reglasFactura()).thenReturn(new ConfiguracionFiscalService.ReglasFactura(false, 1, "NETO"));
    }

    private static byte[] respuestaAceptada() {
        return FacturaNegocioCalculoTest.mh(FacturaNegocioXmlValidadorTest.CLAVE, "1");
    }

    @Test
    @DisplayName("Factura válida con respuesta de Hacienda: RECIBIDA (pendiente de revisión), guarda la clave y no acepta sola")
    void validaQuedaRecibida() {
        Map<String, Object> v = svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), respuestaAceptada());
        assertThat(v.get("estado")).isEqualTo(FacturaNegocio.RECIBIDA);
        assertThat(v.get("mensajeEstado")).isEqualTo("Recibida, pendiente de revisión de HotClick.");
        assertThat(factura.getClaveXml()).isEqualTo(FacturaNegocioXmlValidadorTest.CLAVE);
        assertThat(factura.getRespuestaHaciendaEstado()).isEqualTo("ACEPTADO");
        assertThat(factura.getXmlPath()).startsWith("privado/facturas-negocio/50/");
        assertThat(factura.getXmlRespuestaPath()).isNotNull();
        // El mensaje receptor se resuelve al aprobar, no al subir.
        assertThat(factura.getMensajeReceptorEstado()).isNull();
    }

    @Test
    @DisplayName("Firma autofirmada sin la cédula del emisor: RECHAZADA (no queda RECIBIDA ni ACEPTADA)")
    void certificadoAjenoRechazada() {
        byte[] xml = com.hotclick.service.hacienda.CertificadoDePrueba.firmar(FacturaNegocioXmlValidadorTest.xmlBase())
            .getBytes(StandardCharsets.UTF_8);
        Map<String, Object> v = svc.subirXml(EMPRESA, 7L, xml, respuestaAceptada());
        assertThat(v.get("estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat(factura.getClaveXml()).isNull();
    }

    @Test
    @DisplayName("Sin respuesta de Hacienda: RECIBIDA con aviso")
    void sinRespuestaAviso() {
        Map<String, Object> v = svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null);
        assertThat(v.get("estado")).isEqualTo(FacturaNegocio.RECIBIDA);
        assertThat(v.get("avisos").toString()).contains("respuesta de Hacienda");
    }

    @Test
    @DisplayName("Respuesta de Hacienda rechazada: RECHAZADA y sin clave")
    void respuestaRechazada() {
        Map<String, Object> v = svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(),
            FacturaNegocioCalculoTest.mh(FacturaNegocioXmlValidadorTest.CLAVE, "3"));
        assertThat(v.get("estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat(factura.getClaveXml()).isNull();
    }

    @Test
    @DisplayName("XML inválido: RECHAZADA con la lista de motivos")
    void rechazada() {
        Map<String, Object> v = svc.subirXml(EMPRESA, 7L, "<x/>".getBytes(StandardCharsets.UTF_8), null);
        assertThat(v.get("estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat((java.util.List<?>) v.get("errores")).isNotEmpty();
    }

    @Test
    @DisplayName("Emisor: se valida contra la foto de la cédula al generar, no contra la que el negocio cambió después")
    void cedulaFoto() {
        negocio.setCedulaFiscal("3101777777");
        assertThat(svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null).get("estado"))
            .isEqualTo(FacturaNegocio.RECIBIDA);
        factura.setEstado(FacturaNegocio.PENDIENTE);
        factura.setClaveXml(null);
        factura.setCedulaFiscalEsperada("3101777777");
        Map<String, Object> v = svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null);
        assertThat(v.get("estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat(v.get("errores").toString()).contains("emisor no coincide");
    }

    @Test
    @DisplayName("Si al subir ya no está inscrito y verificado: 409 sin validar ni guardar")
    void yaNoLeCorresponde() {
        negocio.setFiscalVerificado(false);
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("ya no está inscrito");
        negocio.setFiscalVerificado(true);
        negocio.setSituacionFiscal("REGIMEN_SIMPLIFICADO");
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(storage, rate);
    }

    @Test
    @DisplayName("Clave repetida en otra factura: RECHAZADA")
    void claveRepetida() {
        when(repo.existsByClaveXmlAndIdNot(eq(FacturaNegocioXmlValidadorTest.CLAVE), any())).thenReturn(true);
        Map<String, Object> v = svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null);
        assertThat(v.get("estado")).isEqualTo(FacturaNegocio.RECHAZADA);
        assertThat(v.get("errores").toString()).contains("ya se subió antes");
    }

    @Test
    @DisplayName("Carrera: la misma clave guardada a la vez (índice único) da 409 y borra los XML huérfanos")
    void carreraIndiceUnico() {
        when(repo.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq_factura_negocio_clave"));
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), respuestaAceptada()))
            .isInstanceOf(FacturaNegocioService.ConflictoFacturaException.class);
        verify(storage, times(2)).eliminarPrivado(anyString());
    }

    @Test
    @DisplayName("Carrera: dos subidas a la vez (versión) dan 409 y borran el XML huérfano")
    void carreraVersion() {
        when(repo.saveAndFlush(any())).thenThrow(new ObjectOptimisticLockingFailureException(FacturaNegocio.class, 7L));
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(FacturaNegocioService.ConflictoFacturaException.class);
        verify(storage).eliminarPrivado(anyString());
    }

    @Test
    @DisplayName("Registro de otro negocio: 404 (no existe para este) y no se toca nada")
    void otroNegocio404() {
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 99L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(RecursoNoEncontradoException.class);
        verifyNoInteractions(storage);
    }

    @Test
    @DisplayName("NO_APLICA, RECIBIDA (en revisión) y ACEPTADA no se pueden volver a subir")
    void estadosNoSubibles() {
        factura.setEstado(FacturaNegocio.NO_APLICA);
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("recargo del 14");
        factura.setEstado(FacturaNegocio.RECIBIDA);
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(IllegalStateException.class).hasMessageContaining("pendiente de revisión");
        factura.setEstado(FacturaNegocio.ACEPTADA);
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(IllegalStateException.class);
        verifyNoInteractions(storage);
    }

    @Test
    @DisplayName("Más de 10 subidas por día: 429 sin validar ni guardar")
    void limiteDiario() {
        when(rate.tryAcquireEstricto(eq("empresa:50:factura-negocio:xml"), eq(10), anyInt())).thenReturn(false);
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(FacturaNegocioService.LimiteSubidasException.class);
        verifyNoInteractions(storage);
    }

    @Test
    @DisplayName("Si el almacenamiento falla, no se escribe en la base")
    void almacenamientoFalla() {
        when(storage.subirXmlPrivado(any(), anyString())).thenThrow(new RuntimeException("s3"));
        assertThatThrownBy(() -> svc.subirXml(EMPRESA, 7L, FacturaNegocioXmlValidadorTest.valido(), null))
            .isInstanceOf(IllegalStateException.class);
        verify(repo, never()).saveAndFlush(any());
    }
}
