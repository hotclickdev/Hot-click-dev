package com.hotclick.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

@Service
public class GitHubService {

    private static final Logger log = LoggerFactory.getLogger(GitHubService.class);
    private static final HttpClient HTTP = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${github.token:}")
    private String token;

    @Value("${github.repo:hotclickdev/Hot-click-dev}")
    private String repo;

    @Autowired
    private ObjectMapper objectMapper;

    /** Obtiene el contenido de un archivo del repo (decodificado de base64). */
    public String obtenerArchivo(String filePath) throws Exception {
        String url = "https://api.github.com/repos/" + repo + "/contents/" + filePath;
        HttpRequest req = buildGet(url);
        HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) {
            log.warn("GitHub: archivo no encontrado {} — status={}", filePath, res.statusCode());
            return null;
        }
        JsonNode node = objectMapper.readTree(res.body());
        String encoded = node.path("content").asText("").replace("\n", "");
        return new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8);
    }

    /** SHA del archivo actual (necesario para actualizarlo). */
    public String obtenerShaArchivo(String filePath) throws Exception {
        String url = "https://api.github.com/repos/" + repo + "/contents/" + filePath;
        HttpRequest req = buildGet(url);
        HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) return null;
        return objectMapper.readTree(res.body()).path("sha").asText(null);
    }

    /** SHA del último commit en master (para crear branch). */
    private String obtenerShaMaster() throws Exception {
        String url = "https://api.github.com/repos/" + repo + "/git/refs/heads/master";
        HttpRequest req = buildGet(url);
        HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        return objectMapper.readTree(res.body()).path("object").path("sha").asText();
    }

    /** Crea un branch a partir de master. */
    public void crearBranch(String branchName) throws Exception {
        String sha = obtenerShaMaster();
        String url = "https://api.github.com/repos/" + repo + "/git/refs";
        String body = objectMapper.writeValueAsString(Map.of(
                "ref", "refs/heads/" + branchName,
                "sha", sha));
        HttpRequest req = buildPost(url, body);
        HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 201) throw new RuntimeException("No se pudo crear branch: " + res.body());
        log.info("GitHub: branch creado — {}", branchName);
    }

    /** Actualiza (o crea) un archivo en un branch. */
    public void actualizarArchivo(String branchName, String filePath, String contenido, String mensaje, String sha) throws Exception {
        String url = "https://api.github.com/repos/" + repo + "/contents/" + filePath;
        String encoded = Base64.getEncoder().encodeToString(contenido.getBytes(StandardCharsets.UTF_8));
        Map<String, Object> payload = sha != null
                ? Map.of("message", mensaje, "content", encoded, "branch", branchName, "sha", sha)
                : Map.of("message", mensaje, "content", encoded, "branch", branchName);
        HttpRequest req = buildPut(url, objectMapper.writeValueAsString(payload));
        HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200 && res.statusCode() != 201)
            throw new RuntimeException("No se pudo actualizar archivo: " + res.body());
        log.info("GitHub: archivo actualizado — {}", filePath);
    }

    /** Abre un Pull Request y retorna la URL. */
    public String abrirPullRequest(String branchName, String titulo, String cuerpo) throws Exception {
        String url = "https://api.github.com/repos/" + repo + "/pulls";
        String body = objectMapper.writeValueAsString(Map.of(
                "title", titulo,
                "body", cuerpo,
                "head", branchName,
                "base", "master"));
        HttpRequest req = buildPost(url, body);
        HttpResponse<String> res = HTTP.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 201) throw new RuntimeException("No se pudo abrir PR: " + res.body());
        String prUrl = objectMapper.readTree(res.body()).path("html_url").asText();
        log.info("GitHub: PR abierto — {}", prUrl);
        return prUrl;
    }

    private HttpRequest buildGet(String url) {
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .GET()
                .build();
    }

    private HttpRequest buildPost(String url, String body) {
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
    }

    private HttpRequest buildPut(String url, String body) {
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .header("Content-Type", "application/json")
                .PUT(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();
    }
}
