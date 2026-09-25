package com.hotclick.service;
import com.hotclick.exception.RecursoNoEncontradoException;
import com.hotclick.utils.Constants;

import com.hotclick.model.Empresa;
import com.hotclick.model.TurnoCaja;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
import com.hotclick.security.CompanyScope;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TurnoCajaService {

    @Autowired private TurnoCajaRepository turnoCajaRepository;
    @Autowired private UsuarioRepository   usuarioRepository;
    @Autowired private EmpresaRepository   empresaRepository;
    @Autowired private CompanyScope        companyScope;

    @Transactional
    public TurnoCaja abrirTurno(Long usuarioId, Long empresaId, Integer montoInicial) {
        Optional<TurnoCaja> turnoExistente = turnoCajaRepository.findByUsuario_IdAndEstado(usuarioId, "ABIERTO");
        if (turnoExistente.isPresent()) {
            throw new IllegalStateException("Ya tienes un turno abierto. Cerralo antes de abrir uno nuevo.");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Usuario", usuarioId));
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Empresa", empresaId));

        TurnoCaja turno = new TurnoCaja();
        turno.setUsuario(usuario);
        turno.setEmpresa(empresa);
        turno.setMontoInicial(montoInicial != null ? montoInicial : 0);
        turno.setFechaApertura(LocalDateTime.now(Constants.ZONA_CR));
        turno.setEstado("ABIERTO");
        return turnoCajaRepository.save(turno);
    }

    @Transactional
    public TurnoCaja cerrarTurno(Long turnoId, Integer montoDeclarado, String notas) {
        TurnoCaja turno = turnoCajaRepository.findById(turnoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Turno no encontrado"));
        assertPuedeOperarTurno(turno);
        if (!"ABIERTO".equals(turno.getEstado())) {
            throw new IllegalStateException("El turno ya está cerrado");
        }

        int montoCalculado = turno.getMontoInicial()
            + turno.getTotalEfectivo()
            + turno.getTotalSinpe()
            + turno.getTotalTarjeta()
            + turno.getTotalTransferencia();

        turno.setMontoDeclarado(montoDeclarado != null ? montoDeclarado : 0);
        turno.setMontoCalculado(montoCalculado);
        turno.setDiferencia(turno.getMontoDeclarado() - montoCalculado);
        turno.setNotas(notas);
        turno.setFechaCierre(LocalDateTime.now(Constants.ZONA_CR));
        turno.setEstado("CERRADO");
        return turnoCajaRepository.save(turno);
    }

    @Transactional(readOnly = true)
    public Optional<TurnoCaja> getTurnoActivo(Long usuarioId) {
        return turnoCajaRepository.findByUsuario_IdAndEstado(usuarioId, "ABIERTO");
    }

    /**
     * Suma una venta al turno. Sin check de tenant/dueño a propósito: se invoca
     * desde webhooks de pago y desde el polling del cliente en POS QR (sin JWT),
     * y el turnoId ya viene de la sesión POS ligada a la empresa, no del body.
     */
    @Transactional
    public void actualizarTotales(Long turnoId, String metodoPago, Integer monto) {
        if (metodoPago == null || metodoPago.isBlank() || monto == null || monto <= 0) return;
        TurnoCaja turno = turnoCajaRepository.findById(turnoId)
            .orElseThrow(() -> new RecursoNoEncontradoException("Turno no encontrado"));

        switch (metodoPago.toUpperCase()) {
            case "EFECTIVO"      -> turno.setTotalEfectivo(turno.getTotalEfectivo() + monto);
            case "SINPE"         -> turno.setTotalSinpe(turno.getTotalSinpe() + monto);
            case "TARJETA"       -> turno.setTotalTarjeta(turno.getTotalTarjeta() + monto);
            case "TRANSFERENCIA" -> turno.setTotalTransferencia(turno.getTotalTransferencia() + monto);
        }
        turno.setNumTransacciones(turno.getNumTransacciones() + 1);
        turnoCajaRepository.save(turno);
    }

    /** Tenant + dueño del turno para el cierre (ADMIN_IT puede cerrar cualquiera de su scope). */
    private void assertPuedeOperarTurno(TurnoCaja turno) {
        Long empresaId = turno.getEmpresa() != null ? turno.getEmpresa().getId() : null;
        companyScope.assertCanAccessNullable(empresaId);
        if (companyScope.isAdminIT()) {
            return;
        }
        Long uid = companyScope.getCurrentUserId();
        if (uid == null || turno.getUsuario() == null || !uid.equals(turno.getUsuario().getId())) {
            throw new SecurityException("Solo el cajero del turno puede operar este turno");
        }
    }

    @Transactional(readOnly = true)
    public List<TurnoCaja> getHistorial(Long empresaId) {
        return turnoCajaRepository.findByEmpresaIdOrderByFechaAperturaDesc(empresaId);
    }
}
