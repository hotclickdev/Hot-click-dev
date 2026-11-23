package com.hotclick.service.storage;

import com.hotclick.controller.EmpresaPerfilController;
import com.hotclick.exception.IntegracionExternaException;
import com.hotclick.security.CompanyScope;
import com.hotclick.security.PropietarioGuard;
import com.hotclick.service.EmpresaPerfilService;
import com.hotclick.service.SupabaseStorageService;
import io.github.resilience4j.springboot3.circuitbreaker.autoconfigure.CircuitBreakerAutoConfiguration;
import io.github.resilience4j.springboot3.retry.autoconfigure.RetryAutoConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.autoconfigure.aop.AopAutoConfiguration;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * F2: un .p12 inválido (extensión o magic bytes) es validación (400), no falla de S3 (500).
 * Servicio real con su CircuitBreaker/Retry de s3 (AOP), S3 mockeado.
 */
@SpringBootTest(classes = SupabaseStorageService.class, properties = {
    "aws.s3.bucket=test-bucket",
    "aws.s3.public-url=https://cdn.test"
})
@ImportAutoConfiguration({AopAutoConfiguration.class, CircuitBreakerAutoConfiguration.class, RetryAutoConfiguration.class})
@DisplayName("F2: certificado .p12 inválido → validación, no falla de infraestructura")
class CertP12InvalidoTest {

    private static final String MSG_EXT = "Solo se permiten archivos .p12 o .pfx";
    private static final String MSG_MAGIC = "El archivo no es un certificado PKCS#12 válido";

    @MockitoBean S3Client s3Client;
    @Autowired SupabaseStorageService storage;

    @Test
    @DisplayName("servicio: .txt → IllegalArgumentException (no IntegracionExternaException)")
    void txtLanzaIllegalArgument() {
        MockMultipartFile f = new MockMultipartFile("file", "cert.txt", "text/plain", new byte[]{0x30, 0x01, 0x02});
        assertThatThrownBy(() -> storage.subirCertificado(f, 1L))
            .isInstanceOf(IllegalArgumentException.class).hasMessage(MSG_EXT)
            .isNotInstanceOf(IntegracionExternaException.class);
    }

    @Test
    @DisplayName("servicio: .p12 sin 0x30 inicial → IllegalArgumentException")
    void magicBytesInvalidosLanzaIllegalArgument() {
        MockMultipartFile f = new MockMultipartFile("file", "cert.p12", "application/x-pkcs12", new byte[]{0x01, 0x02, 0x03});
        assertThatThrownBy(() -> storage.subirCertificado(f, 1L))
            .isInstanceOf(IllegalArgumentException.class).hasMessage(MSG_MAGIC)
            .isNotInstanceOf(IntegracionExternaException.class);
    }

    @Test
    @DisplayName("servicio: imagen privada / XML privado inválidos tampoco se vuelven IntegracionExternaException")
    void otrosFallbacksRelanzanValidacion() {
        MockMultipartFile vacio = new MockMultipartFile("file", "a.png", "image/png", new byte[0]);
        assertThatThrownBy(() -> storage.subirImagenPrivada(vacio, "privado/x.png"))
            .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> storage.subirImagenBytes(new byte[]{1}, "exe", "productos"))
            .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("servicio: subirXmlPrivado / leerPrivado inválidos propagan la IllegalArgumentException tal cual (mata P2/P4)")
    void xmlYLecturaPrivadaPropagaValidacion() {
        assertThatThrownBy(() -> storage.subirXmlPrivado(new byte[0], "privado/x.xml"))
            .isExactlyInstanceOf(IllegalArgumentException.class).hasMessage("El XML está vacío");
        assertThatThrownBy(() -> storage.subirXmlPrivado(null, "privado/x.xml"))
            .isExactlyInstanceOf(IllegalArgumentException.class).hasMessage("El XML está vacío");
        for (String clave : new String[]{null, "  ", "a/../b", "/abs/x"}) {
            assertThatThrownBy(() -> storage.leerPrivado(clave))
                .isExactlyInstanceOf(IllegalArgumentException.class).hasMessage("La ruta del archivo no es válida");
        }
        verifyNoInteractions(s3Client);
    }

    @Test
    @DisplayName("falla real de S3 sigue yendo al fallback → IntegracionExternaException")
    void fallaRealDeS3SigueAlFallback() {
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .thenThrow(new RuntimeException("s3 caído"));
        MockMultipartFile f = new MockMultipartFile("file", "cert.p12", "application/x-pkcs12", new byte[]{0x30, 0x01, 0x02});
        assertThatThrownBy(() -> storage.subirCertificado(f, 1L))
            .isInstanceOf(IntegracionExternaException.class);
    }

    @Test
    @DisplayName("controller: .txt y magic bytes inválidos → 400 con el mensaje de validación, sin tocar S3")
    void controllerDa400() throws Exception {
        EmpresaPerfilService perfil = new EmpresaPerfilService();
        ReflectionTestUtils.setField(perfil, "supabaseStorageService", storage);
        CompanyScope scope = mock(CompanyScope.class);
        when(scope.getCurrentEmpresaIdOrOwn()).thenReturn(1L);
        PropietarioGuard guard = mock(PropietarioGuard.class);
        when(guard.puedeGestionarEmpresa(1L)).thenReturn(true);
        EmpresaPerfilController c = new EmpresaPerfilController();
        ReflectionTestUtils.setField(c, "companyScope", scope);
        ReflectionTestUtils.setField(c, "empresaPerfilService", perfil);
        ReflectionTestUtils.setField(c, "propietarioGuard", guard);
        MockMvc mvc = MockMvcBuilders.standaloneSetup(c).build();

        mvc.perform(multipart("/api/empresa/perfil/cert-p12")
                .file(new MockMultipartFile("file", "cert.txt", "text/plain", new byte[]{0x30, 0x01, 0x02})))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(MSG_EXT));
        mvc.perform(multipart("/api/empresa/perfil/cert-p12")
                .file(new MockMultipartFile("file", "cert.p12", "application/x-pkcs12", new byte[]{0x01, 0x02, 0x03})))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(MSG_MAGIC));

        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }
}
