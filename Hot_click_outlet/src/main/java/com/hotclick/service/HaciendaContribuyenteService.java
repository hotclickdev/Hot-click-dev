package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.repository.EmpresaRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Verifica contribuyentes en la API pública de Hacienda CR.
 *
 * GET https://api.hacienda.go.cr/fe/ae?identificacion={cedula}
 * No requiere autenticación. Retorna: nombre, tipoIdentificacion, situacion.estado, regimen.
 */
@Service
public class HaciendaContribuyenteService {

    private static final Logger log = LoggerFactory.getLogger(HaciendaContribuyenteService.class);
    private static final String API_URL = "https://api.hacienda.go.cr/fe/ae?identificacion={cedula}";

    public record ContribuyenteDTO(
        String cedula,
        String nombre,
        String tipoIdentificacion,
        String estadoInscripcion,
        String regimen,
        boolean inscrito
    ) {}

    private final RestTemplate restTemplate;
    private final EmpresaRepository empresaRepository;

    public HaciendaContribuyenteService(RestTemplate restTemplate, EmpresaRepository empresaRepository) {
        this.restTemplate    = restTemplate;
        this.empresaRepository = empresaRepository;
    }

    @CircuitBreaker(name = "hacienda-contribuyente", fallbackMethod = "fallbackConsulta")
    @Retry(name = "hacienda-contribuyente")
    public ContribuyenteDTO consultar(String cedula) {
        log.info("Consultando contribuyente Hacienda: {}", cedula);
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resp = restTemplate.getForObject(API_URL, Map.class, cedula);
            if (resp == null) {
                return noEncontrado(cedula);
            }
            return parsear(cedula, resp);
        } catch (HttpClientErrorException.NotFound e) {
            return noEncontrado(cedula);
        }
    }

    @Transactional
    public ContribuyenteDTO verificarYGuardar(Long empresaId, String cedula) {
        ContribuyenteDTO dto = consultar(cedula);
        if (empresaId == null) return dto;
        empresaRepository.findById(empresaId).ifPresent(empresa -> {
            empresa.setCedulaJuridica(cedula);
            empresa.setInscritoHacienda(dto.inscrito());
            empresa.setRegimenTributario(dto.regimen());
            empresa.setNombreHacienda(dto.nombre());
            empresa.setFechaVerificacionHacienda(LocalDateTime.now(Constants.ZONA_CR));
            empresaRepository.save(empresa);
        });
        return dto;
    }

    @SuppressWarnings("unchecked")
    private ContribuyenteDTO parsear(String cedula, Map<String, Object> resp) {
        String nombre = (String) resp.getOrDefault("nombre", "");

        // tipoIdentificacion puede ser objeto o string
        Object tipoObj = resp.get("tipoIdentificacion");
        String tipo = "";
        if (tipoObj instanceof Map) {
            tipo = (String) ((Map<String, Object>) tipoObj).getOrDefault("tipo", "");
        } else if (tipoObj instanceof String) {
            tipo = (String) tipoObj;
        }

        // situacion.estado — INSCRITO | DESINSCRITO | NO_INSCRITO
        String estado = "";
        Object situacionObj = resp.get("situacion");
        if (situacionObj instanceof Map) {
            estado = (String) ((Map<String, Object>) situacionObj).getOrDefault("estado", "");
        }

        // regimen.descripcion
        String regimen = "";
        Object regimenObj = resp.get("regimen");
        if (regimenObj instanceof Map) {
            regimen = (String) ((Map<String, Object>) regimenObj).getOrDefault("descripcion", "");
        }

        boolean inscrito = "INSCRITO".equalsIgnoreCase(estado);
        return new ContribuyenteDTO(cedula, nombre, tipo, estado, regimen, inscrito);
    }

    private ContribuyenteDTO noEncontrado(String cedula) {
        return new ContribuyenteDTO(cedula, null, null, "NO_ENCONTRADO", null, false);
    }

    @SuppressWarnings("unused")
    private ContribuyenteDTO fallbackConsulta(String cedula, Throwable ex) {
        log.warn("Fallback Hacienda contribuyente para {}: {}", cedula, ex.getMessage());
        return new ContribuyenteDTO(cedula, null, null, "SERVICIO_NO_DISPONIBLE", null, false);
    }
}
