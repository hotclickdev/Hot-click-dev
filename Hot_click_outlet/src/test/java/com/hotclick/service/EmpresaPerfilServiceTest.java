package com.hotclick.service;

import com.hotclick.model.Empresa;
import com.hotclick.repository.EmpresaRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
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
}
