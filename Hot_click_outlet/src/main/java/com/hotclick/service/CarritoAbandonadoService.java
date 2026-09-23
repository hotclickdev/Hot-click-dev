package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotclick.dto.CarritoAbandonadoRequestDTO;
import com.hotclick.model.CarritoAbandonado;
import com.hotclick.repository.CarritoAbandonadoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CarritoAbandonadoService {

    private static final Logger log = LoggerFactory.getLogger(CarritoAbandonadoService.class);

    // Tope de carritos distintos (sesiones) que pueden disparar un email de recuperación
    // hacia la misma dirección en 24h. Sin esto, cualquiera puede crear N sessionId falsos
    // con el email de un tercero y el scheduler le manda N emails — email bombing con
    // la infraestructura de SendGrid del negocio.
    private static final int MAX_CARRITOS_CON_EMAIL_POR_DIA = 3;

    @Autowired private CarritoAbandonadoRepository repo;
    @Autowired private ObjectMapper objectMapper;

    /** Upsert: update PENDIENTE cart for session, or create new one. */
    @Transactional
    public CarritoAbandonado guardar(CarritoAbandonadoRequestDTO dto, Long userId) {
        CarritoAbandonado carrito = repo
            .findFirstBySessionIdAndStatusOrderByCreatedAtDesc(dto.getSessionId(), "PENDIENTE")
            .orElseGet(CarritoAbandonado::new);

        try {
            carrito.setItems(objectMapper.writeValueAsString(dto.getItems()));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Error serializing cart items", e);
        }
        carrito.setSessionId(dto.getSessionId());
        carrito.setUserId(userId);
        if (carrito.getTokenRecuperacion() == null || carrito.getTokenRecuperacion().isBlank()) {
            carrito.setTokenRecuperacion(UUID.randomUUID().toString());
        }
        if (dto.getEmail() != null && !dto.getEmail().isBlank() && puedeAsociarEmail(dto.getEmail())) {
            carrito.setEmail(dto.getEmail());
        }
        carrito.setStatus("PENDIENTE");
        return repo.save(carrito);
    }

    /** True si esta dirección no superó el tope de carritos/emails en las últimas 24h. */
    private boolean puedeAsociarEmail(String email) {
        long recientes = repo.countByEmailAndCreatedAtAfter(
            email, LocalDateTime.now(Constants.ZONA_CR).minusHours(24));
        if (recientes >= MAX_CARRITOS_CON_EMAIL_POR_DIA) {
            log.warn("Tope de carritos abandonados/día alcanzado para email={} — no se asocia, no se enviará recordatorio", email);
            return false;
        }
        return true;
    }

    public Optional<CarritoAbandonado> findById(Long id) {
        return repo.findById(id);
    }

    public Optional<CarritoAbandonado> findByTokenRecuperacion(String token) {
        if (token == null || token.isBlank()) return Optional.empty();
        return repo.findByTokenRecuperacion(token.trim());
    }

    public Optional<CarritoAbandonado> findPendienteBySession(String sessionId) {
        return repo.findFirstBySessionIdAndStatusOrderByCreatedAtDesc(sessionId, "PENDIENTE");
    }

    @Transactional
    public void marcarRecuperado(Long id) {
        repo.findById(id).ifPresent(c -> {
            c.setStatus("RECUPERADO");
            repo.save(c);
        });
    }

    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    /** Called by scheduler. Returns carts ready to process. */
    public List<CarritoAbandonado> findPendientesAntiguos(int hoursToWait) {
        return repo.findByStatusAndCreatedAtBefore(
            "PENDIENTE",
            LocalDateTime.now(Constants.ZONA_CR).minusHours(hoursToWait)
        );
    }

    @Transactional
    public void marcarEmailEnviado(Long id) {
        repo.findById(id).ifPresent(c -> {
            c.setStatus("EMAIL_ENVIADO");
            repo.save(c);
        });
    }

    @Transactional
    public void marcarVencido(Long id) {
        repo.findById(id).ifPresent(c -> {
            c.setStatus("VENCIDO");
            repo.save(c);
        });
    }

    /** Deserializes the JSON items string back into a list. */
    public List<CarritoAbandonadoRequestDTO.CartItemDTO> deserializarItems(String json) {
        try {
            return objectMapper.readValue(json,
                objectMapper.getTypeFactory().constructCollectionType(
                    List.class, CarritoAbandonadoRequestDTO.CartItemDTO.class));
        } catch (JsonProcessingException e) {
            log.error("Error deserializing cart items: {}", e.getMessage());
            return List.of();
        }
    }
}
