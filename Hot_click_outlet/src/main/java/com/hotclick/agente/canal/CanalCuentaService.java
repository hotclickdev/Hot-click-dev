package com.hotclick.agente.canal;

import com.hotclick.utils.Constants;
import com.hotclick.agente.webhook.MensajeEntrante;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.service.TotpSecretEncryptionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Cuentas de mensajería conectadas. Aislamiento: las operaciones de gestión reciben el alcance del llamador
 * ({@code empresaScope}): un id de empresa para un negocio, {@code null} solo para el ADMIN global
 * (ver {@code CompanyScope.requireEmpresaIdOrAdmin}). Una cuenta ajena responde como inexistente (404).
 */
@Service
public class CanalCuentaService {

    private final CanalCuentaRepository repo;
    private final TotpSecretEncryptionService cifrado;

    public CanalCuentaService(CanalCuentaRepository repo, TotpSecretEncryptionService cifrado) {
        this.repo = repo;
        this.cifrado = cifrado;
    }

    /** Usado por el enrutador de mensajes entrantes; no filtra por estado (lo decide quien llama). */
    @Transactional(readOnly = true)
    public Optional<CanalCuenta> buscar(MensajeEntrante.Canal canal, String idExterno) {
        if (canal == null || idExterno == null || idExterno.isBlank()) return Optional.empty();
        return repo.findByTipoAndIdExterno(canal, idExterno);
    }

    /**
     * Alta o reconexión de una cuenta; la usará el Embedded Signup (AG-23). {@code empresaId == null} = cuenta de
     * HotClick. Si el id externo ya existe en OTRA empresa, se rechaza (una cuenta no se puede secuestrar).
     */
    @Transactional
    public CanalCuenta registrarCuenta(Long empresaId, MensajeEntrante.Canal tipo, String idExterno, String wabaId,
                                       String nombre, String tokenPlano) {
        if (tipo == null || idExterno == null || idExterno.isBlank())
            throw new IllegalArgumentException("tipo e idExterno son obligatorios");
        CanalCuenta c = repo.findByTipoAndIdExterno(tipo, idExterno).orElse(null);
        if (c != null && !java.util.Objects.equals(c.getEmpresaId(), empresaId))
            throw new IllegalStateException("La cuenta ya está conectada a otro negocio");
        if (c == null) {
            c = new CanalCuenta();
            c.setTipo(tipo);
            c.setIdExterno(idExterno);
            c.setEmpresaId(empresaId);
        }
        c.setWabaId(wabaId);
        c.setNombre(nombre);
        if (tokenPlano != null && !tokenPlano.isBlank()) c.setTokenCifrado(cifrado.encryptTokenCanal(tokenPlano));
        c.setEstado(EstadoCanal.ACTIVA);
        c.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        return repo.save(c);
    }

    /** Token en claro, solo para el envío. Nunca devolver ni registrar. */
    public String tokenDe(CanalCuenta cuenta) {
        return cuenta.tieneToken() ? cifrado.decryptTokenCanal(cuenta.getTokenCifrado()) : null;
    }

    /** Cuenta ACTIVA con token de un tipo para un negocio (la más antigua); vacío si no hay. */
    @Transactional(readOnly = true)
    public Optional<CanalCuenta> activaDe(Long empresaId, MensajeEntrante.Canal tipo) {
        if (empresaId == null) return Optional.empty();
        return repo.findByEmpresaIdOrderByIdAsc(empresaId).stream()
            .filter(c -> c.getTipo() == tipo && c.getEstado() == EstadoCanal.ACTIVA && c.tieneToken()).findFirst();
    }

    @Transactional(readOnly = true)
    public List<CanalCuenta> listar(Long empresaScope) {
        return empresaScope == null ? repo.findAllByOrderByIdAsc() : repo.findByEmpresaIdOrderByIdAsc(empresaScope);
    }

    @Transactional
    public CanalCuenta pausar(Long id, Long empresaScope) {
        return cambiarEstado(id, empresaScope, EstadoCanal.PAUSADA);
    }

    @Transactional
    public CanalCuenta reanudar(Long id, Long empresaScope) {
        CanalCuenta c = deAlcance(id, empresaScope);
        if (c.getEstado() == EstadoCanal.DESCONECTADA)
            throw new IllegalStateException("Una cuenta desconectada se vuelve a conectar desde el alta");
        return cambiarEstado(id, empresaScope, EstadoCanal.ACTIVA);
    }

    /** Desconecta y borra el token guardado. */
    @Transactional
    public CanalCuenta desconectar(Long id, Long empresaScope) {
        CanalCuenta c = deAlcance(id, empresaScope);
        c.setEstado(EstadoCanal.DESCONECTADA);
        c.setTokenCifrado(null);
        c.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        return repo.save(c);
    }

    private CanalCuenta cambiarEstado(Long id, Long empresaScope, EstadoCanal estado) {
        CanalCuenta c = deAlcance(id, empresaScope);
        c.setEstado(estado);
        c.setFechaActualizacion(LocalDateTime.now(Constants.ZONA_CR));
        return repo.save(c);
    }

    private CanalCuenta deAlcance(Long id, Long empresaScope) {
        CanalCuenta c = repo.findById(id).orElseThrow(() -> new RecursoNoEncontradoException("Canal no encontrado"));
        if (empresaScope != null && !empresaScope.equals(c.getEmpresaId()))
            throw new RecursoNoEncontradoException("Canal no encontrado");
        return c;
    }
}
