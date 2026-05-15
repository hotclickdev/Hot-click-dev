package com.hotclick.repository;

import com.hotclick.model.TipoOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface TipoOtpRepository extends JpaRepository<TipoOtp, Integer> {

    Optional<TipoOtp> findByNombre(String nombre);
}
