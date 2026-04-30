package com.hotclick.service;

import com.hotclick.model.GiroRuleta;
import com.hotclick.model.Premio;
import com.hotclick.model.ResultadoRuleta;
import com.hotclick.model.Usuario;
import com.hotclick.repository.GiroRuletaRepository;
import com.hotclick.repository.PremioRepository;
import com.hotclick.repository.ResultadoRuletaRepository;
import com.hotclick.utils.Constants;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
public class PremioService {

    @Autowired
    private PremioRepository premioRepository;

    @Autowired
    private GiroRuletaRepository giroRuletaRepository;

    @Autowired
    private ResultadoRuletaRepository resultadoRuletaRepository;

    @Transactional
    public GiroRuleta asignarGiro(Usuario usuario, String tipoOrigen) {
        GiroRuleta giro = new GiroRuleta();
        giro.setUsuarioFinal(usuario);
        giro.setTipoOrigen(tipoOrigen);
        giro.setUsado(false);
        giro.setFechaAsignacion(LocalDateTime.now());
        giro.setEstado(Constants.ESTADO_ACTIVO);
        return giroRuletaRepository.save(giro);
    }

    @Transactional
    public ResultadoRuleta girar(Long giroId, Usuario usuario) {
        GiroRuleta giro = giroRuletaRepository.findById(giroId)
            .orElseThrow(() -> new RuntimeException("Giro no encontrado"));

        if (giro.getUsado()) {
            throw new RuntimeException("Este giro ya fue utilizado");
        }

        List<Premio> premios = premioRepository.findByActivoTrueAndEstado(Constants.ESTADO_ACTIVO);
        if (premios.isEmpty()) {
            throw new RuntimeException("No hay premios configurados");
        }

        Premio premioGanado = sortearPremio(premios);

        giro.setUsado(true);
        giro.setFechaUso(LocalDateTime.now());
        giroRuletaRepository.save(giro);

        ResultadoRuleta resultado = new ResultadoRuleta();
        resultado.setGiro(giro);
        resultado.setUsuarioFinal(usuario);
        resultado.setPremio(premioGanado);
        resultado.setFechaGiro(LocalDateTime.now());
        resultado.setCodigoCanje(UUID.randomUUID().toString().substring(0, 10).toUpperCase());
        resultado.setCanjeado(false);
        resultado.setExpiraEn(LocalDateTime.now().plusDays(30));
        resultado.setEstado(Constants.ESTADO_ACTIVO);

        return resultadoRuletaRepository.save(resultado);
    }

    private Premio sortearPremio(List<Premio> premios) {
        double aleatorio = new Random().nextDouble() * 100;
        double acumulado = 0;
        for (Premio premio : premios) {
            acumulado += premio.getProbabilidad().doubleValue();
            if (aleatorio <= acumulado) {
                return premio;
            }
        }
        return premios.get(premios.size() - 1);
    }

    public Long contarGirosPendientes(Long usuarioId) {
        return giroRuletaRepository.countByUsuarioFinalIdAndUsadoFalse(usuarioId);
    }

    public List<ResultadoRuleta> historialGiros(Long usuarioId) {
        return resultadoRuletaRepository.findByUsuarioFinalIdOrderByFechaGiroDesc(usuarioId);
    }
}
