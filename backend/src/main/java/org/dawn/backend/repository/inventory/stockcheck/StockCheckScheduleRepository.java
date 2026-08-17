package org.dawn.backend.repository.inventory.stockcheck;

import org.dawn.backend.entity.inventory.StockCheckSchedule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockCheckScheduleRepository extends JpaRepository<StockCheckSchedule, Long> {
    List<StockCheckSchedule> findByIsActiveTrue();

    List<StockCheckSchedule> findByZoneCode(String zoneCode);
}