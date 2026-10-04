package com.hotclick.service.storage;

import com.hotclick.controller.SolicitudServicioController;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * FULL-01 de punta a punta en {@code POST /api/servicios/fotos}: servicio real con su
 * Retry y CircuitBreaker de s3 (el rechazo no se reintenta ni se convierte en "S3 caído"),
 * S3 mockeado.
 */
@SpringBootTest(classes = SupabaseStorageService.class, properties = {
    "aws.s3.bucket=test-bucket",
    "aws.s3.public-url=https://cdn.test"
})
@ImportAutoConfiguration({AopAutoConfiguration.class, CircuitBreakerAutoConfiguration.class, RetryAutoConfiguration.class})
@DisplayName("FULL-01: upload público con imagen bomba")
class ImagenBombaUploadTest {

    @MockitoBean S3Client s3Client;
    @Autowired SupabaseStorageService storage;

    private MockMvc mvc() {
        SolicitudServicioController controller = new SolicitudServicioController();
        ReflectionTestUtils.setField(controller, "supabaseStorageService", storage);
        return MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    @DisplayName("PNG de 20000×20000 → 400, sin OOM y sin subir a S3")
    void bombaDa400() throws Exception {
        MockMultipartFile bomba = new MockMultipartFile(
            "file", "bomba.png", "image/png", ImagenesDePrueba.pngBomba(20_000));

        mvc().perform(multipart("/api/servicios/fotos").file(bomba))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(StorageImageValidator.MSG_DEMASIADO_GRANDE));

        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("foto normal → 200 y se sube una sola vez")
    void fotoNormalPasa() throws Exception {
        MockMultipartFile foto = new MockMultipartFile(
            "file", "foto.jpg", "image/jpeg", ImagenesDePrueba.fotoNormal("jpg"));

        mvc().perform(multipart("/api/servicios/fotos").file(foto))
            .andExpect(status().isOk());

        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }
}
