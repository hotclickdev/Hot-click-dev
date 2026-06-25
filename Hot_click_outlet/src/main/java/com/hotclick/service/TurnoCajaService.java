package com.hotclick.service;
import com.hotclick.utils.Constants;

import com.hotclick.model.Empresa;
import com.hotclick.model.TurnoCaja;
import com.hotclick.model.Usuario;
import com.hotclick.repository.EmpresaRepository;
import com.hotclick.repository.TurnoCajaRepository;
import com.hotclick.repository.UsuarioRepository;
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

    @Transactional
    public TurnoCaja abrirTurno(Long usuarioId, Long empresaId, Integer montoInicial) {
        Optional<TurnoCaja> turnoExistente = turnoCajaRepository.findByUsuarioIdAndEstado(usuarioId, "ABIERTO");
        if (turnoExistente.isPresent()) {
            throw new IllegalStateException("Ya tienes un turno abierto. Cerralo antes de abrir uno nuevo.");
        }

        Usuario usuario = usuarioRepository.findById(usuarioId)
            .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));
        Empresa empresa = empresaRepository.findById(empresaId)
            .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

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
            .orElseThrow(() -> new RuntimeException("Turno no encontrado"));
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
        return turnoCajaRepository.findByUsuarioIdAndEstado(usuarioId, "ABIERTO");
    }

    @Transactional
    public void actualizarTotales(Long turnoId, String metodoPago, Integer monto) {
        if (metodoPago == null || metodoPago.isBlank() || monto == null || monto <= 0) return;
        TurnoCaja turno = turnoCajaRepository.findById(turnoId)
            .orElseThrow(() -> new RuntimeException("Turno no encontrado"));

        switch (metodoPago.toUpperCase()) {
            case "EFECTIVO"      -> turno.setTotalEfectivo(turno.getTotalEfectivo() + monto);
            case "SINPE"         -> turno.setTotalSinpe(turno.getTotalSinpe() + monto);
            case "TARJETA"       -> turno.setTotalTarjeta(turno.getTotalTarjeta() + monto);
            case "TRANSFERENCIA" -> turno.setTotalTransferencia(turno.getTotalTransferencia() + monto);
        }
        turno.setNumTransacciones(turno.getNumTransacciones() + 1);
        turnoCajaRepository.save(turno);
    }

    @Transactional(readOnly = true)
    public List<TurnoCaja> getHistorial(Long empresaId) {
        return turnoCajaRepository.findByEmpresaIdOrderByFechaAperturaDesc(empresaId);
    }
}
