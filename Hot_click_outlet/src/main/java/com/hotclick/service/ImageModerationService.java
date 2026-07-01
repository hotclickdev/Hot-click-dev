package com.hotclick.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.InstanceProfileCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.rekognition.RekognitionClient;
import software.amazon.awssdk.services.rekognition.model.DetectModerationLabelsRequest;
import software.amazon.awssdk.services.rekognition.model.DetectModerationLabelsResponse;
import software.amazon.awssdk.services.rekognition.model.Image;
import software.amazon.awssdk.services.rekognition.model.InvalidImageFormatException;
import software.amazon.awssdk.services.rekognition.model.ModerationLabel;

import java.io.IOException;
import java.util.List;
import java.util.Set;

/**
 * Moderación de contenido usando AWS Rekognition DetectModerationLabels.
 * Usa el Instance Profile de EC2 (hotclick-ec2-role) — no requiere API key.
 *
 * Requiere permiso IAM: rekognition:DetectModerationLabels en la política HotclickS3Access.
 *
 * Fail-open: si Rekognition no responde (red, IAM mal configurado), la imagen pasa
 * y se registra un warning. La protección primaria son los magic bytes en SupabaseStorageService.
 */
@Service
public class ImageModerationService {

    private static final Logger log = LoggerFactory.getLogger(ImageModerationService.class);

    // Categorías que Rekognition puede detectar y que queremos bloquear
    private static final Set<String> BLOCKED_CATEGORIES = Set.of(
        "Explicit Nudity",
        "Violence",
        "Visually Disturbing",
        "Hate Symbols",
        "Drugs & Tobacco"
    );

    // Confianza mínima (%) para bloquear. 80 = buena precisión sin falsos positivos excesivos.
    private static final float MIN_CONFIDENCE = 80.0f;

    private final RekognitionClient rekognition;

    public ImageModerationService() {
        this.rekognition = RekognitionClient.builder()
            .region(Region.US_EAST_2)
            .credentialsProvider(InstanceProfileCredentialsProvider.create())
            .build();
    }

    public record ModerationResult(boolean safe, String reason) {}

    /**
     * Verifica si la imagen es segura para publicar en el marketplace.
     * Devuelve safe=true si la imagen es aceptable o si Rekognition no está disponible.
     */
    public ModerationResult moderar(MultipartFile file) {
        try {
            byte[] bytes = file.getBytes();
            return moderarBytes(bytes);
        } catch (IOException e) {
            log.warn("[Moderación] No se pudo leer archivo: {}", e.getMessage());
            return new ModerationResult(true, null);
        }
    }

    private ModerationResult moderarBytes(byte[] bytes) {
        try {
            DetectModerationLabelsRequest req = DetectModerationLabelsRequest.builder()
                .image(Image.builder()
                    .bytes(SdkBytes.fromByteArray(bytes))
                    .build())
                .minConfidence(MIN_CONFIDENCE)
                .build();

            DetectModerationLabelsResponse resp = rekognition.detectModerationLabels(req);
            List<ModerationLabel> labels = resp.moderationLabels();

            for (ModerationLabel label : labels) {
                String topLevel = label.parentName() != null && !label.parentName().isBlank()
                    ? label.parentName()
                    : label.name();
                if (BLOCKED_CATEGORIES.contains(topLevel)) {
                    log.warn("[Moderación] Imagen rechazada: {} (confianza: {:.0f}%)", label.name(), label.confidence());
                    return new ModerationResult(false, "Imagen rechazada: contenido no permitido detectado");
                }
            }

            return new ModerationResult(true, null);

        } catch (InvalidImageFormatException e) {
            // Rekognition solo soporta JPEG/PNG. Formatos como WebP/AVIF/HEIC son válidos
            // para el marketplace (ver SupabaseStorageService) pero Rekognition no puede leerlos:
            // fail-open igual que la rama de abajo, la defensa primaria son los magic bytes.
            log.warn("[Moderación] Rekognition no soporta el formato de esta imagen, fail-open: {}", e.getMessage());
            return new ModerationResult(true, null);
        } catch (Exception e) {
            log.warn("[Moderación] Rekognition no disponible, fail-open: {}", e.getMessage());
            return new ModerationResult(true, null);
        }
    }
}
