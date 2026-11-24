package com.hotclick.agente.lead;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.security.CompanyScope;
import com.hotclick.service.TotpSecretEncryptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@DisplayName("AG-27: leads, aislamiento entre empresas y datos personales")
class LeadServiceTest {

    private static final String TEL = "50670001234";   // número ficticio

    private LeadRepository repo;
    private TotpSecretEncryptionService cripto;
    private LeadService service;

    @BeforeEach
    void init() {
        repo = mock(LeadRepository.class);
        cripto = mock(TotpSecretEncryptionService.class);
        when(cripto.encryptContactoLead(any())).thenAnswer(i -> "ENC:" + i.getArgument(0));
        when(cripto.decryptContactoLead(any())).thenAnswer(i -> ((String) i.getArgument(0)).substring(4));
        service = new LeadService(repo, cripto);
        when(repo.buscarReciente(any(), any(), any(), any())).thenReturn(Optional.empty());
        when(repo.insertar(any(), any(), any(), any(), any(), any(), any(), any(), any(), any())).thenReturn(5L);
    }

    private static LeadRepository.Fila fila(Long empresa, String cifrado) {
        return new LeadRepository.Fila(5L, TipoLead.COMPRADOR, empresa, "WHATSAPP", "1234", cifrado, "Ana", null,
            "bolso", EstadoLead.NUEVO, null, LocalDateTime.now());
    }

    @Test
    @DisplayName("El contacto nunca se guarda en claro: hash, últimos 4 y cifrado")
    void contactoNoEnClaro() {
        service.registrar(TipoLead.COMPRADOR, 7L, TEL, "whatsapp", null, "Ana", null, "bolso");

        ArgumentCaptor<String> hash = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> ult4 = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> cif = ArgumentCaptor.forClass(String.class);
        verify(repo).insertar(eq(TipoLead.COMPRADOR), eq(7L), eq("WHATSAPP"), hash.capture(), ult4.capture(),
            cif.capture(), eq("Ana"), isNull(), eq("bolso"), isNull());
        assertThat(hash.getValue()).hasSize(64).doesNotContain(TEL);
        assertThat(ult4.getValue()).isEqualTo("1234");
        assertThat(cif.getValue()).startsWith("ENC:");
    }

    @Test
    @DisplayName("Insistir con el mismo contacto en el mismo alcance actualiza, no duplica")
    void sinDuplicados() {
        when(repo.buscarReciente(any(), any(), any(), any())).thenReturn(Optional.of(9L));

        LeadService.Registro r = service.registrar(TipoLead.NEGOCIO, null, TEL, "WHATSAPP", null, "Café", "cafetería", null);

        assertThat(r.nuevo()).isFalse();
        assertThat(r.id()).isEqualTo(9L);
        verify(repo).actualizarInteres(eq(9L), eq("Café"), eq("cafetería"), isNull());
        verify(repo, never()).insertar(any(), any(), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("El mismo contacto en dos empresas produce el mismo hash pero se busca por alcance")
    void duplicadoPorAlcance() {
        service.registrar(TipoLead.COMPRADOR, 1L, TEL, "WHATSAPP", null, null, null, "a");
        service.registrar(TipoLead.COMPRADOR, 2L, TEL, "WHATSAPP", null, null, null, "a");
        verify(repo).buscarReciente(eq(TipoLead.COMPRADOR), eq(1L), any(), any());
        verify(repo).buscarReciente(eq(TipoLead.COMPRADOR), eq(2L), any(), any());
    }

    @Test
    @DisplayName("Sin contacto no se registra")
    void sinContacto() {
        assertThatThrownBy(() -> service.registrar(TipoLead.COMPRADOR, 1L, " ", "WHATSAPP", null, null, null, "x"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("Texto del modelo: se limpia y se recorta")
    void limpiaTexto() {
        assertThat(LeadService.limpiar("hola\nmundo", 120)).isEqualTo("hola mundo");
        assertThat(LeadService.limpiar("x".repeat(900), LeadService.INTERES_MAX)).hasSize(500);
        assertThat(LeadService.limpiar("   ", 10)).isNull();
    }

    @Test
    @DisplayName("Aislamiento: un lead de otra empresa es 404; el detalle consulta con el alcance del llamador")
    void aislamientoDetalle() {
        when(repo.obtener(5L, 2L)).thenReturn(Optional.empty());       // pertenece a la empresa 1
        when(repo.obtener(5L, 1L)).thenReturn(Optional.of(fila(1L, "ENC:" + TEL)));

        assertThatThrownBy(() -> service.detalle(5L, 2L)).isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> service.detalle(5L, null)).isInstanceOf(RecursoNoEncontradoException.class);
        LeadDto propio = service.detalle(5L, 1L);
        assertThat(propio.contacto()).isEqualTo(TEL);
        assertThat(propio.contactoEnmascarado()).isEqualTo("****1234");
    }

    @Test
    @DisplayName("El listado va con el alcance indicado y trae solo el contacto enmascarado")
    void listadoEnmascarado() {
        when(repo.listar(eq(1L), any(), any(), anyInt(), anyInt())).thenReturn(List.of(fila(1L, "ENC:" + TEL)));

        List<LeadDto> r = service.listar(1L, null, null, 0, 20);

        assertThat(r).hasSize(1);
        assertThat(r.get(0).contacto()).isNull();
        assertThat(r.get(0).contactoEnmascarado()).isEqualTo("****1234");
        verify(repo, never()).listar(eq(2L), any(), any(), anyInt(), anyInt());
        verify(repo, never()).obtener(anyLong(), eq(2L));
    }

    @Test
    @DisplayName("Controller: el alcance sale de CompanyScope (ADMIN = HotClick), no de un parámetro")
    void controllerUsaCompanyScope() {
        CompanyScope scope = mock(CompanyScope.class);
        LeadService svc = mock(LeadService.class);
        LeadController c = new LeadController(svc, scope);
        when(scope.requireEmpresaIdOrAdmin()).thenReturn(null);   // ADMIN sin impersonar

        c.listar(TipoLead.NEGOCIO, null, 0, 20);
        c.detalle(3L);

        verify(svc).listar(isNull(), eq(TipoLead.NEGOCIO), isNull(), eq(0), eq(20));
        verify(svc).detalle(3L, null);
    }

    @Test
    @DisplayName("Retención: 6 meses compradores, 12 meses negocios")
    void retencion() {
        assertThat(TipoLead.COMPRADOR.retencionDias()).isEqualTo(180);
        assertThat(TipoLead.NEGOCIO.retencionDias()).isEqualTo(365);
    }
}
