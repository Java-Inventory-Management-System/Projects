package org.dawn.backend.repository.inventory;

import org.dawn.backend.entity.inventory.Warehouse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {
    boolean existsByName(String name);
    List<Warehouse> findByIsActiveTrue();
}
