package com.hotclick.service;

import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.exception.TenantAccessDeniedException;
import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmpresaPerfilService — marca pública de la tienda")
class EmpresaPerfilServiceTest {

    @Mock EmpresaRepository empresaRepository;
    @Mock SupabaseStorageService supabaseStorageService;
    @Mock TotpSecretEncryptionService encryptionService;
    @Mock ImageModerationService imageModerationService;

    @InjectMocks EmpresaPerfilService service;

    @Test
    @DisplayName("update persiste tagline, acento, WhatsApp y pie sin tocar la descripción")
    void updatePersisteMarcaPublica() {
        Empresa e = new Empresa();
        e.setId(1L);
        e.setNombreComercial("Viejo");
        e.setDescripcion("No borrar [FOTOS][][/FOTOS]");
        e.setNumeroWhatsapp("50611111111");
        e.setColorAcento("#1747A8");
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(e));
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> body = new LinkedHashMap<>();
        body.put("nombreComercial", "Café de Ana");
        body.put("tagline", "Café de especialidad");
        body.put("numeroWhatsapp", "50688887777");
        body.put("footerTexto", "Hecho en Pérez Zeledón");
        body.put("colorAcento", "#0EA5E9");

        Map<String, Object> out = service.update(1L, body);

        assertThat(e.getNombreComercial()).isEqualTo("Café de Ana");
        assertThat(e.getTagline()).isEqualTo("Café de especialidad");
        assertThat(e.getNumeroWhatsapp()).isEqualTo("50688887777");
        assertThat(e.getFooterTexto()).isEqualTo("Hecho en Pérez Zeledón");
        assertThat(e.getColorAcento()).isEqualTo("#0EA5E9");
        assertThat(e.getDescripcion()).isEqualTo("No borrar [FOTOS][][/FOTOS]");
        assertThat(out.get("tagline")).isEqualTo("Café de especialidad");
        assertThat(out.get("footerTexto")).isEqualTo("Hecho en Pérez Zeledón");
        assertThat(out.get("colorAcento")).isEqualTo("#0EA5E9");
    }

    @Test
    @DisplayName("update persiste categoría, Instagram y zona de envío")
    void updatePersisteExtrasNegocio() {
        Empresa e = new Empresa();
        e.setId(2L);
        e.setNombreComercial("Negocio");
        when(empresaRepository.findById(2L)).thenReturn(Optional.of(e));
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, String> body = new LinkedHashMap<>();
        body.put("categoriaNegocio", "Ropa");
        body.put("instagram", "@hotclick.cr");
        body.put("zonaEnvio", "GAM");

        Map<String, Object> out = service.update(2L, body);

        assertThat(e.getCategoriaNegocio()).isEqualTo("Ropa");
        assertThat(e.getInstagram()).isEqualTo("@hotclick.cr");
        assertThat(e.getZonaEnvio()).isEqualTo("GAM");
        assertThat(out.get("categoriaNegocio")).isEqualTo("Ropa");
        assertThat(out.get("instagram")).isEqualTo("@hotclick.cr");
        assertThat(out.get("zonaEnvio")).isEqualTo("GAM");
    }

    @Test
    @DisplayName("obtener falla si la empresa no existe")
    void obtener_inexistente() {
        when(empresaRepository.findById(44L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.obtener(44L))
                .isInstanceOf(RecursoNoEncontradoException.class)
                .hasMessageContaining("Empresa");
    }

    @Test
    @DisplayName("toSafeMap expone flags de secretos sin el valor crudo")
    void obtener_oculta_secretos() {
        Empresa e = empresaBase(5L);
        e.setClaveHaciendaEnc("enc-secreto");
        e.setCertP12Path("certs/5.p12");
        when(empresaRepository.findById(5L)).thenReturn(Optional.of(e));

        Map<String, Object> out = service.obtener(5L);

        assertThat(out.get("tieneClaveHacienda")).isEqualTo(true);
        assertThat(out.get("tieneCertP12")).isEqualTo(true);
        assertThat(out).doesNotContainKey("claveHaciendaEnc");
        assertThat(out).doesNotContainKey("certP12Path");
    }

    @Test
    @DisplayName("toggleVisibilidad bloquea negocio pendiente de aprobación")
    void toggle_pendiente_aprobacion() {
        Empresa e = empresaBase(3L);
        e.setEstadoEmpresa("PENDIENTE_APROBACION");
        when(empresaRepository.findById(3L)).thenReturn(Optional.of(e));

        assertThatThrownBy(() -> service.toggleVisibilidad(3L, true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("pendiente");
        verify(empresaRepository, never()).save(any());
    }

    @Test
    @DisplayName("toggleVisibilidad exige el campo")
    void toggle_sin_valor() {
        Empresa e = empresaBase(3L);
        e.setEstadoEmpresa("ACTIVA");
        when(empresaRepository.findById(3L)).thenReturn(Optional.of(e));

        assertThatThrownBy(() -> service.toggleVisibilidad(3L, null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("visibilidadPublica");
    }

    @Test
    @DisplayName("toggleVisibilidad persiste el flag")
    void toggle_ok() {
        Empresa e = empresaBase(3L);
        e.setEstadoEmpresa("ACTIVA");
        e.setVisibilidadPublica(false);
        when(empresaRepository.findById(3L)).thenReturn(Optional.of(e));
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(inv -> inv.getArgument(0));

        Map<String, Object> out = service.toggleVisibilidad(3L, "true");

        assertThat(e.getVisibilidadPublica()).isTrue();
        assertThat(out.get("visibilidadPublica")).isEqualTo(true);
        assertThat(out.get("estadoEmpresa")).isEqualTo("ACTIVA");
    }

    @Test
    @DisplayName("updateFiscal rechaza tipo de cédula inválido")
    void update_fiscal_tipo_cedula_invalido() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaBase(1L)));

        Map<String, String> body = Map.of("tipoCedula", "99");

        assertThatThrownBy(() -> service.updateFiscal(1L, body, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Tipo cédula");
    }

    @Test
    @DisplayName("updateFiscal rechaza ambiente inválido")
    void update_fiscal_ambiente_invalido() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaBase(1L)));

        Map<String, String> body = Map.of("ambienteHacienda", "DEV");

        assertThatThrownBy(() -> service.updateFiscal(1L, body, true))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ambiente");
    }

    @Test
    @DisplayName("updateFiscal PROD sin permiso de admin lo niega")
    void update_fiscal_prod_sin_permiso() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaBase(1L)));

        Map<String, String> body = Map.of("ambienteHacienda", "PROD");

        assertThatThrownBy(() -> service.updateFiscal(1L, body, false))
                .isInstanceOf(TenantAccessDeniedException.class)
                .hasMessageContaining("ADMIN");
        verify(empresaRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateFiscal cifra la clave Hacienda y acepta PROD con permiso")
    void update_fiscal_ok_con_clave_y_prod() {
        Empresa e = empresaBase(1L);
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(e));
        when(empresaRepository.save(any(Empresa.class))).thenAnswer(inv -> inv.getArgument(0));
        when(encryptionService.encrypt("clave-plana")).thenReturn("enc-clave");

        Map<String, String> body = new LinkedHashMap<>();
        body.put("cedulaJuridica", "3-101-123456");
        body.put("tipoCedula", "02");
        body.put("actividadEconomica", "4711");
        body.put("ambienteHacienda", "PROD");
        body.put("claveHacienda", "clave-plana");

        Map<String, Object> out = service.updateFiscal(1L, body, true);

        assertThat(e.getCedulaJuridica()).isEqualTo("3-101-123456");
        assertThat(e.getTipoCedula()).isEqualTo("02");
        assertThat(e.getAmbienteHacienda()).isEqualTo("PROD");
        assertThat(e.getClaveHaciendaEnc()).isEqualTo("enc-clave");
        assertThat(out.get("tieneClaveHacienda")).isEqualTo(true);
        verify(encryptionService).encrypt("clave-plana");
    }

    @Test
    @DisplayName("updateFiscal rechaza cédula demasiado larga")
    void update_fiscal_cedula_larga() {
        when(empresaRepository.findById(1L)).thenReturn(Optional.of(empresaBase(1L)));

        Map<String, String> body = Map.of("cedulaJuridica", "x".repeat(21));

        assertThatThrownBy(() -> service.updateFiscal(1L, body, false))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Cédula");
    }

    @Test
    @DisplayName("subirLogo rechaza imagen insegura")
    void subir_logo_rechazado() throws Exception {
        MultipartFile file = mock(MultipartFile.class);
        when(imageModerationService.moderar(file))
                .thenReturn(new ImageModerationService.ModerationResult(false, "contenido no permitido"));

        assertThatThrownBy(() -> service.subirLogo(1L, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Imagen rechazada");
        verify(supabaseStorageService, never()).subirImagen(any(), any());
        verify(empresaRepository, never()).save(any());
    }

    private static Empresa empresaBase(Long id) {
        Empresa e = new Empresa();
        e.setId(id);
        e.setNombreEmpresa("Negocio " + id);
        e.setNombreComercial("Comercial " + id);
        return e;
    }
}
