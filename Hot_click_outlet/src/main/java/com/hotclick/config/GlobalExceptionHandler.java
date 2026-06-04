package com.hotclick.config;

import com.hotclick.dto.ResponseDTO;
import com.hotclick.exception.PlanLimitException;
import com.hotclick.exception.StockInsuficienteException;
import com.hotclick.exception.TenantAccessDeniedException;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.NoSuchElementException;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ── Dominio ───────────────────────────────────────────────────────────────

    @ExceptionHandler(TenantAccessDeniedException.class)
    public ResponseEntity<ResponseDTO> handleTenantDenied(TenantAccessDeniedException ex) {
        log.warn("Tenant access denied: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error(ex.getMessage()));
    }

    @ExceptionHandler(StockInsuficienteException.class)
    public ResponseEntity<ResponseDTO> handleStock(StockInsuficienteException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ResponseDTO.error(ex.getMessage()));
    }

    @ExceptionHandler(PlanLimitException.class)
    public ResponseEntity<ResponseDTO> handlePlanLimit(PlanLimitException ex) {
        return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(ResponseDTO.error(ex.getMessage()));
    }

    // ── Validación de entrada ─────────────────────────────────────────────────

    /** Disparado por @Valid en parámetros de controller */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ResponseDTO> handleValidation(MethodArgumentNotValidException ex) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(ResponseDTO.error(errors));
    }

    /** Disparado por @Validated en path variables / request params */
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ResponseDTO> handleConstraint(ConstraintViolationException ex) {
        String errors = ex.getConstraintViolations().stream()
                .map(cv -> cv.getPropertyPath().toString() + ": " + cv.getMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(ResponseDTO.error(errors));
    }

    /** JSON malformado o tipo incorrecto en el body */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ResponseDTO> handleUnreadable(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest().body(ResponseDTO.error("Formato de datos inválido"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ResponseDTO> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(ResponseDTO.error(ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ResponseDTO> handleIllegalState(IllegalStateException ex) {
        return ResponseEntity.badRequest().body(ResponseDTO.error(ex.getMessage()));
    }

    /** Recurso no encontrado (Optional.get() sin valor, etc.) */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ResponseDTO> handleNotFound(NoSuchElementException ex) {
        String msg = ex.getMessage();
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ResponseDTO.error(msg != null ? msg : "Recurso no encontrado"));
    }

    // ── Autenticación ─────────────────────────────────────────────────────────

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ResponseDTO> handleAccessDenied(AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ResponseDTO.error("Acceso denegado"));
    }

    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ResponseDTO> handleSecurity(SecurityException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(ResponseDTO.error(ex.getMessage()));
    }

    // ── Archivos ──────────────────────────────────────────────────────────────

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ResponseDTO> handleMaxSize(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ResponseDTO.error("La imagen no puede superar 10 MB"));
    }

    @ExceptionHandler(org.springframework.web.multipart.MultipartException.class)
    public ResponseEntity<ResponseDTO> handleMultipart(org.springframework.web.multipart.MultipartException ex) {
        String msg = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("size") ?
                "La imagen no puede superar 10 MB" : "Error procesando el archivo";
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(ResponseDTO.error(msg));
    }

    // ── Recursos estáticos no encontrados ────────────────────────────────────

    /** favicon.ico, assets inexistentes, etc. → 404 silencioso */
    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ResponseDTO> handleNoResource(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ResponseDTO.error("Recurso no encontrado"));
    }

    // ── Fallback ──────────────────────────────────────────────────────────────

    /** Captura cualquier excepción no manejada explícitamente arriba */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ResponseDTO> handleGeneral(Exception ex) {
        log.error("Unhandled exception [{}]: {}", ex.getClass().getSimpleName(), ex.getMessage(), ex);
        // TODO: revert after debugging — remove exception details before final deploy
        String detail = ex.getClass().getSimpleName() + ": " + (ex.getMessage() != null ? ex.getMessage().substring(0, Math.min(300, ex.getMessage().length())) : "null");
        return ResponseEntity.internalServerError()
                .body(ResponseDTO.error("Error interno: " + detail));
    }
}
