package com.hotclick.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

@Service
public class SupabaseStorageService {

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.service-key}")
    private String serviceKey;

    private static final String BUCKET = "HOT_CLICK";

    public String subirImagen(MultipartFile file) throws IOException, InterruptedException {
        validarArchivo(file);

        String ext = obtenerExtension(file.getOriginalFilename());
        String path = "productos/" + UUID.randomUUID() + "." + ext;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(supabaseUrl + "/storage/v1/object/" + BUCKET + "/" + path))
                .header("Authorization", "Bearer " + serviceKey)
                .header("Content-Type", file.getContentType())
                .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Supabase Storage respondió " + response.statusCode() + ": " + response.body());
        }

        return supabaseUrl + "/storage/v1/object/public/" + BUCKET + "/" + path;
    }

    private void validarArchivo(MultipartFile file) {
        if (file.isEmpty()) throw new RuntimeException("El archivo está vacío");
        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/")) throw new RuntimeException("Solo se permiten imágenes");
        if (file.getSize() > 5 * 1024 * 1024) throw new RuntimeException("La imagen no puede superar 5 MB");
    }

    private String obtenerExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "jpg";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
