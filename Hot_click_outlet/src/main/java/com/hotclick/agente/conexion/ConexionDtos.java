package com.hotclick.agente.conexion;

import com.hotclick.agente.canal.CanalCuentaDto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Cuerpos de la conexión. Ningún DTO de respuesta lleva tokens. */
public final class ConexionDtos {
    private ConexionDtos() {}

    /** Datos públicos para abrir el SDK en el navegador (el id de app y los configuration id no son secretos). */
    public record ConfigPublica(boolean whatsappDisponible, boolean metaLoginDisponible, String appId,
                                String whatsappConfigId, String loginConfigId, String graphVersion) {}

    public record WhatsappRequest(
        @NotBlank @Size(max = 2048) String code,
        @NotBlank @Pattern(regexp = "\\d{5,32}") String phoneNumberId,
        @NotBlank @Pattern(regexp = "\\d{5,32}") String wabaId) {

        @Override public String toString() { return "WhatsappRequest[***]"; }
    }

    public record PaginasRequest(@NotBlank @Size(max = 4096) String accessToken) {
        @Override public String toString() { return "PaginasRequest[***]"; }
    }

    public record ConectarPaginaRequest(
        @NotBlank @Size(max = 4096) String accessToken,
        @NotBlank @Pattern(regexp = "\\d{5,32}") String paginaId) {

        @Override public String toString() { return "ConectarPaginaRequest[***]"; }
    }

    /** Página elegible; sin token de página. */
    public record PaginaDto(String id, String nombre, String instagramId, String instagramUsuario) {}

    public record ConexionResultado(List<CanalCuentaDto> cuentas, List<String> avisos) {}
}
