package com.hotclick.repository;

import com.hotclick.model.Carrito;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface CarritoRepository extends JpaRepository<Carrito, Long> {

    Optional<Carrito> findByUsuarioFinalIdAndEstadoCarrito(Long usuarioId, String estadoCarrito);
}
