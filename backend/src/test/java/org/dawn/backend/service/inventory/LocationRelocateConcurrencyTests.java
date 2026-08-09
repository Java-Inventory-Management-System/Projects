package org.dawn.backend.service.inventory;

import org.dawn.backend.config.security.SecurityPolicy;
import org.dawn.backend.constant.enums.inventory.ProductUnitStatus;
import org.dawn.backend.controller.inventory.request.RelocateRequest;
import org.dawn.backend.entity.catalog.Product;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.entity.inventory.ProductUnit;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.catalog.ProductRepository;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@SpringBootTest
@ActiveProfiles("test")
class LocationRelocateConcurrencyTests {

    @Autowired LocationService locationService;
    @Autowired LocationRepository locationRepository;
    @Autowired ProductRepository productRepository;
    @Autowired ProductUnitRepository productUnitRepository;

    @MockitoBean SecurityPolicy securityPolicy;

    private Long locationA;
    private Long locationB;
    private Long locationC;

    @BeforeEach
    void setUp() {
        locationA = saveLocation("A", "1", "A1");
        locationB = saveLocation("B", "1", "B1");
        locationC = saveLocation("C", "1", "C1");
        Product product = new Product();
        product.setName("Test Product");
        product.setSku("SKU-CONCURRENCY");
        product.setTrackingType("SERIALIZED");
        product = productRepository.save(product);
        saveUnit(product.getId(), locationA);
        saveUnit(product.getId(), locationA);
        when(securityPolicy.requireAuthenticated()).thenReturn(1L);
    }

    private Long saveLocation(String zone, String shelf, String bin) {
        Location location = new Location();
        location.setZoneCode(zone);
        location.setShelfCode(shelf);
        location.setBinCode(bin);
        location.setFullCode(zone + "-" + shelf + "-" + bin);
        location.setIsActive(true);
        return locationRepository.save(location).getId();
    }

    private void saveUnit(Long productId, Long locationId) {
        ProductUnit unit = new ProductUnit();
        unit.setProductId(productId);
        unit.setTrackingType("SERIALIZED");
        unit.setInitialQuantity(BigDecimal.ONE);
        unit.setRemainingQuantity(BigDecimal.ONE);
        unit.setLocationId(locationId);
        unit.setStatus(ProductUnitStatus.IN_STOCK);
        unit.setImportedAt(Instant.now());
        productUnitRepository.save(unit);
    }

    @Test
    void concurrentRelocatesOfSameStock_onlyOneSucceeds_noDoubleMove() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Long>> futures = new ArrayList<>();
        futures.add(executor.submit(() -> {
            start.await();
            locationService.relocate(new RelocateRequest(locationA, locationB, null));
            return locationB;
        }));
        futures.add(executor.submit(() -> {
            start.await();
            locationService.relocate(new RelocateRequest(locationA, locationC, null));
            return locationC;
        }));
        start.countDown();

        List<Long> succeeded = new ArrayList<>();
        List<Throwable> failed = new ArrayList<>();
        for (Future<Long> f : futures) {
            try {
                succeeded.add(f.get());
            } catch (Exception e) {
                failed.add(e.getCause() != null ? e.getCause() : e);
            }
        }
        executor.shutdownNow();

        assertEquals(1, succeeded.size(), "exactly one relocate must succeed: " + failed);
        assertEquals(1, failed.size());
        assertTrue(failed.get(0) instanceof InvalidRequestException,
                "loser must get a clear business error, got: " + failed.get(0));

        Long winnerDest = succeeded.get(0);
        List<ProductUnit> stillAtSource = productUnitRepository
                .findByLocationIdInAndStatus(List.of(locationA), ProductUnitStatus.IN_STOCK);
        assertTrue(stillAtSource.isEmpty(), "source bin must be empty after the race");
        List<ProductUnit> atWinner = productUnitRepository
                .findByLocationIdInAndStatus(List.of(winnerDest), ProductUnitStatus.IN_STOCK);
        assertEquals(2, atWinner.size(), "no double-move: both units must end at the winning destination");
    }
}
