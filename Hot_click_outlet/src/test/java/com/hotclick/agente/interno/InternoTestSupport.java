package com.hotclick.agente.interno;

import com.hotclick.repository.UsuarioRepository;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Piezas en memoria para las pruebas del modo interno (sin base de datos ni teléfonos reales). */
final class InternoTestSupport {

    private InternoTestSupport() {}

    static final Instant T0 = Instant.parse("2026-12-01T10:00:00Z");

    /** Reloj que se puede adelantar. */
    static final class RelojMutable extends Clock {
        private Instant ahora = T0;
        void avanzar(Duration d) { ahora = ahora.plus(d); }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return ahora; }
    }

    /** Repositorio de vinculaciones en memoria. */
    static final class RepoMemoria {
        final List<AgenteVinculacion> filas = new ArrayList<>();
        final AgenteVinculacionRepository repo = mock(AgenteVinculacionRepository.class);
        private final AtomicLong seq = new AtomicLong(1);
        private final RelojMutable reloj;

        RepoMemoria(RelojMutable reloj) {
            this.reloj = reloj;
            when(repo.save(any())).thenAnswer(i -> {
                AgenteVinculacion v = i.getArgument(0);
                if (v.getId() == null) { v.setId(seq.getAndIncrement()); filas.add(v); }
                return v;
            });
            when(repo.findById(anyLong())).thenAnswer(i -> filas.stream().filter(v -> v.getId().equals(i.getArgument(0))).findFirst());
            when(repo.findByIdParaActualizar(anyLong())).thenAnswer(i -> filas.stream().filter(v -> v.getId().equals(i.getArgument(0))).findFirst());
            when(repo.findByUsuarioIdAndEmpresaIdAndCanal(any(), any(), any())).thenAnswer(i -> filas.stream()
                .filter(v -> v.getUsuarioId().equals(i.getArgument(0)) && v.getEmpresaId().equals(i.getArgument(1))
                    && v.getCanal().equals(i.getArgument(2))).findFirst());
            when(repo.findByEmpresaIdAndCanalAndContactoHashAndEstado(any(), any(), any(), any())).thenAnswer(i -> filas.stream()
                .filter(v -> v.getEmpresaId().equals(i.getArgument(0)) && v.getCanal().equals(i.getArgument(1))
                    && i.getArgument(2).equals(v.getContactoHash()) && v.getEstado().equals(i.getArgument(3))).findFirst());
            when(repo.findPorCodigoParaActualizar(any(), any())).thenAnswer(i -> filas.stream()
                .filter(v -> v.getEmpresaId().equals(i.getArgument(0)) && i.getArgument(1).equals(v.getCodigoHash())).findFirst());
            when(repo.existeCodigoVigente(any(), any(), any())).thenAnswer(i -> filas.stream()
                .anyMatch(v -> v.getEmpresaId().equals(i.getArgument(0)) && i.getArgument(1).equals(v.getCodigoHash())
                    && v.getCodigoExpira() != null && v.getCodigoExpira().isAfter(i.getArgument(2))));
            when(repo.findByEmpresaIdAndEstado(any(), any())).thenAnswer(i -> filas.stream()
                .filter(v -> v.getEmpresaId().equals(i.getArgument(0)) && v.getEstado().equals(i.getArgument(1))).toList());
        }
    }

    /** UsuarioRepository donde la membresía es un conjunto "usuario:empresa". */
    static final class Equipo {
        final Set<String> miembros = new HashSet<>();
        final UsuarioRepository usuarios = mock(UsuarioRepository.class);

        Equipo() {
            when(usuarios.esMiembroActivoDeEmpresa(any(), any()))
                .thenAnswer(i -> miembros.contains(i.getArgument(0) + ":" + i.getArgument(1)));
        }

        Equipo con(long usuario, long empresa) { miembros.add(usuario + ":" + empresa); return this; }
        void sacar(long usuario, long empresa) { miembros.remove(usuario + ":" + empresa); }
    }

    static Optional<AgenteVinculacion> unica(List<AgenteVinculacion> l) { return l.stream().findFirst(); }
}
